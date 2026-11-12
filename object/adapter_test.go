// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
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
	"net"
	"path/filepath"
	"strings"
	"testing"
)

// closedLocalAddress returns a loopback address that is guaranteed to refuse
// connections: a listener is opened, its port is recorded, and it is closed.
func closedLocalAddress(t *testing.T) string {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	address := listener.Addr().String()
	if err := listener.Close(); err != nil {
		t.Fatalf("close listener: %v", err)
	}
	return address
}

// TestResolveDatabaseFailsClosedWhenDefaultMySQLIsUnreachable covers the
// fail-open path: the shipped default MySQL DSN must not be replaced with a
// brand-new SQLite database when MySQL is down, because that database is
// seeded with the default admin account.
func TestResolveDatabaseFailsClosedWhenDefaultMySQLIsUnreachable(t *testing.T) {
	oldProbeAddress, oldIsEmbeddedConf := mysqlProbeAddress, isEmbeddedConf
	t.Cleanup(func() {
		mysqlProbeAddress, isEmbeddedConf = oldProbeAddress, oldIsEmbeddedConf
	})

	mysqlProbeAddress = closedLocalAddress(t)
	isEmbeddedConf = func() bool { return false }

	driverName, dataSourceName, err := resolveDatabase("mysql", defaultMySQLDataSourceName)
	if err == nil {
		t.Fatalf("resolveDatabase() = (%q, %q, nil), want an error instead of a silent SQLite fallback", driverName, dataSourceName)
	}
	if driverName != "" || dataSourceName != "" {
		t.Fatalf("resolveDatabase() = (%q, %q), want no driver or DSN when the configured MySQL is unreachable", driverName, dataSourceName)
	}
	if !strings.Contains(strings.ToLower(err.Error()), "refusing to fall back") {
		t.Fatalf("resolveDatabase() error = %q, want it to state that the SQLite fallback is refused", err)
	}
}

// TestResolveDatabaseKeepsExplicitSQLite checks that an explicitly configured
// SQLite database is still used on the first run and is not affected by the
// MySQL reachability check.
func TestResolveDatabaseKeepsExplicitSQLite(t *testing.T) {
	dataSourceName := filepath.Join(t.TempDir(), "explicit.db")

	driverName, gotDataSourceName, err := resolveDatabase("sqlite3", dataSourceName)
	if err != nil {
		t.Fatalf("resolveDatabase() error = %v, want nil for an explicitly configured SQLite database", err)
	}
	if driverName != "sqlite3" || gotDataSourceName != dataSourceName {
		t.Fatalf("resolveDatabase() = (%q, %q), want the configured (%q, %q)", driverName, gotDataSourceName, "sqlite3", dataSourceName)
	}
}

// TestResolveDatabaseKeepsCustomMySQLDSN checks that a non-default MySQL DSN is
// passed through unchanged.
func TestResolveDatabaseKeepsCustomMySQLDSN(t *testing.T) {
	const dataSourceName = "root:custom@tcp(127.0.0.1:3307)/"

	driverName, gotDataSourceName, err := resolveDatabase("mysql", dataSourceName)
	if err != nil {
		t.Fatalf("resolveDatabase() error = %v, want nil for a custom MySQL DSN", err)
	}
	if driverName != "mysql" || gotDataSourceName != dataSourceName {
		t.Fatalf("resolveDatabase() = (%q, %q), want the configured (%q, %q)", driverName, gotDataSourceName, "mysql", dataSourceName)
	}
}

// TestResolveDatabaseKeepsSQLiteForEmbeddedConf checks the single-binary mode:
// the embedded conf is an explicit signal, so it keeps using SQLite.
func TestResolveDatabaseKeepsSQLiteForEmbeddedConf(t *testing.T) {
	oldIsEmbeddedConf := isEmbeddedConf
	t.Cleanup(func() {
		isEmbeddedConf = oldIsEmbeddedConf
	})

	isEmbeddedConf = func() bool { return true }

	driverName, dataSourceName, err := resolveDatabase("mysql", defaultMySQLDataSourceName)
	if err != nil {
		t.Fatalf("resolveDatabase() error = %v, want nil for the embedded conf", err)
	}
	if driverName != "sqlite3" || dataSourceName != sqliteDBPath() {
		t.Fatalf("resolveDatabase() = (%q, %q), want (%q, %q) for the embedded conf", driverName, dataSourceName, "sqlite3", sqliteDBPath())
	}
}
