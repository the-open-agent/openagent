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

	"github.com/beego/beego/utils/pagination"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

// GetGlobalChats
// @Title GetGlobalChats
// @Tag Chat API
// @Description get global chats
// @Success 200 {array} object.Chat The Response object
// @router /get-global-chats [get]
func (c *ApiController) GetGlobalChats() {
	limit := c.Input().Get("pageSize")
	page := c.Input().Get("p")
	field := c.Input().Get("field")
	value := c.Input().Get("value")
	sortField := c.Input().Get("sortField")
	sortOrder := c.Input().Get("sortOrder")
	store := c.Input().Get("store")

	if limit == "" || page == "" {
		chats, err := object.GetGlobalChats()
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		c.ResponseOk(chats)
	} else {
		limitInt := util.ParseInt(limit)
		username := c.GetSessionUsername()
		var isolationOk bool
		store, isolationOk = c.EnforceStoreIsolation(store)
		if !isolationOk {
			return
		}

		var count int64
		var chats []*object.Chat
		var err error

		// Store admins (chat-admin / 教师) must be checked before global admins: users who have
		// both Casdoor isAdmin and chat-admin would otherwise hit the global branch and bypass
		// store scoping when ?store= is empty.
		if c.IsStoreAdmin() {
			// Store admin sees chats belonging to their stores
			storeNames, err2 := getStoreNamesForUser(username)
			if err2 != nil {
				c.ResponseError(err2.Error())
				return
			}
			storeNames, ok := narrowStoreAdminStoreNames(storeNames, store)
			if !ok {
				c.ResponseError(c.T("controllers:You can only access data from your assigned store"))
				return
			}
			count, err = object.GetChatCountByStoreNames(storeNames, field, value)
			if err != nil {
				c.ResponseError(err.Error())
				return
			}
			paginator := pagination.SetPaginator(c.Ctx, limitInt, count)
			chats, err = object.GetPaginationChatsByStoreNames(storeNames, paginator.Offset(), limitInt, field, value, sortField, sortOrder)
		} else if c.IsGlobalAdmin() {
			count, err = object.GetChatCount("", field, value, store)
			if err != nil {
				c.ResponseError(err.Error())
				return
			}
			paginator := pagination.SetPaginator(c.Ctx, limitInt, count)
			chats, err = object.GetPaginationChats("", paginator.Offset(), limitInt, field, value, sortField, sortOrder, store)
		} else {
			// Regular user sees only their own chats
			count, err = object.GetChatCountByUser(username, store, field, value)
			if err != nil {
				c.ResponseError(err.Error())
				return
			}
			paginator := pagination.SetPaginator(c.Ctx, limitInt, count)
			chats, err = object.GetPaginationChatsByUser(username, store, paginator.Offset(), limitInt, field, value, sortField, sortOrder)
		}
		if err != nil {
			c.ResponseError(err.Error())
			return
		}

		c.ResponseOk(chats, count)
	}
}

// GetChats
// @Title GetChats
// @Tag Chat API
// @Description get chats
// @Param user query string true "The user of chat"
// @Param field query string true "The field of chat"
// @Param value query string true "The value of chat"
// @Param startTime query string false "Filter by start time"
// @Param endTime query string false "Filter by end time"
// @Success 200 {array} object.Chat The Response object
// @router /get-chats [get]
func (c *ApiController) GetChats() {
	user := c.Input().Get("user")
	field := c.Input().Get("field")
	value := c.Input().Get("value")
	selectedUser := c.Input().Get("selectedUser")
	storeName := c.Input().Get("store")
	startTime := c.Input().Get("startTime")
	endTime := c.Input().Get("endTime")

	if c.IsAdmin() {
		user = ""
	}

	if selectedUser != "" && selectedUser != "null" && c.IsAdmin() {
		user = selectedUser
	}

	if !c.IsAdmin() && user != selectedUser && selectedUser != "" {
		c.ResponseError(c.T("controllers:You can only view your own chats"))
		return
	}

	// Apply store isolation based on user's Homepage field
	var ok bool
	storeName, ok = c.EnforceStoreIsolation(storeName)
	if !ok {
		return
	}

	var chats []*object.Chat
	var err error
	if field == "user" {
		chats, err = object.GetChats("admin", storeName, value)
	} else {
		chats, err = object.GetChats("admin", storeName, user)
	}
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	// Filter by time range if specified
	if startTime != "" || endTime != "" {
		chats = object.FilterChatsByTimeRange(chats, startTime, endTime)
	}

	c.ResponseOk(chats)
}

