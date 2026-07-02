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

package authz

import (
	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
	stringadapter "github.com/qiangmzsx/string-adapter/v2"
)

var Enforcer *casbin.Enforcer

const modelText = `
[request_definition]
r = sub, method, urlPath

[policy_definition]
p = sub, method, urlPath

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && (r.method == p.method || p.method == "*") && (keyMatch(r.urlPath, p.urlPath) || p.urlPath == "*")
`

// policyText defines access control rules.
// Roles: admin > user > anonymous (via role hierarchy at the bottom).
// anonymous: paths accessible without login (original exempted list + public endpoints).
// user: paths that require a valid session but not admin privilege.
// admin: full access.
const policyText = `
p, admin, *, *

p, anonymous, *, /api/signin
p, anonymous, *, /api/signout
p, anonymous, *, /api/health
p, anonymous, *, /api/chrome-connect
p, anonymous, *, /api/get-account
p, anonymous, *, /api/update-account
p, anonymous, *, /api/get-signin-options
p, anonymous, *, /api/get-chats
p, anonymous, *, /api/get-forms
p, anonymous, *, /api/get-global-videos
p, anonymous, *, /api/get-videos
p, anonymous, *, /api/get-video
p, anonymous, *, /api/get-messages
p, anonymous, *, /api/delete-welcome-message
p, anonymous, *, /api/get-message-answer
p, anonymous, *, /api/cancel-message-answer
p, anonymous, *, /api/get-answer
p, anonymous, *, /api/get-storage-providers
p, anonymous, *, /api/get-store
p, anonymous, *, /api/get-vector
p, anonymous, *, /api/get-providers
p, anonymous, *, /api/get-provider
p, anonymous, *, /api/get-built-in-site
p, anonymous, *, /api/get-global-stores
p, anonymous, *, /api/get-store-names
p, anonymous, *, /api/get-chat
p, anonymous, *, /api/get-chat-status
p, anonymous, *, /api/get-message
p, anonymous, *, /api/get-tasks
p, anonymous, *, /api/get-task
p, anonymous, *, /api/get-public-scales
p, anonymous, *, /api/update-chat
p, anonymous, *, /api/add-chat
p, anonymous, *, /api/delete-chat
p, anonymous, *, /api/update-message
p, anonymous, *, /api/add-message
p, anonymous, *, /api/update-task
p, anonymous, *, /api/add-task
p, anonymous, *, /api/delete-task
p, anonymous, *, /api/upload-task-document
p, anonymous, *, /api/start-connection
p, anonymous, *, /api/stop-connection
p, anonymous, *, /api/commit-record
p, anonymous, *, /api/commit-record-second
p, anonymous, *, /api/query-record
p, anonymous, *, /api/query-record-second
p, anonymous, *, /api/generate-text-to-speech-audio
p, anonymous, *, /api/generate-text-to-speech-audio-stream
p, anonymous, *, /api/process-speech-to-text
p, anonymous, *, /api/speech-stream
p, anonymous, *, /api/analyze-task
p, anonymous, *, /api/claim-store
p, anonymous, *, /api/is-session-duplicated
p, anonymous, *, /api/add-node-tunnel
p, anonymous, *, /api/chat-webhook/*
p, anonymous, *, /api/get-store-insights-summary
p, anonymous, *, /api/get-store-contributors
p, anonymous, *, /api/get-store-traffic
p, anonymous, *, /api/get-store-cost-series

g, admin, user
g, user, anonymous
`

func InitEnforcer() {
	m, err := model.NewModelFromString(modelText)
	if err != nil {
		panic(err)
	}

	sa := stringadapter.NewAdapter(policyText)
	e, err := casbin.NewEnforcer(m, sa)
	if err != nil {
		panic(err)
	}

	Enforcer = e
}

func IsAllowed(role, method, urlPath string) bool {
	allowed, err := Enforcer.Enforce(role, method, urlPath)
	if err != nil {
		return false
	}
	return allowed
}
