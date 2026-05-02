// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

package controllers

import (
	"encoding/json"

	"github.com/beego/beego/utils/pagination"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

// GetGlobalScales
// @Title GetGlobalScales
// @Tag Scale API
// @Success 200 {array} object.Scale The Response object
// @router /get-global-scales [get]
func (c *ApiController) GetGlobalScales() {
	scales, err := object.GetGlobalScales()
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(object.GetMaskedScales(scales, true))
}

// GetScales
// @Title GetScales
// @Tag Scale API
// @router /get-scales [get]
func (c *ApiController) GetScales() {
	owner := c.Input().Get("owner")
	limit := c.Input().Get("pageSize")
	page := c.Input().Get("p")
	field := c.Input().Get("field")
	value := c.Input().Get("value")
	sortField := c.Input().Get("sortField")
	sortOrder := c.Input().Get("sortOrder")

	if c.IsAdmin() {
		owner = ""
	}
	if !c.IsAdmin() {
		username := c.GetSessionUsername()
		if username != "" {
			owner = username
		}
	}

	if limit == "" || page == "" {
		scales, err := object.GetScales(owner)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(object.GetMaskedScales(scales, true))
	} else {
		limit := util.ParseInt(limit)
		count, err := object.GetScaleCount(owner, field, value)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		paginator := pagination.SetPaginator(c.Ctx, limit, count)
		scales, err := object.GetPaginationScales(owner, paginator.Offset(), limit, field, value, sortField, sortOrder)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseOk(scales, paginator.Nums())
	}
}

// GetScale
// @router /get-scale [get]
func (c *ApiController) GetScale() {
	id := c.Input().Get("id")
	s, err := object.GetScale(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if s == nil {
		c.ResponseOk(nil)
		return
	}
	if !c.IsAdmin() {
		username := c.GetSessionUsername()
		if s.Owner != username {
			c.ResponseError(c.T("auth:Unauthorized operation"))
			return
		}
	}
	c.ResponseOk(object.GetMaskedScale(s, true))
}

// GetPublicScales
// @Title GetPublicScales
// @Tag Scale API
// @Success 200 {array} object.Scale The Response object
// @router /get-public-scales [get]
func (c *ApiController) GetPublicScales() {
	if c.GetSessionUsername() == "" {
		c.ResponseError(c.T("auth:Please sign in first"))
		return
	}
	scales, err := object.GetPublicScales("admin")
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(object.GetMaskedScales(scales, true))
}

// UpdateScale
// @router /update-scale [post]
func (c *ApiController) UpdateScale() {
	id := c.Input().Get("id")
	var s object.Scale
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &s)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	existing, err := object.GetScale(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if existing == nil {
		c.ResponseError(c.T("general:The task does not exist"))
		return
	}
	if !c.IsAdmin() {
		s.State = existing.State
	} else if s.State == object.ScaleStateHidden {
		s.State = object.ScaleStateHidden
	} else {
		s.State = object.ScaleStatePublic
	}
	if !c.IsAdmin() {
		username := c.GetSessionUsername()
		if existing.Owner != username {
			c.ResponseError(c.T("auth:Unauthorized operation"))
			return
		}
	}
	success, err := object.UpdateScale(id, &s)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(success)
}

// AddScale
// @router /add-scale [post]
func (c *ApiController) AddScale() {
	var s object.Scale
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &s)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if !c.IsAdmin() {
		s.State = object.ScaleStatePublic
	} else if s.State == object.ScaleStateHidden {
		s.State = object.ScaleStateHidden
	} else {
		s.State = object.ScaleStatePublic
	}
	success, err := object.AddScale(&s)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(success)
}

// DeleteScale
// @router /delete-scale [post]
func (c *ApiController) DeleteScale() {
	var s object.Scale
	err := json.Unmarshal(c.Ctx.Input.RequestBody, &s)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if !c.IsAdmin() {
		username := c.GetSessionUsername()
		id := s.GetId()
		existing, err := object.GetScale(id)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		if existing == nil {
			c.ResponseError(c.T("general:The task does not exist"))
			return
		}
		if existing.Owner != username {
			c.ResponseError(c.T("auth:Unauthorized operation"))
			return
		}
	}
	success, err := object.DeleteScale(&s)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(success)
}
