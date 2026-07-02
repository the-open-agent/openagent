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

// StoreVisit records one page-view of a store's Insights-tab surface.
// The frontend POSTs one row per (owner, store, path) impression with a 3s
// dedupe key so React StrictMode double-mounts and rapid tab-swaps don't
// inflate the counter. Unlike Chat.Owner (which is hardcoded to "admin"),
// StoreOwner/StoreName here are the store's real coordinates so the Traffic
// aggregation can safely filter by them.
type StoreVisit struct {
	Id int `xorm:"int notnull pk autoincr" json:"id"`

	CreatedTime string `xorm:"varchar(100) index" json:"createdTime"`

	StoreOwner string `xorm:"varchar(100) index(idx_store_visit_store)" json:"storeOwner"`
	StoreName  string `xorm:"varchar(100) index(idx_store_visit_store)" json:"storeName"`

	Visitor   string `xorm:"varchar(200) index" json:"visitor"`
	IsGuest   bool   `json:"isGuest"`
	ClientIp  string `xorm:"varchar(100)" json:"clientIp"`
	UserAgent string `xorm:"varchar(500)" json:"userAgent"`
	Referrer  string `xorm:"varchar(500)" json:"referrer"`
	Language  string `xorm:"varchar(100)" json:"language"`
	Path      string `xorm:"varchar(200)" json:"path"`
	SessionId string `xorm:"varchar(100)" json:"sessionId"`
}

func AddStoreVisit(visit *StoreVisit) (bool, error) {
	affected, err := adapter.engine.Insert(visit)
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}
