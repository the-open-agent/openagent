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
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

const (
	maxIssueTitleLength   = 200
	maxIssueContentLength = 2000
)

func (c *ApiController) responseIssueError(message string) {
	switch message {
	case "Issue store does not exist",
		"Issue title cannot be empty",
		"Issue does not exist":
		c.ResponseError(c.T("issue:" + message))
	default:
		c.ResponseError(message)
	}
}

// resolveIssueStore validates that the store the issue belongs to exists and
// returns its owner (allowed to moderate the store's issues).
func resolveIssueStore(storeId string) (*object.Store, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(storeId)
	if err != nil {
		return nil, err
	}
	store, err := object.GetStore(util.GetIdFromOwnerAndName(owner, name))
	if err != nil {
		return nil, err
	}
	if store == nil {
		return nil, fmt.Errorf("Issue store does not exist")
	}
	return store, nil
}

// GetIssues
// @Title GetIssues
// @Tag Issue API
// @Description get issues of a store
// @Param store query string true "The store id (owner/name)"
// @Success 200 {array} object.Issue The Response object
// @router /get-issues [get]
func (c *ApiController) GetIssues() {
	store := c.Input().Get("store")

	if _, err := resolveIssueStore(store); err != nil {
		c.responseIssueError(err.Error())
		return
	}

	issues, err := object.GetIssues(store)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(issues)
}

// GetIssue
// @Title GetIssue
// @Tag Issue API
// @Description get an issue by id
// @Param id query string true "The id (owner/name) of the issue"
// @Success 200 {object} object.Issue The Response object
// @router /get-issue [get]
func (c *ApiController) GetIssue() {
	id := c.Input().Get("id")

	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	issue, err := object.GetIssue(owner, name)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if issue == nil {
		c.responseIssueError("Issue does not exist")
		return
	}
	c.ResponseOk(issue)
}

// AddIssue
// @Title AddIssue
// @Tag Issue API
// @Description add an issue
// @Param body body object.Issue true "The details of the issue"
// @Success 200 {object} controllers.Response The Response object
// @router /add-issue [post]
func (c *ApiController) AddIssue() {
	username, ok := c.RequireSignedIn()
	if !ok {
		return
	}
	if util.IsAnonymousUserByUsername(username) {
		c.ResponseError(c.T("auth:Please sign in first"))
		return
	}

	var issue object.Issue
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &issue)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	issue.Owner = username
	issue.Title = strings.TrimSpace(issue.Title)
	issue.Content = strings.TrimSpace(issue.Content)
	if issue.Title == "" {
		c.responseIssueError("Issue title cannot be empty")
		return
	}
	if utf8.RuneCountInString(issue.Title) > maxIssueTitleLength {
		c.ResponseError(fmt.Sprintf(c.T("issue:Issue title cannot be longer than %d characters"), maxIssueTitleLength))
		return
	}
	if utf8.RuneCountInString(issue.Content) > maxIssueContentLength {
		c.ResponseError(fmt.Sprintf(c.T("issue:Issue content cannot be longer than %d characters"), maxIssueContentLength))
		return
	}

	if _, err = resolveIssueStore(issue.Store); err != nil {
		c.responseIssueError(err.Error())
		return
	}

	issue.Status = object.IssueStatusOpen
	success, err := object.AddIssue(&issue)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(success)
}

// UpdateIssue
// @Title UpdateIssue
// @Tag Issue API
// @Description update an issue (edit or open/close), by author, store owner or admin
// @Param id query string true "The id (owner/name) of the issue"
// @Param body body object.Issue true "The details of the issue"
// @Success 200 {object} controllers.Response The Response object
// @router /update-issue [post]
func (c *ApiController) UpdateIssue() {
	username, ok := c.RequireSignedIn()
	if !ok {
		return
	}

	id := c.Input().Get("id")
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	existing, err := object.GetIssue(owner, name)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if existing == nil {
		c.responseIssueError("Issue does not exist")
		return
	}

	if !c.canManageIssue(username, existing) {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return
	}

	var issue object.Issue
	err = json.Unmarshal(c.Ctx.Input.RequestBody, &issue)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	issue.Title = strings.TrimSpace(issue.Title)
	issue.Content = strings.TrimSpace(issue.Content)
	if issue.Title == "" {
		c.responseIssueError("Issue title cannot be empty")
		return
	}
	if utf8.RuneCountInString(issue.Title) > maxIssueTitleLength {
		c.ResponseError(fmt.Sprintf(c.T("issue:Issue title cannot be longer than %d characters"), maxIssueTitleLength))
		return
	}
	if utf8.RuneCountInString(issue.Content) > maxIssueContentLength {
		c.ResponseError(fmt.Sprintf(c.T("issue:Issue content cannot be longer than %d characters"), maxIssueContentLength))
		return
	}
	if issue.Status != object.IssueStatusClosed {
		issue.Status = object.IssueStatusOpen
	}

	// Preserve immutable/authoritative fields.
	issue.Owner = existing.Owner
	issue.Name = existing.Name
	issue.Store = existing.Store
	issue.CreatedTime = existing.CreatedTime

	success, err := object.UpdateIssue(id, &issue)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(success)
}

// DeleteIssue
// @Title DeleteIssue
// @Tag Issue API
// @Description delete an issue, by author, store owner or admin
// @Param body body object.Issue true "The details of the issue"
// @Success 200 {object} controllers.Response The Response object
// @router /delete-issue [post]
func (c *ApiController) DeleteIssue() {
	username, ok := c.RequireSignedIn()
	if !ok {
		return
	}

	var request object.Issue
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &request)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	issue, err := object.GetIssue(request.Owner, request.Name)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if issue == nil {
		c.responseIssueError("Issue does not exist")
		return
	}

	if !c.canManageIssue(username, issue) {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return
	}

	success, err := object.DeleteIssue(issue)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(success)
}

// canManageIssue reports whether the user may edit/close/delete the issue:
// its author, the owner of the store it belongs to, or an admin.
func (c *ApiController) canManageIssue(username string, issue *object.Issue) bool {
	if c.IsAdmin() {
		return true
	}
	if username != "" && username == issue.Owner {
		return true
	}
	store, err := resolveIssueStore(issue.Store)
	if err == nil && store != nil && username == store.Owner {
		return true
	}
	return false
}
