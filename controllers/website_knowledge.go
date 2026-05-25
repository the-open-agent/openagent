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
	"strings"

	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

type learnWebsiteFromMessageRequest struct {
	MessageOwner string `json:"messageOwner"`
	MessageName  string `json:"messageName"`
	DisplayName  string `json:"displayName"`
}

type updateWebsiteKnowledgeRequest struct {
	Id          string                 `json:"id"`
	DisplayName string                 `json:"displayName"`
	Homepage    string                 `json:"homepage"`
	State       string                 `json:"state"`
	Playbook    object.WebsitePlaybook `json:"playbook"`
}

type consolidateWebsiteMemoryRequest struct {
	Id string `json:"id"`
}

func (c *ApiController) loadWebsiteSkill(id string) (*object.Skill, bool) {
	username, ok := c.RequireSignedIn()
	if !ok {
		return nil, false
	}
	id = strings.TrimSpace(id)
	if id == "" {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError("id is required")
		return nil, false
	}
	skill, err := object.GetSkill(id)
	if err != nil {
		c.ResponseError(err.Error())
		return nil, false
	}
	if skill == nil {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError("skill not found")
		return nil, false
	}
	if !c.IsAdmin() && skill.Owner != "admin" && username != skill.Owner {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return nil, false
	}
	if skill.Type != "website" {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError("skill is not a website knowledge")
		return nil, false
	}
	return skill, true
}

// LearnWebsiteFromMessage @router /learn-website-from-message [post]
func (c *ApiController) LearnWebsiteFromMessage() {
	username, ok := c.RequireSignedIn()
	if !ok {
		return
	}
	var req learnWebsiteFromMessageRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &req); err != nil {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError("invalid request body")
		return
	}
	req.MessageOwner = strings.TrimSpace(req.MessageOwner)
	req.MessageName = strings.TrimSpace(req.MessageName)
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	if req.MessageOwner == "" || req.MessageName == "" {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError("messageOwner and messageName are required")
		return
	}
	message, err := object.GetMessage(util.GetIdFromOwnerAndName(req.MessageOwner, req.MessageName))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if message == nil {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError("message not found")
		return
	}
	if !c.IsAdmin() && username != message.User {
		c.ResponseError(c.T("auth:Unauthorized operation"))
		return
	}
	result, err := object.LearnWebsiteFromMessageWithDelta(req.MessageOwner, req.MessageName, object.LearnWebsiteOptions{DisplayName: req.DisplayName}, c.GetAcceptLanguage())
	if err != nil {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError(err.Error())
		return
	}
	playbook := result.Playbook
	c.ResponseOk(map[string]any{
		"skill": result.Skill, "playbook": playbook, "delta": result.Delta,
		"learned": map[string]any{"siteId": playbook.SiteId, "pageCount": len(playbook.Pages), "elementCount": len(playbook.Elements), "sourceCount": len(playbook.Sources), "updatedAt": playbook.UpdatedAt},
	})
}

// ConsolidateWebsiteMemory @router /consolidate-website-memory [post]
func (c *ApiController) ConsolidateWebsiteMemory() {
	var req consolidateWebsiteMemoryRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &req); err != nil {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError("invalid request body")
		return
	}
	if _, ok := c.loadWebsiteSkill(req.Id); !ok {
		return
	}
	updatedSkill, records, err := object.ConsolidateWebsiteMemory(strings.TrimSpace(req.Id), c.GetAcceptLanguage())
	if err != nil {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(map[string]any{"skill": updatedSkill, "merged": records})
}

// GetWebsiteKnowledges @router /get-website-knowledges [get]
func (c *ApiController) GetWebsiteKnowledges() {
	if _, ok := c.RequireSignedIn(); !ok {
		return
	}
	skills, err := object.GetSkills("admin")
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	res := make([]*object.Skill, 0)
	for _, skill := range skills {
		if skill != nil && skill.Type == "website" {
			res = append(res, skill)
		}
	}
	c.ResponseOk(res)
}

// GetWebsiteKnowledge @router /get-website-knowledge [get]
func (c *ApiController) GetWebsiteKnowledge() {
	skill, ok := c.loadWebsiteSkill(c.Input().Get("id"))
	if !ok {
		return
	}
	playbook, err := object.ParseWebsitePlaybook(skill.Metadata)
	if err != nil {
		c.ResponseError("failed to parse website playbook metadata")
		return
	}
	c.ResponseOk(map[string]any{"skill": skill, "playbook": playbook})
}

// UpdateWebsiteKnowledge @router /update-website-knowledge [post]
func (c *ApiController) UpdateWebsiteKnowledge() {
	var req updateWebsiteKnowledgeRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &req); err != nil {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError("invalid request body")
		return
	}
	skill, ok := c.loadWebsiteSkill(req.Id)
	if !ok {
		return
	}
	req.Playbook = object.NormalizePlaybook(req.Playbook)
	if req.Playbook.SiteId == "" || req.Playbook.BaseUrl == "" {
		c.Ctx.Output.SetStatus(400)
		c.ResponseError("playbook.siteId and playbook.baseUrl are required")
		return
	}
	req.Playbook, _ = object.DedupWebsiteElements(req.Playbook)
	description := skill.Description
	if strings.TrimSpace(description) == "" {
		description = "Website knowledge for " + req.Playbook.SiteId
	}
	if strings.TrimSpace(req.DisplayName) != "" {
		skill.DisplayName = strings.TrimSpace(req.DisplayName)
	}
	if strings.TrimSpace(req.Homepage) != "" {
		skill.Homepage = strings.TrimSpace(req.Homepage)
	} else {
		skill.Homepage = req.Playbook.BaseUrl
	}
	if strings.TrimSpace(req.State) != "" {
		skill.State = strings.TrimSpace(req.State)
	}
	if err := object.SyncWebsiteSkillFromPlaybook(skill, req.Playbook, skill.DisplayName, description); err != nil {
		c.ResponseError(err.Error())
		return
	}
	success, err := object.UpdateSkill(req.Id, skill)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if !success {
		c.ResponseError("failed to update website knowledge")
		return
	}
	c.ResponseOk(skill)
}
