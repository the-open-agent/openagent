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

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/beego/beego"
	"github.com/beego/beego/logs"
	_ "github.com/beego/beego/session/redis"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/internal/cli"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/proxy"
	"github.com/the-open-agent/openagent/routers"
	"github.com/the-open-agent/openagent/util"
)

func main() {
	handled, code, openBrowser := cli.EarlyDispatch()
	if handled {
		os.Exit(code)
	}

	object.InitFlag()
	object.InitAdapter()
	object.CreateTables()

	object.InitDb()
	proxy.InitHttpClient()
	err := util.EnsureRuntimeDataFiles()
	if err != nil {
		panic(err)
	}
	util.InitMaxmindFiles()
	util.InitIpDb()
	util.InitParser()
	object.InitCleanupChats()
	object.InitStoreCount()
	object.InitCommitRecordsTask()
	object.InitScanJobProcessor()
	object.InitMessageTransactionRetry()

	beego.SetStaticPath("/swagger", "swagger")
	beego.InsertFilter("*", beego.BeforeRouter, routers.CorsFilter)
	beego.InsertFilter("*", beego.BeforeRouter, routers.HstsFilter)
	beego.InsertFilter("*", beego.BeforeRouter, routers.CacheControlFilter)
	beego.InsertFilter("*", beego.BeforeRouter, routers.AutoSigninFilter)
	beego.InsertFilter("*", beego.BeforeRouter, routers.StaticFilter)
	beego.InsertFilter("*", beego.BeforeRouter, routers.AuthzFilter)
	beego.InsertFilter("*", beego.BeforeRouter, routers.PrometheusFilter)
	beego.InsertFilter("*", beego.BeforeRouter, routers.RecordMessage)
	beego.InsertFilter("*", beego.AfterExec, routers.AfterRecordMessage, false)
	beego.InsertFilter("*", beego.AfterExec, routers.SecureCookieFilter, false)

	beego.BConfig.WebConfig.Session.SessionOn = true
	beego.BConfig.WebConfig.Session.SessionName = "openagent_session_id"
	if conf.GetConfigString("redisEndpoint") == "" {
		beego.BConfig.WebConfig.Session.SessionProvider = "file"
		beego.BConfig.WebConfig.Session.SessionProviderConfig = "./tmp"
	} else {
		beego.BConfig.WebConfig.Session.SessionProvider = "redis"
		beego.BConfig.WebConfig.Session.SessionProviderConfig = conf.GetConfigString("redisEndpoint")
	}
	beego.BConfig.WebConfig.Session.SessionGCMaxLifetime = 3600 * 24 * 365

	// Set session cookie security attributes
	// SameSite=Lax provides CSRF protection while maintaining compatibility
	beego.BConfig.WebConfig.Session.SessionCookieSameSite = http.SameSiteLaxMode

	var logAdapter string
	logConfigMap := make(map[string]interface{})
	err = json.Unmarshal([]byte(conf.GetConfigString("logConfig")), &logConfigMap)
	if err != nil {
		panic(err)
	}
	_, ok := logConfigMap["adapter"]
	if !ok {
		logAdapter = "file"
	} else {
		logAdapter = logConfigMap["adapter"].(string)
	}
	if logAdapter == "console" {
		logs.Reset()
	}
	err = logs.SetLogger(logAdapter, conf.GetConfigString("logConfig"))
	if err != nil {
		panic(err)
	}

	port := beego.AppConfig.DefaultInt("httpport", 14000)

	err = util.StopOldInstance(port)
	if err != nil {
		panic(err)
	}

	go object.ClearThroughputPerSecond()

	if openBrowser {
		go util.OpenBrowser(fmt.Sprintf("http://127.0.0.1:%v/", port))
	}

	beego.Run(fmt.Sprintf(":%v", port))
}
