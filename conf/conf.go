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

package conf

import (
	"encoding/json"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"

	"github.com/beego/beego"
)

var (
	siteConfigOverrides = map[string]string{}
	siteConfigMu        sync.RWMutex
)

func SetSiteOverrides(overrides map[string]string) {
	siteConfigMu.Lock()
	defer siteConfigMu.Unlock()
	for k, v := range overrides {
		siteConfigOverrides[k] = v
	}
}

const FrontendBaseDir = "../openagent"

type WebConfig struct {
	AuthConfig struct {
		Issuer           string `json:"issuer"`
		ClientId         string `json:"clientId"`
		AppName          string `json:"appName"`          // populated only when casdoorApplication is set (backward compat)
		OrganizationName string `json:"organizationName"` // populated only when casdoorOrganization is set (backward compat)
	} `json:"authConfig"`
	StaticBaseUrl string `json:"staticBaseUrl"`
	HtmlTitle     string `json:"htmlTitle"`
	FaviconUrl    string `json:"faviconUrl"`
	LogoUrl       string `json:"logoUrl"`
	NavbarHtml    string `json:"navbarHtml"`
	FooterHtml    string `json:"footerHtml"`
	IsDemoMode    bool   `json:"isDemoMode"`
	ThemeDefault  struct {
		ColorPrimary string `json:"colorPrimary"`
	} `json:"themeDefault"`
}

func ReadGlobalConfigTokens() []string {
	dbName := beego.AppConfig.String("dbName")
	if strings.Count(dbName, "_") < 2 {
		return nil
	}

	path := "C:/casibase_data/config.txt"
	if !FileExist(path) {
		return nil
	}

	text := ReadStringFromPath(path)
	tokens := strings.Split(text, "\n")
	return tokens
}

func GetConfigString(key string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}

	siteConfigMu.RLock()
	siteVal, hasSiteVal := siteConfigOverrides[key]
	siteConfigMu.RUnlock()
	if hasSiteVal && siteVal != "" {
		return siteVal
	}

	tokens := ReadGlobalConfigTokens()
	if len(tokens) > 0 {
		if key == "htmlTitle" {
			return tokens[8]
		} else if key == "faviconUrl" {
			return tokens[9]
		} else if key == "logoUrl" {
			return tokens[10]
		} else if key == "footerHtml" {
			return tokens[11]
		}
	}

	res := beego.AppConfig.String(key)
	if res == "" {
		if key == "staticBaseUrl" {
			res = "https://cdn.openagentai.org"
		} else if key == "logConfig" {
			res = "{\"filename\": \"logs/openagent.log\", \"maxdays\":99999, \"perm\":\"0770\"}"
		}
	}

	if key == "staticBaseUrl" {
		if strings.HasSuffix(beego.AppConfig.String("casdoorEndpoint"), ".casdoor.net") && res == "https://cdn.openagentai.org" {
			res = "https://cdn.casibase.com"
		}
	}

	return res
}

// GetDefaultColorPrimary returns the default Ant Design primary color.
func GetDefaultColorPrimary() string {
	return GetConfigString("defaultColorPrimary")
}

func GetConfigBool(key string) bool {
	value := GetConfigString(key)
	if value == "true" {
		return true
	} else {
		return false
	}
}

func GetConfigInt(key string) int {
	value := GetConfigString(key)
	num, err := strconv.Atoi(value)
	if err != nil {
		return 0
	}
	return num
}

func GetConfigDataSourceName() string {
	dataSourceName := GetConfigString("dataSourceName")

	runningInDocker := os.Getenv("RUNNING_IN_DOCKER")
	if runningInDocker == "true" {
		if dbHost := os.Getenv("DOCKER_DB_HOST"); dbHost != "" {
			dataSourceName = strings.ReplaceAll(dataSourceName, "localhost", dbHost)
		} else if runtime.GOOS == "linux" {
			// https://stackoverflow.com/questions/48546124/what-is-linux-equivalent-of-host-docker-internal
			dataSourceName = strings.ReplaceAll(dataSourceName, "localhost", "172.17.0.1")
		} else {
			dataSourceName = strings.ReplaceAll(dataSourceName, "localhost", "host.docker.internal")
		}
	}

	return dataSourceName
}

func GetLanguage(language string) string {
	if language == "" || language == "*" {
		return "en"
	}

	if len(language) != 2 || language == "nu" {
		return "en"
	} else {
		return language
	}
}

func IsDemoMode() bool {
	return strings.ToLower(GetConfigString("isDemoMode")) == "true"
}

func GetConfigBatchSize() int {
	res, err := strconv.Atoi(GetConfigString("batchSize"))
	if err != nil {
		res = 100
	}
	return res
}

func GetStringArray(key string) []string {
	strValue := GetConfigString(key)
	if strValue == "" {
		return []string{}
	}

	var strArray []string
	if err := json.Unmarshal([]byte(strValue), &strArray); err == nil {
		return strArray
	}

	return strings.Split(strValue, ",")
}

func GetWebConfig() *WebConfig {
	config := &WebConfig{}

	issuer := GetConfigString("issuer")
	if issuer == "" {
		issuer = GetConfigString("casdoorEndpoint") // backward compat
	}
	config.AuthConfig.Issuer = issuer
	config.AuthConfig.ClientId = GetConfigString("clientId")
	config.AuthConfig.AppName = GetConfigString("casdoorApplication")           // casdoor backward compat
	config.AuthConfig.OrganizationName = GetConfigString("casdoorOrganization") // casdoor backward compat

	config.StaticBaseUrl = GetConfigString("staticBaseUrl")
	config.HtmlTitle = GetConfigString("htmlTitle")
	config.FaviconUrl = GetConfigString("faviconUrl")
	config.LogoUrl = GetConfigString("logoUrl")
	config.NavbarHtml = GetConfigString("navbarHtml")
	config.FooterHtml = GetConfigString("footerHtml")
	config.IsDemoMode = GetConfigBool("isDemoMode")

	config.ThemeDefault.ColorPrimary = GetDefaultColorPrimary()

	return config
}
