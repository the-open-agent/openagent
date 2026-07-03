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

	"github.com/beego/beego/utils/pagination"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

const (
	defaultCommentPageSize = 10
	maxCommentPageSize     = 50
	maxCommentLength       = 1000
)

type commentTarget struct {
	Owner string
}

func (c *ApiController) responseCommentError(message string) {
	switch message {
	case "Unsupported comment target type",
		"Comment target does not exist",
		"Comment content cannot be empty",
		"Parent comment does not exist",
		"Comment does not exist":
		c.ResponseError(c.T("comment:" + message))
	default:
		c.ResponseError(message)
	}
}

func getCommentPageSize(value string) int {
	pageSize, err := util.ParseIntWithError(value)
	if err != nil || pageSize <= 0 {
		return defaultCommentPageSize
	}
	if pageSize > maxCommentPageSize {
		return maxCommentPageSize
	}
	return pageSize
}

func resolveCommentTarget(targetType string, targetKey string) (*commentTarget, error) {
	switch targetType {
	case object.CommentTargetTypeAgentHub:
		return resolveStoreCommentTarget(targetKey)
	case object.CommentTargetTypeIssue:
		return resolveIssueCommentTarget(targetKey)
	default:
		return nil, fmt.Errorf("Unsupported comment target type")
	}
}

func resolveStoreCommentTarget(targetKey string) (*commentTarget, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(targetKey)
	if err != nil {
		return nil, err
	}

	store, err := object.GetStore(util.GetIdFromOwnerAndName(owner, name))
	if err != nil {
		return nil, err
	}
	if store == nil || store.PublishState != "Published" {
		return nil, fmt.Errorf("Comment target does not exist")
	}

	return &commentTarget{Owner: store.Owner}, nil
}

// resolveIssueCommentTarget validates that the issue exists and resolves the
// owner allowed to moderate its comments (the issue's store owner).
func resolveIssueCommentTarget(targetKey string) (*commentTarget, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(targetKey)
	if err != nil {
		return nil, err
	}

	issue, err := object.GetIssue(owner, name)
	if err != nil {
		return nil, err
	}
	if issue == nil {
		return nil, fmt.Errorf("Comment target does not exist")
	}

	storeOwner, storeName, err := util.GetOwnerAndNameFromIdWithError(issue.Store)
	if err != nil {
		return nil, err
	}
	store, err := object.GetStore(util.GetIdFromOwnerAndName(storeOwner, storeName))
	if err != nil {
		return nil, err
	}
	if store == nil {
		return nil, fmt.Errorf("Comment target does not exist")
	}

	return &commentTarget{Owner: store.Owner}, nil
}

// GetGlobalComments
// @Title GetGlobalComments
// @Tag Comment API
// @Description get all comments (admin)
// @Param p query string false "The page number"
// @Param pageSize query string false "The page size"
// @Param field query string false "The field to search"
// @Param value query string false "The value to search"
// @Param sortField query string false "The field to sort by"
// @Param sortOrder query string false "The sort order"
// @Success 200 {array} object.Comment The Response object
// @router /get-global-comments [get]
func (c *ApiController) GetGlobalComments() {
	if !c.IsAdmin() {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return
	}

	limit := c.Input().Get("pageSize")
	page := c.Input().Get("p")
	field := c.Input().Get("field")
	value := c.Input().Get("value")
	sortField := c.Input().Get("sortField")
	sortOrder := c.Input().Get("sortOrder")

	if limit == "" || page == "" {
		comments, err := object.GetGlobalComments()
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(comments)
	} else {
		limitInt := util.ParseInt(limit)
		count, err := object.GetGlobalCommentCount(field, value)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		paginator := pagination.SetPaginator(c.Ctx, limitInt, count)
		comments, err := object.GetGlobalPaginationComments(paginator.Offset(), limitInt, field, value, sortField, sortOrder)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(comments, paginator.Nums())
	}
}

// GetComments
// @Title GetComments
// @Tag Comment API
// @Description get comments by target (public)
// @Param targetType query string true "The target type"
// @Param targetKey query string true "The target key"
// @Param p query string false "The page number"
// @Param pageSize query string false "The page size"
// @Success 200 {array} object.Comment The Response object
// @router /get-comments [get]
func (c *ApiController) GetComments() {
	targetType := c.Input().Get("targetType")
	targetKey := c.Input().Get("targetKey")
	pageSize := getCommentPageSize(c.Input().Get("pageSize"))

	_, err := resolveCommentTarget(targetType, targetKey)
	if err != nil {
		c.responseCommentError(err.Error())
		return
	}

	count, err := object.GetCommentCount(targetType, targetKey)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	paginator := pagination.SetPaginator(c.Ctx, pageSize, count)
	comments, err := object.GetPaginationComments(targetType, targetKey, paginator.Offset(), pageSize)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(comments, count)
}