// GetChat
// @Title GetChat
// @Tag Chat API
// @Description get chat
// @Param id query string true "The id of chat"
// @Success 200 {object} object.Chat The Response object
// @router /get-chat [get]
func (c *ApiController) GetChat() {
	id := c.Input().Get("id")

	chat, err := object.GetChat(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if chat == nil {
		c.ResponseError("Chat not found")
		return
	}

	// Check if user has permission to view this chat
	if !c.IsAdmin() {
		username := c.GetSessionUsername()
		if username != chat.User {
			c.ResponseError(c.T("auth:Unauthorized operation"))
			return
		}
	}

	c.ResponseOk(chat)
}

// UpdateChat
// @Title UpdateChat
// @Tag Chat API
// @Description update Chat
// @Param id query string true "The id (owner/name) of the chat"
// @Param body body object.Chat true "The details of the chat"
// @Success 200 {object} controllers.Response The Response object
// @router /update-chat [post]
func (c *ApiController) UpdateChat() {
	id := c.Input().Get("id")

	var chat object.Chat
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &chat)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	ok := c.IsCurrentUser(chat.User)
	if !ok {
		return
	}

	if conf.IsDemoMode() {
		originalChat, err := object.GetChat(id)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		if originalChat == nil {
			c.ResponseError(fmt.Sprintf("The chat: %s is not found", id))
			return
		}

		originalChat.ModelProvider = chat.ModelProvider
		chat = *originalChat
	}

	success, err := object.UpdateChat(id, &chat)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// AddChat
// @Title AddChat
// @Tag Chat API
// @Description add chat
// @Param body body object.Chat true "The details of the chat"
// @Success 200 {object} controllers.Response The Response object
// @router /add-chat [post]
func (c *ApiController) AddChat() {
	var chat object.Chat
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &chat)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	ok := c.IsCurrentUser(chat.User)
	if !ok {
		return
	}

	currentTime := util.GetCurrentTime()
	chat.CreatedTime = currentTime
	chat.UpdatedTime = currentTime
	chat.ClientIp = c.getClientIp()
	chat.UserAgent = c.getUserAgent()
	chat.ClientIpDesc = util.GetDescFromIP(chat.ClientIp)
	chat.UserAgentDesc = util.GetDescFromUserAgent(chat.UserAgent)

	if chat.Store == "" {
		var store *object.Store
		store, err = object.GetDefaultStore(c.defaultStoreOwner())
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		if store == nil {
			c.ResponseError(c.T("account:The default store is not found"))
			return
		}

		chat.Store = store.Name
	}

	success, err := object.AddChat(&chat)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// DeleteChat
// @Title DeleteChat
// @Tag Chat API
// @Description delete chat
// @Param body body object.Chat true "The details of the chat"
// @Success 200 {object} controllers.Response The Response object
// @router /delete-chat [post]
func (c *ApiController) DeleteChat() {
	var chat object.Chat
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &chat)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	ok := c.IsCurrentUser(chat.User)
	if !ok {
		return
	}

	success, err := object.DeleteChat(&chat)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	message := object.Message{
		Owner: chat.Owner,
		Chat:  chat.Name,
	}
	success, err = object.DeleteMessagesByChat(&message)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}
