// Copyright 2023 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package object

import (
	"database/sql"
	"flag"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/beego/beego"
	_ "github.com/denisenkom/go-mssqldb" // mssql
	_ "github.com/go-sql-driver/mysql"   // mysql
	_ "github.com/lib/pq"                // postgres
	"github.com/the-open-agent/openagent/conf"
	moderncsqlite "modernc.org/sqlite"
	"xorm.io/xorm"
)

func init() {
	// modernc.org/sqlite registers as "sqlite"; xorm looks up the "sqlite3" dialect name.
	// Re-register the same pure-Go driver under "sqlite3" so xorm can pair its dialect with the driver.
	sql.Register("sqlite3", &moderncsqlite.Driver{})
}

const defaultMySQLDataSourceName = "root:123456@tcp(localhost:3306)/"

// isUniqueConstraintError reports whether err is a unique-constraint violation
// from any supported database (MySQL: "Duplicate entry", SQLite: "UNIQUE constraint failed").
func isUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "Duplicate entry") || strings.Contains(msg, "UNIQUE constraint failed")
}

// maskDSN strips credentials from a DSN, keeping only the host/path portion.
// "user:pass@tcp(host:port)/db" → "tcp(host:port)/db"
func maskDSN(dsn string) string {
	if at := strings.LastIndex(dsn, "@"); at >= 0 {
		return dsn[at+1:]
	}
	return dsn
}

// sqliteDBPath returns the path for the SQLite database file, always placed
// next to the executable so the location is predictable regardless of CWD.
func sqliteDBPath() string {
	exe, err := os.Executable()
	if err != nil {
		return "openagent.db"
	}
	return filepath.Join(filepath.Dir(exe), "openagent.db")
}

// resolveDatabase returns the effective driver and DSN to use.
// When the config still holds the default unmodified MySQL values and nothing
// is listening on port 3306, it transparently falls back to SQLite so that
// the binary works out-of-the-box without a MySQL installation.
func resolveDatabase(driverName, dataSourceName string) (string, string) {
	dbName := conf.GetConfigString("dbName")

	if driverName != "mysql" || dataSourceName != defaultMySQLDataSourceName {
		fmt.Printf("OpenAgent: connecting to database [driver=%s, dsn=%s, db=%s]\n", driverName, maskDSN(dataSourceName), dbName)
		return driverName, dataSourceName
	}

	conn, err := net.DialTimeout("tcp", "localhost:3306", 2*time.Second)
	if err != nil {
		dsn := sqliteDBPath()
		fmt.Printf("OpenAgent: connecting to database [driver=sqlite3, dsn=%s]\n", dsn)
		return "sqlite3", dsn
	}
	conn.Close()
	fmt.Printf("OpenAgent: connecting to database [driver=%s, dsn=%s, db=%s]\n", driverName, maskDSN(dataSourceName), dbName)
	return driverName, dataSourceName
}

var (
	adapter                 *Adapter = nil
	providerAdapter         *Adapter = nil
	isCreateDatabaseDefined          = false
	createDatabase                   = true
)

func InitFlag() {
	if !isCreateDatabaseDefined {
		isCreateDatabaseDefined = true
		createDatabase = getCreateDatabaseFlag()
	}
}

func getCreateDatabaseFlag() bool {
	res := flag.Bool("createDatabase", false, "true if you need to create database")
	flag.Parse()
	return *res
}

func InitConfig() {
	err := beego.LoadAppConfig("ini", "../conf/app.conf")
	if err != nil {
		panic(err)
	}

	InitAdapter()
	CreateTables()
}

func InitAdapter() {
	driverName, dataSourceName := resolveDatabase(conf.GetConfigString("driverName"), conf.GetConfigDataSourceName())

	adapter = NewAdapter(driverName, dataSourceName)

	providerDbName := conf.GetConfigString("providerDbName")

	if adapter.DbName == providerDbName {
		providerDbName = ""
	}

	if providerDbName != "" {
		providerAdapter = NewAdapterWithDbName(driverName, dataSourceName, providerDbName)
	}
}

func CreateTables() {
	if createDatabase {
		err := adapter.CreateDatabase()
		if err != nil {
			panic(err)
		}
	}

	adapter.createTable()
}

// Adapter represents the MySQL adapter for policy storage.
type Adapter struct {
	driverName     string
	dataSourceName string
	DbName         string
	engine         *xorm.Engine
}

// finalizer is the destructor for Adapter.
func finalizer(a *Adapter) {
	err := a.engine.Close()
	if err != nil {
		panic(err)
	}
}

// NewAdapter is the constructor for Adapter.
func NewAdapter(driverName string, dataSourceName string) *Adapter {
	a := &Adapter{}
	a.driverName = driverName
	a.dataSourceName = dataSourceName
	a.DbName = conf.GetConfigString("dbName")

	// Open the DB, create it if not existed.
	a.open()

	// Call the destructor when the object is released.
	runtime.SetFinalizer(a, finalizer)

	return a
}

func NewAdapterWithDbName(driverName string, dataSourceName string, dbName string) *Adapter {
	a := &Adapter{}
	a.driverName = driverName
	a.dataSourceName = dataSourceName
	a.DbName = dbName

	// Open the DB, create it if not existed.
	a.open()

	// Call the destructor when the object is released.
	runtime.SetFinalizer(a, finalizer)

	return a
}

func (a *Adapter) CreateDatabase() error {
	engine, err := xorm.NewEngine(a.driverName, a.dataSourceName)
	if err != nil {
		return err
	}
	defer engine.Close()

	var stmt string
	switch a.driverName {
	case "sqlite3", "sqlite":
		// SQLite creates the database file automatically on open; no DDL needed.
		return nil
	case "postgres":
		stmt = fmt.Sprintf(`
			DO $$
			BEGIN
				IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '%s') THEN
					CREATE DATABASE %s WITH ENCODING='UTF8' LC_COLLATE='en_US.utf8' LC_CTYPE='en_US.utf8' TEMPLATE=template0;
				END IF;
			END
			$$`,
			a.DbName, a.DbName)
	default:
		stmt = fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s default charset utf8mb4 COLLATE utf8mb4_general_ci", a.DbName)
	}
	_, err = engine.Exec(stmt)
	if err != nil {
		return err
	}

	return nil
}

func (a *Adapter) open() {
	dataSourceName := a.dataSourceName + a.DbName
	if a.driverName == "mysql" {
		// MySQL DSN ends with "/" and the database name is appended separately.
	} else {
		// For SQLite, Postgres, MSSQL, etc. the full DSN is stored in dataSourceName.
		dataSourceName = a.dataSourceName
	}

	engine, err := xorm.NewEngine(a.driverName, dataSourceName)
	if err != nil {
		panic(err)
	}

	a.engine = engine
}

func (a *Adapter) close() {
	a.engine.Close()
	a.engine = nil
}

func (a *Adapter) createTable() {
	err := a.engine.Sync2(new(Video))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Store))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Provider))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(File))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Vector))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Chat))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Message))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Template))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Application))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Node))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Machine))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Image))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Container))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Pod))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Task))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Scale))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Form))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Workflow))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Article))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Session))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(User))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Connection))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Record))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Graph))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Asset))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Scan))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Resource))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Site))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Skill))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Tool))
	if err != nil {
		panic(err)
	}

	err = a.engine.Sync2(new(Server))
	if err != nil {
		panic(err)
	}
}
