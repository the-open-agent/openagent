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

package controllers

import (
	"encoding/json"

	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

type toggleFavoriteForm struct {
	Type       string `json:"type"`
	StoreOwner string `json:"storeOwner"`
	StoreName  string `json:"storeName"`
}

// ToggleStoreFavorite stars/unstars or watches/unwatches a store for the current user.
// @router /toggle-store-favorite [post]
func (c *ApiController) ToggleStoreFavorite() {
	user, ok := c.RequireSignedIn()
	if !ok {
		return
	}
	if util.IsAnonymousUserByUsername(user) {
		c.ResponseError(c.T("auth:Please sign in first"))
		return
	}

	var form toggleFavoriteForm
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &form)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if !object.IsValidFavoriteType(form.Type) {
		c.ResponseError("invalid favorite type")
		return
	}
	if form.StoreOwner == "" || form.StoreName == "" {
		c.ResponseError("storeOwner and storeName are required")
		return
	}

	store, err := object.GetStore(util.GetIdFromOwnerAndName(form.StoreOwner, form.StoreName))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if store == nil {
		c.ResponseError(c.T("store:The agent does not exist"))
		return
	}

	favorited, err := object.ToggleStoreFavorite(user, form.Type, form.StoreOwner, form.StoreName)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	count, err := object.GetStoreFavoriteCount(form.Type, form.StoreOwner, form.StoreName)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(map[string]interface{}{"favorited": favorited, "count": count})
}

// GetFavoredStores returns the current user's starred or watched stores.
// @router /get-favored-stores [get]
func (c *ApiController) GetFavoredStores() {
	user, ok := c.RequireSignedIn()
	if !ok {
		return
	}

	favoriteType := c.Input().Get("type")
	if !object.IsValidFavoriteType(favoriteType) {
		c.ResponseError("invalid favorite type")
		return
	}

	stores, err := object.GetFavoredStores(user, favoriteType)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(object.GetMaskedStores(stores, c.GetSessionUser()))
}

// GetStoreFavoriteStatus returns star/watch counts (public) and, for a signed-in
// user, whether they starred/watched the store and whether they already forked it.
// @router /get-store-favorite-status [get]
func (c *ApiController) GetStoreFavoriteStatus() {
	storeOwner := c.Input().Get("storeOwner")
	storeName := c.Input().Get("storeName")
	if storeOwner == "" || storeName == "" {
		c.ResponseError("storeOwner and storeName are required")
		return
	}

	starCount, err := object.GetStoreFavoriteCount(object.FavoriteTypeStar, storeOwner, storeName)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	watchCount, err := object.GetStoreFavoriteCount(object.FavoriteTypeWatch, storeOwner, storeName)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	forkCount, err := object.GetStoreForkCount(storeOwner, storeName)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	result := map[string]interface{}{
		"starCount":  starCount,
		"watchCount": watchCount,
		"forkCount":  forkCount,
		"starred":    false,
		"watched":    false,
		"hasForked":  false,
		"isOwner":    false,
	}

	user := c.GetSessionUsername()
	if user != "" && !util.IsAnonymousUserByUsername(user) {
		starred, err := object.IsStoreFavorited(user, object.FavoriteTypeStar, storeOwner, storeName)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		watched, err := object.IsStoreFavorited(user, object.FavoriteTypeWatch, storeOwner, storeName)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		hasForked, err := object.HasUserForkedStore(user, storeOwner, storeName)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		result["starred"] = starred
		result["watched"] = watched
		result["hasForked"] = hasForked
		result["isOwner"] = user == storeOwner
	}

	c.ResponseOk(result)
}