// GetComment
// @Title GetComment
// @Tag Comment API
// @Description get a comment by id
// @Param id query string true "The id (owner/name) of the comment"
// @Success 200 {object} object.Comment The Response object
// @router /get-comment [get]
func (c *ApiController) GetComment() {
	id := c.Input().Get("id")

	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	comment, err := object.GetComment(owner, name)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if comment == nil {
		c.responseCommentError("Comment does not exist")
		return
	}

	username := c.GetSessionUsername()
	if username != comment.Owner && !c.IsAdmin() {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return
	}

	c.ResponseOk(comment)
}

// UpdateComment
// @Title UpdateComment
// @Tag Comment API
// @Description update a comment
// @Param id query string true "The id (owner/name) of the comment"
// @Param body body object.Comment true "The details of the comment"
// @Success 200 {object} controllers.Response The Response object
// @router /update-comment [post]
func (c *ApiController) UpdateComment() {
	if !c.IsAdmin() {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return
	}

	id := c.Input().Get("id")

	var comment object.Comment
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &comment)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	comment.Content = strings.TrimSpace(comment.Content)
	if comment.Content == "" {
		c.responseCommentError("Comment content cannot be empty")
		return
	}
	if utf8.RuneCountInString(comment.Content) > maxCommentLength {
		c.ResponseError(fmt.Sprintf(c.T("comment:Comment content cannot be longer than %d characters"), maxCommentLength))
		return
	}

	success, err := object.UpdateComment(id, &comment)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// AddComment
// @Title AddComment
// @Tag Comment API
// @Description add a comment
// @Param body body object.Comment true "The details of the comment"
// @Success 200 {object} controllers.Response The Response object
// @router /add-comment [post]
func (c *ApiController) AddComment() {
	username, ok := c.RequireSignedIn()
	if !ok {
		return
	}
	if util.IsAnonymousUserByUsername(username) {
		c.ResponseError(c.T("auth:Please sign in first"))
		return
	}

	var comment object.Comment
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &comment)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	comment.Owner = username
	comment.Content = strings.TrimSpace(comment.Content)
	if comment.Content == "" {
		c.responseCommentError("Comment content cannot be empty")
		return
	}
	if utf8.RuneCountInString(comment.Content) > maxCommentLength {
		c.ResponseError(fmt.Sprintf(c.T("comment:Comment content cannot be longer than %d characters"), maxCommentLength))
		return
	}

	_, err = resolveCommentTarget(comment.TargetType, comment.TargetKey)
	if err != nil {
		c.responseCommentError(err.Error())
		return
	}

	if comment.ParentOwner != "" || comment.ParentName != "" {
		parent, err := object.GetComment(comment.ParentOwner, comment.ParentName)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		if parent == nil || parent.TargetType != comment.TargetType || parent.TargetKey != comment.TargetKey {
			c.responseCommentError("Parent comment does not exist")
			return
		}
		if parent.RootOwner == "" && parent.RootName == "" {
			comment.RootOwner = parent.Owner
			comment.RootName = parent.Name
		} else {
			comment.RootOwner = parent.RootOwner
			comment.RootName = parent.RootName
		}
	} else {
		comment.ParentOwner = ""
		comment.ParentName = ""
		comment.RootOwner = ""
		comment.RootName = ""
	}

	success, err := object.AddComment(&comment)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}

// DeleteComment
// @Title DeleteComment
// @Tag Comment API
// @Description delete a comment
// @Param body body object.Comment true "The details of the comment"
// @Success 200 {object} controllers.Response The Response object
// @router /delete-comment [post]
func (c *ApiController) DeleteComment() {
	username, ok := c.RequireSignedIn()
	if !ok {
		return
	}

	var request object.Comment
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &request)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	comment, err := object.GetComment(request.Owner, request.Name)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if comment == nil {
		c.responseCommentError("Comment does not exist")
		return
	}

	if !c.IsAdmin() {
		target, err := resolveCommentTarget(comment.TargetType, comment.TargetKey)
		if err != nil {
			c.responseCommentError(err.Error())
			return
		}
		if username != comment.Owner && username != target.Owner {
			c.ResponseError(c.T("auth:Unauthorized operation"))
			return
		}
	}

	success, err := object.DeleteComment(comment)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(success)
}
