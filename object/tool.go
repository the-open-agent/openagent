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

package object

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/the-open-agent/openagent/auth"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/tool"
	"github.com/the-open-agent/openagent/util"
	"xorm.io/core"
)

type Tool struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`

	DisplayName  string `xorm:"varchar(100)" json:"displayName"`
	DisplayName2 string `xorm:"varchar(100)" json:"displayName2"`
	Type         string `xorm:"varchar(100)" json:"type"`
	SubType      string `xorm:"varchar(100)" json:"subType"`
	ClientId     string `xorm:"varchar(100)" json:"clientId"`
	ClientSecret string `xorm:"varchar(2000)" json:"clientSecret"`
	ProviderUrl  string `xorm:"varchar(200)" json:"providerUrl"`
	EnableProxy  bool   `json:"enableProxy"`

	Mode           string   `xorm:"varchar(100)" json:"mode"`
	TestContent    string   `xorm:"varchar(500)" json:"testContent"`
	ModelProvider  string   `xorm:"varchar(100)" json:"modelProvider"`
	ResultSummary  string   `xorm:"varchar(500)" json:"resultSummary"`
	PromptExamples []string `xorm:"mediumtext" json:"promptExamples"`

	State string `xorm:"varchar(100)" json:"state"`
}

func (t *Tool) GetId() string {
	return fmt.Sprintf("%s/%s", t.Owner, t.Name)
}

func GetMaskedTool(t *Tool, isMaskEnabled bool, user *auth.User) *Tool {
	if !isMaskEnabled || t == nil {
		return t
	}
	if t.ClientSecret != "" {
		t.ClientSecret = "***"
	}
	return t
}

func GetMaskedTools(tools []*Tool, isMaskEnabled bool, user *auth.User) []*Tool {
	if !isMaskEnabled {
		return tools
	}
	for _, t := range tools {
		t = GetMaskedTool(t, isMaskEnabled, user)
	}
	return tools
}

func GetGlobalTools() ([]*Tool, error) {
	tools := []*Tool{}
	err := adapter.engine.Asc("owner").Desc("created_time").Find(&tools)
	return tools, err
}

func GetTools(owner string) ([]*Tool, error) {
	tools := []*Tool{}
	err := adapter.engine.Desc("created_time").Find(&tools, &Tool{Owner: owner})
	return tools, err
}

func getTool(owner string, name string) (*Tool, error) {
	t := Tool{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(&t)
	if err != nil {
		return &t, err
	}
	if existed {
		return &t, nil
	}
	return nil, nil
}

func GetTool(id string) (*Tool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	return getTool(owner, name)
}

func GetToolByOwnerAndName(owner string, nameOrId string) (*Tool, error) {
	if nameOrId == "" {
		return nil, nil
	}
	var id string
	if _, _, err := util.GetOwnerAndNameFromIdWithError(nameOrId); err == nil {
		id = nameOrId
	} else {
		id = util.GetIdFromOwnerAndName(owner, nameOrId)
	}
	t, err := GetTool(id)
	if err != nil {
		return nil, err
	}
	if t != nil {
		return t, nil
	}
	if owner != "admin" && !strings.Contains(nameOrId, "/") {
		return GetTool(util.GetIdFromOwnerAndName("admin", nameOrId))
	}
	return nil, nil
}

func GetToolCount(owner, field, value string) (int64, error) {
	session := GetDbSession(owner, -1, -1, field, value, "", "")
	return session.Count(&Tool{})
}

func GetPaginationTools(owner string, offset, limit int, field, value, sortField, sortOrder string) ([]*Tool, error) {
	tools := []*Tool{}
	session := GetDbSession(owner, offset, limit, field, value, sortField, sortOrder)
	err := session.Find(&tools)
	return tools, err
}

func UpdateTool(id string, t *Tool) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	toolDb, err := getTool(owner, name)
	if err != nil {
		return false, err
	}
	if t == nil || toolDb == nil {
		return false, nil
	}

	if t.ClientSecret == "***" {
		t.ClientSecret = toolDb.ClientSecret
	}

	_, err = adapter.engine.ID(core.PK{owner, name}).AllCols().Update(t)
	if err != nil {
		return false, err
	}
	return true, nil
}

func AddTool(t *Tool) (bool, error) {
	affected, err := adapter.engine.Insert(t)
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func DeleteTool(t *Tool) (bool, error) {
	affected, err := adapter.engine.ID(core.PK{t.Owner, t.Name}).Delete(&Tool{})
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func getToolConfig(t *Tool) tool.Config {
	return tool.Config{
		Type:         t.Type,
		SubType:      t.SubType,
		ProviderUrl:  t.ProviderUrl,
		ClientId:     t.ClientId,
		ClientSecret: t.ClientSecret,
		EnableProxy:  t.EnableProxy,
		Mode:         t.Mode,
	}
}

func TestTool(t *Tool, lang string) (string, error) {
	return testToolWithLoader(t, lang, getTool)
}

func ExecuteBuiltinTool(owner string, toolName string, builtinName string, arguments map[string]interface{}, lang string) (string, bool, error) {
	t, err := GetToolByOwnerAndName(owner, toolName)
	if err != nil {
		return "", false, err
	}
	if t == nil {
		return "", false, fmt.Errorf("tool not found: %s/%s", owner, toolName)
	}
	return executeBuiltinToolWithConfig(t, builtinName, arguments, lang)
}

func testToolWithLoader(t *Tool, lang string, loadTool func(owner string, name string) (*Tool, error)) (string, error) {
	if t.ClientSecret == "***" {
		if strings.TrimSpace(t.Owner) == "" || strings.TrimSpace(t.Name) == "" {
			return "", fmt.Errorf("cannot restore masked tool secret without owner and name")
		}
		toolDb, err := loadTool(t.Owner, t.Name)
		if err != nil {
			return "", err
		}
		if toolDb == nil {
			return "", fmt.Errorf("tool not found: %s/%s", t.Owner, t.Name)
		}
		t.ClientSecret = toolDb.ClientSecret
		if t.ClientSecret == "" || t.ClientSecret == "***" {
			return "", fmt.Errorf("masked clientSecret could not be restored")
		}
	}

	var payload struct {
		Tool      string                 `json:"tool"`
		Arguments map[string]interface{} `json:"arguments"`
	}
	if err := json.Unmarshal([]byte(t.TestContent), &payload); err != nil {
		return "", fmt.Errorf(i18n.Translate(lang, "object:invalid tool test JSON in testContent: %v"), err)
	}
	if strings.TrimSpace(payload.Tool) == "" {
		return "", fmt.Errorf(i18n.Translate(lang, "object:tool test JSON must include non-empty \"tool\""))
	}
	if payload.Arguments == nil {
		payload.Arguments = map[string]interface{}{}
	}

	output, isError, err := executeBuiltinToolWithConfig(t, payload.Tool, payload.Arguments, lang)
	if err != nil {
		return "", err
	}
	if isError {
		return "", fmt.Errorf("%s", output)
	}
	return output, nil
}

func executeBuiltinToolWithConfig(t *Tool, builtinName string, arguments map[string]interface{}, lang string) (string, bool, error) {
	owner := strings.TrimSpace(t.Owner)
	if owner == "" {
		return "", false, fmt.Errorf("tool owner is required")
	}

	tp, err := tool.New(getToolConfig(t), lang)
	if err != nil {
		return "", false, err
	}

	var foundTool interface {
		Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error)
	}
	for _, bt := range tp.BuiltinTools() {
		if bt.GetName() == builtinName {
			foundTool = wrapSnapshotBuiltin(owner, bt)
			break
		}
	}
	if foundTool == nil {
		return "", false, fmt.Errorf("tool not found: %s", builtinName)
	}

	result, err := foundTool.Execute(context.Background(), arguments)
	if err != nil {
		return "", false, err
	}

	var texts []string
	for _, c := range result.Content {
		if tc, ok := c.(*protocol.TextContent); ok {
			texts = append(texts, tc.Text)
		}
	}
	output := strings.Join(texts, "\n")
	return output, result.IsError, nil
}
