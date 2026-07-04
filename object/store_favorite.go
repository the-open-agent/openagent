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
	"github.com/the-open-agent/openagent/util"
)

const (
	FavoriteTypeStar  = "star"
	FavoriteTypeWatch = "watch"
)

// StoreFavorite records that a user has starred or watched a store (agent).
// One row per (user, type, target store). Star and Watch share this table,
// distinguished by Type.
type StoreFavorite struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`

	Type       string `xorm:"varchar(20) index(idx_favorite)" json:"type"`
	StoreOwner string `xorm:"varchar(100) index(idx_favorite)" json:"storeOwner"`
	StoreName  string `xorm:"varchar(100) index(idx_favorite)" json:"storeName"`
}

func IsValidFavoriteType(favoriteType string) bool {
	return favoriteType == FavoriteTypeStar || favoriteType == FavoriteTypeWatch
}

func getStoreFavorite(user, favoriteType, storeOwner, storeName string) (*StoreFavorite, error) {
	favorite := StoreFavorite{Owner: user, Type: favoriteType, StoreOwner: storeOwner, StoreName: storeName}
	existed, err := adapter.engine.Get(&favorite)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return &favorite, nil
}

func IsStoreFavorited(user, favoriteType, storeOwner, storeName string) (bool, error) {
	if user == "" {
		return false, nil
	}
	favorite, err := getStoreFavorite(user, favoriteType, storeOwner, storeName)
	if err != nil {
		return false, err
	}
	return favorite != nil, nil
}

func GetStoreFavoriteCount(favoriteType, storeOwner, storeName string) (int64, error) {
	return adapter.engine.Where("type = ? and store_owner = ? and store_name = ?", favoriteType, storeOwner, storeName).Count(&StoreFavorite{})
}

// ToggleStoreFavorite adds the favorite if absent, removes it if present, and
// returns whether the store is favorited after the operation.
func ToggleStoreFavorite(user, favoriteType, storeOwner, storeName string) (bool, error) {
	existing, err := getStoreFavorite(user, favoriteType, storeOwner, storeName)
	if err != nil {
		return false, err
	}

	if existing != nil {
		_, err = adapter.engine.Where("owner = ? and type = ? and store_owner = ? and store_name = ?", user, favoriteType, storeOwner, storeName).Delete(&StoreFavorite{})
		if err != nil {
			return false, err
		}
		return false, nil
	}

	favorite := &StoreFavorite{
		Owner:       user,
		Name:        util.GetRandomString(24),
		CreatedTime: util.GetCurrentTimeWithMilli(),
		Type:        favoriteType,
		StoreOwner:  storeOwner,
		StoreName:   storeName,
	}
	_, err = adapter.engine.Insert(favorite)
	if err != nil {
		return false, err
	}
	return true, nil
}

// GetFavoredStores returns the stores the user has starred or watched, most
// recent first. Missing (deleted) target stores are skipped.
func GetFavoredStores(user, favoriteType string) ([]*Store, error) {
	favorites := []*StoreFavorite{}
	err := adapter.engine.Where("owner = ? and type = ?", user, favoriteType).Desc("created_time").Find(&favorites)
	if err != nil {
		return nil, err
	}

	stores := []*Store{}
	for _, favorite := range favorites {
		store, err := getStore(favorite.StoreOwner, favorite.StoreName)
		if err != nil {
			return nil, err
		}
		if store != nil {
			stores = append(stores, store)
		}
	}
	return stores, nil
}

// FillStoreFavoriteCounts populates StarCount / WatchCount / ForkCount on the
// given stores using grouped queries (star/watch from store_favorite, fork from
// the store table's forked_from columns) — avoids N+1 for hub/list rendering.
func FillStoreFavoriteCounts(stores []*Store) error {
	if len(stores) == 0 {
		return nil
	}

	type favoriteCountRow struct {
		Type       string
		StoreOwner string
		StoreName  string
		Count      int
	}
	favoriteRows := []favoriteCountRow{}
	err := adapter.engine.Table(new(StoreFavorite)).
		Select("type, store_owner, store_name, count(*) as count").
		GroupBy("type, store_owner, store_name").
		Find(&favoriteRows)
	if err != nil {
		return err
	}

	starMap := map[string]int{}
	watchMap := map[string]int{}
	for _, row := range favoriteRows {
		key := row.StoreOwner + "/" + row.StoreName
		if row.Type == FavoriteTypeStar {
			starMap[key] = row.Count
		} else if row.Type == FavoriteTypeWatch {
			watchMap[key] = row.Count
		}
	}

	type forkCountRow struct {
		ForkedFromOwner string
		ForkedFromName  string
		Count           int
	}
	forkRows := []forkCountRow{}
	err = adapter.engine.Table(new(Store)).
		Select("forked_from_owner, forked_from_name, count(*) as count").
		Where("forked_from_owner <> ? and forked_from_name <> ?", "", "").
		GroupBy("forked_from_owner, forked_from_name").
		Find(&forkRows)
	if err != nil {
		return err
	}

	forkMap := map[string]int{}
	for _, row := range forkRows {
		forkMap[row.ForkedFromOwner+"/"+row.ForkedFromName] = row.Count
	}

	for _, store := range stores {
		key := store.Owner + "/" + store.Name
		store.StarCount = starMap[key]
		store.WatchCount = watchMap[key]
		store.ForkCount = forkMap[key]
	}
	return nil
}

// GetStoreForkCount returns how many stores were forked from the given store.
func GetStoreForkCount(owner, name string) (int64, error) {
	return adapter.engine.Where("forked_from_owner = ? and forked_from_name = ?", owner, name).Count(&Store{})
}
