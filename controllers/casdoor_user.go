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
	"sort"
	"strings"

	"github.com/the-open-agent/openagent/auth"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/object"
)

func userMatchesCasdoorOrganization(configOrg string, u *auth.User) bool {
	if u == nil {
		return false
	}
	configOrg = strings.Trim(configOrg, `"' `)
	if configOrg == "" {
		return true
	}
	owner := strings.TrimSpace(u.Owner)
	if owner == "" {
		return false
	}
	if strings.EqualFold(owner, configOrg) {
		return true
	}
	// Some deployments use "org/name" or other casing; allow suffix match.
	if strings.HasSuffix(strings.ToLower(owner), strings.ToLower("/"+configOrg)) {
		return true
	}
	return false
}

type organizationUser struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Avatar      string `json:"avatar"`
}

// GetOrganizationUsers returns Casdoor users in the configured organization (for share UI).
// @router /get-organization-users [get]
func (c *ApiController) GetOrganizationUsers() {
	if _, ok := c.RequireSignedIn(); !ok {
		return
	}
	if c.responseSigninOrganizationUsers() {
		return
	}
	if !c.IsAdmin() {
		c.ResponseError(c.T("auth:this operation requires admin privilege"))
		return
	}
	if !conf.IsCasdoorAvailable() {
		c.ResponseOk([]organizationUser{})
		return
	}

	org := conf.GetConfigString("casdoorOrganization")
	users, err := auth.GetUsers()
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	out := []organizationUser{}
	for _, u := range users {
		if u == nil || u.IsDeleted || u.IsForbidden {
			continue
		}
		if !userMatchesCasdoorOrganization(org, u) {
			continue
		}
		avatar := u.Avatar
		if avatar == "" {
			avatar = u.PermanentAvatar
		}
		out = append(out, organizationUser{
			Name:        u.Name,
			DisplayName: u.DisplayName,
			Avatar:      avatar,
		})
	}

	sort.Slice(out, func(i, j int) bool {
		a := out[i].DisplayName
		if a == "" {
			a = out[i].Name
		}
		b := out[j].DisplayName
		if b == "" {
			b = out[j].Name
		}
		return a < b
	})

	c.ResponseOk(out)
}

// GetUserInfo returns the display name and avatar for a single user by name.
// It is used by the reusable frontend UserLabel component to resolve a bare
// username into a real profile (Casdoor display name + avatar). Any signed-in
// user may call it; only low-sensitivity display fields are returned.
// @router /get-user-info [get]
func (c *ApiController) GetUserInfo() {
	if _, ok := c.RequireSignedIn(); !ok {
		return
	}

	name := c.Input().Get("name")
	if name == "" {
		c.ResponseError(c.T("application:Missing required parameters"))
		return
	}

	// Fallback so the frontend always has something to render.
	info := organizationUser{Name: name}

	sessionUser := c.GetSessionUser()
	if sessionUser != nil && sessionUser.Owner == object.UserOwner {
		// Basic (local) login mode — resolve against the local user table.
		user, err := object.GetUserByRuntimeName(name)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		if user != nil {
			info.DisplayName = user.DisplayName
			info.Avatar = user.Avatar
		}
	} else if conf.IsCasdoorAvailable() {
		user, err := auth.GetUser(name)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		if user != nil {
			info.DisplayName = user.DisplayName
			info.Avatar = user.Avatar
			if info.Avatar == "" {
				info.Avatar = user.PermanentAvatar
			}
		}
	}

	c.ResponseOk(info)
}
