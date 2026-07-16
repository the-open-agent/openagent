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

	"github.com/beego/beego/utils/pagination"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

// GetToolPolicies
// @Title GetToolPolicies
// @Tag ToolPolicy API
// @Description get tool policies
// @Success 200 {array} object.ToolPolicy The Response object
// @router /get-tool-policies [get]
func (c *ApiController) GetToolPolicies() {
	owner := "admin"
	limit := c.Input().Get("pageSize")
	page := c.Input().Get("p")
	field := c.Input().Get("field")
	value := c.Input().Get("value")
	sortField := c.Input().Get("sortField")
	sortOrder := c.Input().Get("sortOrder")

	if !c.RequireAdmin() {
		return
	}

	if limit == "" || page == "" {
		policies, err := object.GetToolPolicies(owner)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(policies)
	} else {
		limit := util.ParseInt(limit)
		count, err := object.GetToolPolicyCount(owner, field, value)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		paginator := pagination.SetPaginator(c.Ctx, limit, count)
		policies, err := object.GetPaginationToolPolicies(owner, paginator.Offset(), limit, field, value, sortField, sortOrder)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		c.ResponseOk(policies, paginator.Nums())
	}
}

// GetToolPolicy
// @Title GetToolPolicy
// @Tag ToolPolicy API
// @Description get tool policy
// @Param id query string true "The id of tool policy"
// @Success 200 {object} object.ToolPolicy The Response object
// @router /get-tool-policy [get]
func (c *ApiController) GetToolPolicy() {
	if !c.RequireAdmin() {
		return
	}
	id := c.Input().Get("id")

	p, err := object.GetToolPolicy(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(p)
}

// UpdateToolPolicy
// @Title UpdateToolPolicy
// @Tag ToolPolicy API
// @Description update tool policy
// @Param id query string true "The id (owner/name) of the tool policy"
// @Param body body object.ToolPolicy true "The details of the tool policy"
// @Success 200 {object} controllers.Response The Response object
// @router /update-tool-policy [post]
func (c *ApiController) UpdateToolPolicy() {
	if !c.RequireAdmin() {
		return
	}
	id := c.Input().Get("id")

	var p object.ToolPolicy
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &p)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	success, err := object.UpdateToolPolicy(id, &p)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// AddToolPolicy
// @Title AddToolPolicy
// @Tag ToolPolicy API
// @Description add tool policy
// @Param body body object.ToolPolicy true "The details of the tool policy"
// @Success 200 {object} controllers.Response The Response object
// @router /add-tool-policy [post]
func (c *ApiController) AddToolPolicy() {
	if !c.RequireAdmin() {
		return
	}

	var p object.ToolPolicy
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &p)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	p.Owner = "admin"
	success, err := object.AddToolPolicy(&p)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// DeleteToolPolicy
// @Title DeleteToolPolicy
// @Tag ToolPolicy API
// @Description delete tool policy
// @Param body body object.ToolPolicy true "The details of the tool policy"
// @Success 200 {object} controllers.Response The Response object
// @router /delete-tool-policy [post]
func (c *ApiController) DeleteToolPolicy() {
	if !c.RequireAdmin() {
		return
	}

	var p object.ToolPolicy
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &p)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	success, err := object.DeleteToolPolicy(&p)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}
