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

package tool

import (
	"fmt"

	"github.com/the-open-agent/openagent/agent/builtin_tool"
	"github.com/the-open-agent/openagent/i18n"
)

// Tool supplies LLM-callable tools.
type Tool interface {
	BuiltinTools() []builtin_tool.BuiltinTool
}

// Config contains the fields needed to construct builtin tools.
type Config struct {
	Type         string
	SubType      string
	ProviderUrl  string
	ClientId     string
	ClientSecret string
	EnableProxy  bool
}

// New instantiates a tool implementation from its type.
func New(config Config, lang string) (Tool, error) {
	switch config.Type {
	case "time":
		return &TimeTool{}, nil
	case "web_search":
		return NewWebSearchTool(config)
	case "shell":
		return &ShellTool{}, nil
	case "office":
		return &OfficeTool{subType: officeSubType(config.SubType)}, nil
	case "web_fetch":
		return NewWebFetchTool(config)
	case "web_browser":
		return NewBrowserTool(config)
	case "gui":
		return NewWindowsUiaTool(config)
	case "video_download":
		return &VideoDownloadTool{}, nil
	case "browser_use":
		return NewBrowserUseTool(config)
	default:
		return nil, fmt.Errorf(i18n.Translate(lang, "tool:unsupported tool type: %s"), config.Type)
	}
}
