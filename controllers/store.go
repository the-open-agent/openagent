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

package controllers

import (
	"encoding/json"
	"fmt"
	"sort"

	"github.com/beego/beego/utils/pagination"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

// GetGlobalStores
// @Title GetGlobalStores
// @Tag Store API
// @Description get global stores
// @Success 200 {array} object.Store The Response object
// @router /get-global-stores [get]
func (c *ApiController) GetGlobalStores() {
	name := c.Input().Get("name")
	limit := c.Input().Get("pageSize")
	page := c.Input().Get("p")
	field := c.Input().Get("field")
	value := c.Input().Get("value")
	sortField := c.Input().Get("sortField")
	sortOrder := c.Input().Get("sortOrder")

	if limit == "" || page == "" {
		stores, err := object.GetGlobalStores()
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		c.ResponseOk(stores)
	} else {
		if !c.RequireAdmin() {
			return
		}

		username := c.GetSessionUsername()
		limit := util.ParseInt(limit)

		var count int64
		var stores []*object.Store
		var err error

		if c.IsGlobalAdmin() {
			count, err = object.GetStoreCount(name, field, value)
			if err != nil {
				c.ResponseError(err.Error())
				return
			}
			paginator := pagination.SetPaginator(c.Ctx, limit, count)
			stores, err = object.GetPaginationStores(paginator.Offset(), limit, name, field, value, sortField, sortOrder)
		} else {
			// Store admin: only their own stores
			count, err = object.GetStoreCountByOwner(username, field, value)
			if err != nil {
				c.ResponseError(err.Error())
				return
			}
			paginator := pagination.SetPaginator(c.Ctx, limit, count)
			stores, err = object.GetPaginationStoresByOwner(username, paginator.Offset(), limit, field, value, sortField, sortOrder)
		}
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		sort.SliceStable(stores, func(i, j int) bool {
			return stores[i].IsDefault && !stores[j].IsDefault
		})

		err = object.PopulateStoreCounts(stores)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		c.ResponseOk(stores, count)
	}
}

// GetStores
// @Title GetStores
// @Tag Store API
// @Description get stores
// @Param owner query string true "The owner of the store"
// @Success 200 {array} object.Store The Response object
// @router /get-stores [get]
func (c *ApiController) GetStores() {
	var stores []*object.Store
	var err error

	if c.IsGlobalAdmin() {
		stores, err = object.GetGlobalStores()
	} else {
		username := c.GetSessionUsername()
		stores, err = object.GetStores(username)
	}
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(stores)
}

// GetStore
// @Title GetStore
// @Tag Store API
// @Description get store
// @Param id query string true "The id (owner/name) of the store"
// @Success 200 {object} object.Store The Response object
// @router /get-store [get]
func (c *ApiController) GetStore() {
	id := c.Input().Get("id")

	var store *object.Store
	var err error
	if id == "admin/_default_store_" {
		store, err = object.GetDefaultStore(c.defaultStoreOwner())
	} else {
		store, err = object.GetStoreForGetApi(id)
	}
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if store != nil {
		host := c.Ctx.Request.Host
		origin := getOriginFromHost(host)
		err = store.Populate(origin, c.GetAcceptLanguage())
		if err != nil {
			c.ResponseOk(store, err.Error())
			return
		}
	}

	c.ResponseOk(store)
}

// UpdateStore
// @Title UpdateStore
// @Tag Store API
// @Description update store
// @Param id   query string       true "The id (owner/name) of the store"
// @Param body body  object.Store true "The details of the store"
// @Success 200 {object} controllers.Response The Response object
// @router /update-store [post]
func (c *ApiController) UpdateStore() {
	id := c.Input().Get("id")

	var store object.Store
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	oldStore, err := object.GetStore(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if oldStore == nil {
		oldStore, err = object.GetStoreForGetApi(id)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
	}
	if oldStore == nil {
		c.ResponseError(fmt.Sprintf("store: %s not found", id))
		return
	}

	store.SharedBy = oldStore.SharedBy

	// Store admin cannot change the Owner field
	if !c.IsGlobalAdmin() && c.IsStoreAdmin() {
		store.Owner = oldStore.Owner
	}

	if oldStore.IsDefault && !store.IsDefault {
		c.ResponseError(c.T("store:given that there must be one default store in OpenAgent, you cannot set this store to non-default. You can directly set another store as default"))
		return
	}

	success, err := object.UpdateStore(id, &store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if !oldStore.IsDefault && store.IsDefault {
		stores, err := object.GetStores(store.Owner)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		for _, store2 := range stores {
			if store2.Owner == store.Owner && store2.GetId() != store.GetId() && store2.IsDefault {
				store2.IsDefault = false
				success, err = object.UpdateStore(store2.GetId(), store2)
				if err != nil {
					c.ResponseError(err.Error())
					return
				}
			}
		}
	}

	c.ResponseOk(success)
}

// AddStore
// @Title AddStore
// @Tag Store API
// @Description add store
// @Param body body object.Store true "The details of the store"
// @Success 200 {object} controllers.Response The Response object
// @router /add-store [post]
func (c *ApiController) AddStore() {
	var store object.Store
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	err = object.SyncDefaultProvidersToStore(&store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if store.ModelProvider == "" {
		var modelProvider *object.Provider
		modelProvider, err = object.GetDefaultModelProvider()
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		if modelProvider != nil {
			store.ModelProvider = modelProvider.Name
		}
	}

	if store.EmbeddingProvider == "" {
		var embeddingProvider *object.Provider
		embeddingProvider, err = object.GetDefaultEmbeddingProvider()
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		if embeddingProvider != nil {
			store.EmbeddingProvider = embeddingProvider.Name
		}
	}

	success, err := object.AddStore(&store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// DeleteStore
// @Title DeleteStore
// @Tag Store API
// @Description delete store
// @Param body body object.Store true "The details of the store"
// @Success 200 {object} controllers.Response The Response object
// @router /delete-store [post]
func (c *ApiController) DeleteStore() {
	var store object.Store
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if store.IsDefault {
		c.ResponseError(c.T("store:Cannot delete the default store"))
		return
	}

	success, err := object.DeleteStore(&store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// ClaimStore
// @Title ClaimStore
// @Tag Store API
// @Description claim a store owned by "admin" and transfer ownership to the current store admin
// @Param id query string true "The id (owner/name) of the store to claim"
// @Success 200 {object} controllers.Response The Response object
// @router /claim-store [post]
func (c *ApiController) ClaimStore() {
	if !c.RequireAdmin() {
		return
	}
	if c.IsGlobalAdmin() {
		c.ResponseError("global admin does not need to claim a store")
		return
	}

	id := c.Input().Get("id")
	store, err := object.GetStore(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if store == nil {
		store, err = object.GetStoreForGetApi(id)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
	}
	if store == nil {
		c.ResponseError(fmt.Sprintf("store: %s not found", id))
		return
	}
	if store.Owner != "admin" {
		c.ResponseError("only stores owned by admin can be claimed")
		return
	}

	username := c.GetSessionUsername()
	store.Owner = username
	_, err = object.UpdateStore(fmt.Sprintf("admin/%s", store.Name), store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(store)
}

// RefreshStoreVectors
// @Title RefreshStoreVectors
// @Tag Store API
// @Description refresh store vectors
// @Param body body object.Store true "The details of the store"
// @Success 200 {object} controllers.Response The Response object
// @router /refresh-store-vectors [post]
func (c *ApiController) RefreshStoreVectors() {
	var store object.Store
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	ok, err := object.RefreshStoreVectors(&store, c.GetAcceptLanguage())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(ok)
}

// GetStoreNames ...
// @Title GetStoreNames
// @Tag Store API
// @Param   owner     query    string    true   "owner"
// @Description get all store name and displayName
// @Success 200 {array} object.Store The Response object
// @router /get-store-names [get]
func (c *ApiController) GetStoreNames() {
	var storeNames []*object.Store
	var err error

	if c.IsGlobalAdmin() {
		storeNames, err = object.GetStoresByFields("", []string{"name", "display_name", "avatar"}...)
	} else {
		username := c.GetSessionUsername()
		storeNames, err = object.GetStoresByFields(username, []string{"name", "display_name", "avatar"}...)
	}
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(storeNames)
}

type shareStoreForm struct {
	Owner      string `json:"owner"`
	Name       string `json:"name"`
	TargetUser string `json:"targetUser"`
}

// AddSharedStore duplicates a store for another user (see object.ShareStore).
// @router /add-shared-store [post]
func (c *ApiController) AddSharedStore() {
	if _, ok := c.RequireSignedIn(); !ok {
		return
	}
	if !c.IsAdmin() {
		c.ResponseError(c.T("auth:this operation requires admin privilege"))
		return
	}

	var form shareStoreForm
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &form)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if form.Owner == "" || form.Name == "" || form.TargetUser == "" {
		c.ResponseError("owner, name and targetUser are required")
		return
	}

	src, err := object.GetStore(util.GetIdFromOwnerAndName(form.Owner, form.Name))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if src == nil {
		c.ResponseError("source store not found")
		return
	}

	if !c.IsGlobalAdmin() && src.Owner != c.GetSessionUsername() {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return
	}

	accountUser, err := object.GetUserByRuntimeName(form.TargetUser)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if accountUser == nil && !conf.IsCasdoorAvailable() {
		c.ResponseError(c.T("general:Target user not found"))
		return
	}

	newStore, err := object.ShareStore(src.Owner, src.Name, form.TargetUser, c.GetSessionUsername())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(newStore)
}
