// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
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
)

// GetMcps
// @Title GetMcps
// @Tag MCP API
// @Description get all MCP providers
// @Success 200 {array} object.Mcp The Response object
// @router /get-mcps [get]
func (c *ApiController) GetMcps() {
	providers, err := object.GetMcps("admin")
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(providers)
}

// GetMcp
// @Title GetMcp
// @Tag MCP API
// @Description get a single MCP provider
// @Param id query string true "The id (owner/name) of the MCP provider"
// @Success 200 {object} object.Mcp The Response object
// @router /get-mcp [get]
func (c *ApiController) GetMcp() {
	id := c.Input().Get("id")

	provider, err := object.GetMcp(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if provider == nil {
		c.ResponseError("MCP provider not found")
		return
	}

	c.ResponseOk(provider)
}

// AddMcp
// @Title AddMcp
// @Tag MCP API
// @Description add a new MCP provider
// @Param body body object.Mcp true "The details of the MCP provider"
// @Success 200 {object} controllers.Response The Response object
// @router /add-mcp [post]
func (c *ApiController) AddMcp() {
	var mcp object.Mcp
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &mcp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	success, err := object.AddMcp(&mcp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// UpdateMcp
// @Title UpdateMcp
// @Tag MCP API
// @Description update an MCP provider
// @Param id query string true "The id (owner/name) of the MCP provider"
// @Param body body object.Mcp true "The details of the MCP provider"
// @Success 200 {object} controllers.Response The Response object
// @router /update-mcp [post]
func (c *ApiController) UpdateMcp() {
	id := c.Input().Get("id")

	var mcp object.Mcp
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &mcp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	success, err := object.UpdateMcp(id, &mcp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// DeleteMcp
// @Title DeleteMcp
// @Tag MCP API
// @Description delete an MCP provider
// @Param body body object.Mcp true "The details of the MCP provider"
// @Success 200 {object} controllers.Response The Response object
// @router /delete-mcp [post]
func (c *ApiController) DeleteMcp() {
	var mcp object.Mcp
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &mcp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	success, err := object.DeleteMcp(&mcp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// RefreshMcpTools
// @Title RefreshMcpTools
// @Tag MCP API
// @Description refresh Mcp tools
// @Param body body object.Mcp true "The details of the MCP provider"
// @Success 200 {object} controllers.Response The Response object
// @router /refresh-mcp-tools [post]
func (c *ApiController) RefreshMcpTools() {
	var mcp object.Mcp
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &mcp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	err = object.RefreshMcpTools(&mcp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(&mcp)
}

// TestMcpProvider
// @Title TestMcpProvider
// @Tag MCP API
// @Description invoke a single MCP tool using MCP provider configuration
// @Param body body object.Mcp true "MCP with testContent JSON: {\"tool\":\"...\",\"arguments\":{}}"
// @Success 200 {object} controllers.Response The Response object; data is the tool result JSON string
// @router /test-mcp-provider [post]
func (c *ApiController) TestMcpProvider() {
	var mcp object.Mcp
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &mcp)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	result, err := object.TestMcpProvider(&mcp, c.GetAcceptLanguage())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(result)
}
