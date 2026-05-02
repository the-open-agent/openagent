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

package routers

import (
	"strings"

	"github.com/beego/beego/context"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/controllers"
	"github.com/the-open-agent/openagent/util"
)

func AuthzFilter(ctx *context.Context) {
	method := ctx.Request.Method
	urlPath := ctx.Request.URL.Path

	adminDomain := conf.GetConfigString("adminDomain")
	if adminDomain != "" && ctx.Request.Host == adminDomain {
		return
	}

	if conf.IsDemoMode() {
		if !isAllowedInDemoMode(method, urlPath) {
			controllers.DenyRequest(ctx)
		}
	}
	permissionFilter(ctx)
}

func isAllowedInDemoMode(method string, urlPath string) bool {
	if method != "POST" {
		return true
	}

	if strings.HasPrefix(urlPath, "/api/signin") || urlPath == "/api/signout" || urlPath == "/api/add-chat" || urlPath == "/api/add-message" || urlPath == "/api/update-message" || urlPath == "/api/delete-welcome-message" || urlPath == "/api/generate-text-to-speech-audio" || urlPath == "/api/add-node-tunnel" || urlPath == "/api/start-connection" || urlPath == "/api/stop-connection" || urlPath == "/api/commit-record" || urlPath == "/api/commit-record-second" || urlPath == "/api/update-chat" || urlPath == "/api/delete-chat" {
		return true
	}

	return false
}

func permissionFilter(ctx *context.Context) {
	path := ctx.Request.URL.Path
	controllerName := strings.TrimPrefix(path, "/api/")

	if !strings.HasPrefix(path, "/api/") {
		return
	}

	exemptedPaths := []string{
		// Auth endpoints — must remain public
		"signin", "signout", "health",
		// Get paths accessible to regular users
		"get-account", "get-signin-options", "get-chats", "get-forms", "get-global-videos", "get-videos", "get-video", "get-messages",
		"delete-welcome-message", "get-message-answer", "get-answer",
		"get-storage-providers", "get-store", "get-providers", "get-global-stores",
		"get-chat", "get-message",
		"get-tasks", "get-task", "get-public-scales",
		// Mutation paths accessible to regular users
		"update-chat", "add-chat", "delete-chat", "update-message", "add-message",
		"update-task", "add-task", "delete-task", "upload-task-document",
		// Action paths accessible to regular users
		"start-connection", "stop-connection",
		"commit-record", "commit-record-second",
		"query-record", "query-record-second",
		"generate-text-to-speech-audio", "generate-text-to-speech-audio-stream",
		"process-speech-to-text",
		"analyze-task",
		"claim-store",
		"is-session-duplicated",
	}

	for _, exemptPath := range exemptedPaths {
		if controllerName == exemptPath {
			return
		}
	}

	// Webhook callbacks must remain publicly accessible for external services
	if strings.HasPrefix(controllerName, "wecom-bot/callback/") {
		return
	}

	// chat/completions uses its own Bearer token auth, not session-based admin check
	if controllerName == "chat/completions" {
		return
	}

	user := GetSessionUser(ctx)

	if !util.IsAdmin(user) {
		responseError(ctx, "auth:this operation requires admin privilege")
		return
	}
}
