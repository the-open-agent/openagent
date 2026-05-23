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
	"fmt"
	"strings"
)

// GetPublishedStoresFromAllDbs returns published stores from the local DB plus
// any additional databases listed in site-built-in's HubDbNames field.
// Stores from external DBs carry HubDbName set to their source database name.
func GetPublishedStoresFromAllDbs() ([]*Store, error) {
	stores, err := GetPublishedStores()
	if err != nil {
		return nil, err
	}

	site, err := GetBuiltInSiteWithSecret()
	if err != nil || site == nil || strings.TrimSpace(site.HubDbNames) == "" {
		return stores, nil
	}

	for _, dbName := range strings.Split(site.HubDbNames, ",") {
		dbName = strings.TrimSpace(dbName)
		if dbName == "" || dbName == adapter.DbName {
			continue
		}

		extraAdapter := NewAdapterWithDbName(adapter.driverName, adapter.dataSourceName, dbName)

		// Fetch site-built-in from this DB to obtain its public Endpoint.
		extraSite := &Site{Owner: "admin", Name: "site-built-in"}
		_, siteErr := extraAdapter.engine.Get(extraSite)
		if siteErr != nil {
			extraAdapter.close()
			return nil, fmt.Errorf("failed to get site-built-in from hub DB [%s]: %w", dbName, siteErr)
		}
		endpoint := strings.TrimRight(extraSite.Endpoint, "/")

		extraStores := []*Store{}
		queryErr := extraAdapter.engine.Desc("created_time").Where("publish_state = ?", "Published").Find(&extraStores)
		extraAdapter.close()
		if queryErr != nil {
			return nil, fmt.Errorf("failed to get published stores from hub DB [%s]: %w", dbName, queryErr)
		}
		for _, s := range extraStores {
			s.HubDbName = dbName
			s.Endpoint = endpoint
		}
		stores = append(stores, extraStores...)
	}

	return stores, nil
}
