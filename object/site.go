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
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/util"
	"xorm.io/core"
)

type Site struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`
	DisplayName string `xorm:"varchar(100)" json:"displayName"`

	ThemeColor    string   `xorm:"varchar(100)" json:"themeColor"`
	HtmlTitle     string   `xorm:"varchar(100)" json:"htmlTitle"`
	FaviconUrl    string   `xorm:"varchar(200)" json:"faviconUrl"`
	LogoUrl       string   `xorm:"varchar(200)" json:"logoUrl"`
	NavbarHtml    string   `xorm:"mediumtext" json:"navbarHtml"`
	FooterHtml    string   `xorm:"mediumtext" json:"footerHtml"`
	StaticBaseUrl string   `xorm:"varchar(500)" json:"staticBaseUrl"`
	NavItems      []string `xorm:"text" json:"navItems"`
	Endpoint      string   `xorm:"varchar(500)" json:"endpoint"`

	CheckUserBalance bool `xorm:"bool" json:"checkUserBalance"`

	Issuer              string `xorm:"varchar(500)" json:"issuer"`
	ClientId            string `xorm:"varchar(100)" json:"clientId"`
	ClientSecret        string `xorm:"varchar(100)" json:"clientSecret"`
	CasdoorEndpoint     string `xorm:"varchar(500)" json:"casdoorEndpoint"`     // backward compat, prefer Issuer
	CasdoorOrganization string `xorm:"varchar(100)" json:"casdoorOrganization"` // casdoor backward compat
	CasdoorApplication  string `xorm:"varchar(100)" json:"casdoorApplication"`  // casdoor backward compat
	IpParsingMode       string `xorm:"varchar(100)" json:"ipParsingMode"`
	ParentDbName        string `xorm:"varchar(100)" json:"parentDbName"`
	HubDbNames          string `xorm:"varchar(1000)" json:"hubDbNames"`
	Socks5Proxy         string `xorm:"varchar(200)" json:"socks5Proxy"`
	LogConfig           string `xorm:"varchar(1000)" json:"logConfig"`
}

func SyncSiteToConf(site *Site) {
	conf.SetSiteOverrides(map[string]string{
		"staticBaseUrl":       site.StaticBaseUrl,
		"htmlTitle":           site.HtmlTitle,
		"faviconUrl":          site.FaviconUrl,
		"logoUrl":             site.LogoUrl,
		"navbarHtml":          site.NavbarHtml,
		"footerHtml":          site.FooterHtml,
		"issuer":              site.Issuer,
		"clientId":            site.ClientId,
		"clientSecret":        site.ClientSecret,
		"casdoorEndpoint":     site.CasdoorEndpoint,     // backward compat
		"casdoorOrganization": site.CasdoorOrganization, // casdoor backward compat
		"casdoorApplication":  site.CasdoorApplication,  // casdoor backward compat
		"ipParsingMode":       site.IpParsingMode,
		"parentDbName":        site.ParentDbName,
		"socks5Proxy":         site.Socks5Proxy,
		"logConfig":           site.LogConfig,
	})
}

func GetGlobalSites() ([]*Site, error) {
	sites := []*Site{}
	err := adapter.engine.Asc("owner").Desc("created_time").Find(&sites)
	if err != nil {
		return nil, err
	}
	return sites, nil
}

func GetSites(owner string) ([]*Site, error) {
	sites := []*Site{}
	err := adapter.engine.Desc("created_time").Where("owner = ?", owner).Find(&sites)
	if err != nil {
		return nil, err
	}
	return sites, nil
}

func GetSite(id string) (*Site, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	site := &Site{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(site)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return site, nil
}

func GetBuiltInSite() (*Site, error) {
	site, err := GetSite("admin/site-built-in")
	if site != nil {
		site.ClientSecret = ""
	}
	return site, err
}

func GetBuiltInSiteWithSecret() (*Site, error) {
	return GetSite("admin/site-built-in")
}

func UpdateSite(id string, site *Site) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	if s, err := GetSite(id); err != nil {
		return false, err
	} else if s == nil {
		return false, nil
	}
	affected, err2 := adapter.engine.ID(core.PK{owner, name}).AllCols().Update(site)
	if err2 != nil {
		return false, err2
	}
	// Keep the auto-fill flag in sync: if the admin clears or sets a non-public
	// endpoint, re-enable monitoring so the next public request can fill it in.
	if site.Name == "site-built-in" {
		siteEndpointNeedsAutoFill = !isPublicEndpoint(site.Endpoint)
	}
	return affected != 0, nil
}

func AddSite(site *Site) (bool, error) {
	affected, err := adapter.engine.Insert(site)
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func DeleteSite(site *Site) (bool, error) {
	affected, err := adapter.engine.ID(core.PK{site.Owner, site.Name}).Delete(&Site{})
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}
