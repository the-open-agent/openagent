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
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/beego/beego/utils/pagination"
	mcppkg "github.com/the-open-agent/openagent/mcp"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

// GetServers
// @Title GetServers
// @Tag Server API
// @Description get MCP servers
// @Success 200 {array} object.Server The Response object
// @router /get-servers [get]
func (c *ApiController) GetServers() {
	owner := "admin"
	limit := c.Input().Get("pageSize")
	page := c.Input().Get("p")
	field := c.Input().Get("field")
	value := c.Input().Get("value")
	sortField := c.Input().Get("sortField")
	sortOrder := c.Input().Get("sortOrder")

	if limit == "" || page == "" {
		servers, err := object.GetServers(owner)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(object.GetMaskedServers(servers, true))
	} else {
		if !c.RequireAdmin() {
			return
		}
		limit := util.ParseInt(limit)
		count, err := object.GetServerCount(owner, field, value)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		paginator := pagination.SetPaginator(c.Ctx, limit, count)
		servers, err := object.GetPaginationServers(owner, paginator.Offset(), limit, field, value, sortField, sortOrder)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		c.ResponseOk(object.GetMaskedServers(servers, true), paginator.Nums())
	}
}

// GetServer
// @Title GetServer
// @Tag Server API
// @Description get MCP server
// @Param id query string true "The id of server"
// @Success 200 {object} object.Server The Response object
// @router /get-server [get]
func (c *ApiController) GetServer() {
	id := c.Input().Get("id")

	server, err := object.GetServer(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(object.GetMaskedServer(server, true))
}

// UpdateServer
// @Title UpdateServer
// @Tag Server API
// @Description update MCP server
// @Param id query string true "The id (owner/name) of the server"
// @Param body body object.Server true "The details of the server"
// @Success 200 {object} controllers.Response The Response object
// @router /update-server [post]
func (c *ApiController) UpdateServer() {
	id := c.Input().Get("id")

	var server object.Server
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	success, err := object.UpdateServer(id, &server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// AddServer
// @Title AddServer
// @Tag Server API
// @Description add MCP server
// @Param body body object.Server true "The details of the server"
// @Success 200 {object} controllers.Response The Response object
// @router /add-server [post]
func (c *ApiController) AddServer() {
	var server object.Server
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	server.Owner = "admin"
	success, err := object.AddServer(&server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// DeleteServer
// @Title DeleteServer
// @Tag Server API
// @Description delete MCP server
// @Param body body object.Server true "The details of the server"
// @Success 200 {object} controllers.Response The Response object
// @router /delete-server [post]
func (c *ApiController) DeleteServer() {
	var server object.Server
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	success, err := object.DeleteServer(&server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// TestMcpServer
// @Title TestMcpServer
// @Tag Server API
// @Description invoke a single MCP tool using server configuration
// @Param body body object.Server true "Server with testContent JSON: {\"tool\":\"...\",\"arguments\":{}}"
// @Success 200 {object} controllers.Response The Response object; data is the tool result JSON string
// @router /test-mcp-server [post]
func (c *ApiController) TestMcpServer() {
	var server object.Server
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &server)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	result, err := object.TestMcpServer(&server, c.GetAcceptLanguage())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(result)
}

// SyncMcpTool
// @Title SyncMcpTool
// @Tag Server API
// @Description sync MCP tools from the server URL (or clear them)
// @Param id query string true "The id (owner/name) of the server"
// @Param isCleared query string false "Pass 1 to clear all tools"
// @Param body body object.Server true "The server details"
// @Success 200 {object} controllers.Response The Response object
// @router /sync-mcp-tool [post]
func (c *ApiController) SyncMcpTool() {
	id := c.Input().Get("id")
	isCleared := c.Input().Get("isCleared") == "1"

	var server object.Server
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &server); err != nil {
		c.ResponseError(err.Error())
		return
	}

	ok, err := object.SyncMcpTool(id, &server, isCleared)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(ok)
}

const onlineServerListURL = "https://mcp.casdoor.org/registry.json"

// GetOnlineServers
// @Title GetOnlineServers
// @Tag Server API
// @Description get online MCP server list from the public registry
// @Success 200 {object} controllers.Response The Response object
// @router /get-online-servers [get]
func (c *ApiController) GetOnlineServers() {
	httpClient := &http.Client{Timeout: 10 * time.Second}
	resp, err := httpClient.Get(onlineServerListURL)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		c.ResponseError(fmt.Sprintf("failed to get online server list, status code: %d", resp.StatusCode))
		return
	}

	var result interface{}
	if err = json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// SyncIntranetServers
// @Title SyncIntranetServers
// @Tag Server API
// @Description scan intranet CIDR targets and detect MCP servers
// @Param body body object "" "JSON with cidr (array), ports (array, optional), paths (array, optional)"
// @Success 200 {object} controllers.Response The Response object
// @router /sync-intranet-servers [post]
func (c *ApiController) SyncIntranetServers() {
	if !c.RequireAdmin() {
		return
	}

	var req struct {
		CIDR  []string `json:"cidr"`
		Ports []string `json:"ports"`
		Paths []string `json:"paths"`
	}
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &req); err != nil {
		c.ResponseError(err.Error())
		return
	}

	// Also accept a single cidr string
	if len(req.CIDR) == 0 {
		if cidrStr := strings.TrimSpace(c.Input().Get("cidr")); cidrStr != "" {
			req.CIDR = []string{cidrStr}
		}
	}

	result, err := mcppkg.ScanIntranetServers(req.CIDR, req.Ports, req.Paths)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}
