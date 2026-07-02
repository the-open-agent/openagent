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

// Package routers
// @APIVersion 1.70.0
// @Title OpenAgent RESTful API
// @Description Swagger Docs of OpenAgent Backend API
// @Contact admin@openagentai.org
// @SecurityDefinition AccessToken apiKey Authorization header
// @Schemes https,http
// @ExternalDocs Find out more about OpenAgent
// @ExternalDocsUrl https://openagentai.org/
package routers

import (
	"github.com/beego/beego"
	"github.com/the-open-agent/openagent/controllers"
)

func init() {
	initAPI()
}

func initAPI() {
	ns := beego.NewNamespace("/api",
		beego.NSInclude(
			&controllers.ApiController{},
		),
	)
	beego.AddNamespace(ns)

	beego.Router("/api/signin", &controllers.ApiController{}, "POST:Signin")
	beego.Router("/api/signout", &controllers.ApiController{}, "POST:Signout")
	beego.Router("/api/get-account", &controllers.ApiController{}, "GET:GetAccount")
	beego.Router("/api/update-account", &controllers.ApiController{}, "POST:UpdateAccount")
	beego.Router("/api/get-signin-options", &controllers.ApiController{}, "GET:GetSigninOptions")
	beego.Router("/api/chrome-connect", &controllers.ApiController{}, "GET:ChromeConnect")

	beego.Router("/api/get-global-sites", &controllers.ApiController{}, "GET:GetGlobalSites")
	beego.Router("/api/get-sites", &controllers.ApiController{}, "GET:GetSites")
	beego.Router("/api/get-site", &controllers.ApiController{}, "GET:GetSite")
	beego.Router("/api/get-built-in-site", &controllers.ApiController{}, "GET:GetBuiltInSite")
	beego.Router("/api/update-site", &controllers.ApiController{}, "POST:UpdateSite")
	beego.Router("/api/add-site", &controllers.ApiController{}, "POST:AddSite")
	beego.Router("/api/delete-site", &controllers.ApiController{}, "POST:DeleteSite")

	beego.Router("/api/get-hub-stores", &controllers.ApiController{}, "GET:GetHubStores")

	beego.Router("/api/get-global-comments", &controllers.ApiController{}, "GET:GetGlobalComments")
	beego.Router("/api/get-comments", &controllers.ApiController{}, "GET:GetComments")
	beego.Router("/api/get-comment", &controllers.ApiController{}, "GET:GetComment")
	beego.Router("/api/update-comment", &controllers.ApiController{}, "POST:UpdateComment")
	beego.Router("/api/add-comment", &controllers.ApiController{}, "POST:AddComment")
	beego.Router("/api/delete-comment", &controllers.ApiController{}, "POST:DeleteComment")

	beego.Router("/api/get-global-stores", &controllers.ApiController{}, "GET:GetGlobalStores")
	beego.Router("/api/get-stores", &controllers.ApiController{}, "GET:GetStores")
	beego.Router("/api/get-store", &controllers.ApiController{}, "GET:GetStore")
	beego.Router("/api/update-store", &controllers.ApiController{}, "POST:UpdateStore")
	beego.Router("/api/add-store", &controllers.ApiController{}, "POST:AddStore")
	beego.Router("/api/delete-store", &controllers.ApiController{}, "POST:DeleteStore")
	beego.Router("/api/refresh-store-vectors", &controllers.ApiController{}, "POST:RefreshStoreVectors")
	beego.Router("/api/get-storage-providers", &controllers.ApiController{}, "GET:GetStorageProviders")
	beego.Router("/api/get-store-word-cloud", &controllers.ApiController{}, "GET:GetStoreWordCloud")
	beego.Router("/api/get-store-insights-summary", &controllers.ApiController{}, "GET:GetStoreInsightsSummary")
	beego.Router("/api/get-store-contributors", &controllers.ApiController{}, "GET:GetStoreContributors")
	beego.Router("/api/get-store-traffic", &controllers.ApiController{}, "GET:GetStoreTraffic")
	beego.Router("/api/get-store-names", &controllers.ApiController{}, "GET:GetStoreNames")
	beego.Router("/api/get-organization-users", &controllers.ApiController{}, "GET:GetOrganizationUsers")
	beego.Router("/api/add-shared-store", &controllers.ApiController{}, "POST:AddSharedStore")
	beego.Router("/api/fork-store", &controllers.ApiController{}, "POST:ForkStore")
	beego.Router("/api/claim-store", &controllers.ApiController{}, "POST:ClaimStore")

	beego.Router("/api/get-global-providers", &controllers.ApiController{}, "GET:GetGlobalProviders")
	beego.Router("/api/get-providers", &controllers.ApiController{}, "GET:GetProviders")
	beego.Router("/api/get-provider", &controllers.ApiController{}, "GET:GetProvider")
	beego.Router("/api/update-provider", &controllers.ApiController{}, "POST:UpdateProvider")
	beego.Router("/api/add-provider", &controllers.ApiController{}, "POST:AddProvider")
	beego.Router("/api/delete-provider", &controllers.ApiController{}, "POST:DeleteProvider")
	beego.Router("/api/fetch-provider-models", &controllers.ApiController{}, "POST:FetchProviderModels")

	beego.Router("/api/get-global-pipes", &controllers.ApiController{}, "GET:GetGlobalPipes")
	beego.Router("/api/get-pipes", &controllers.ApiController{}, "GET:GetPipes")
	beego.Router("/api/get-pipe", &controllers.ApiController{}, "GET:GetPipe")
	beego.Router("/api/update-pipe", &controllers.ApiController{}, "POST:UpdatePipe")
	beego.Router("/api/add-pipe", &controllers.ApiController{}, "POST:AddPipe")
	beego.Router("/api/delete-pipe", &controllers.ApiController{}, "POST:DeletePipe")
	beego.Router("/api/set-pipe-webhook", &controllers.ApiController{}, "POST:SetPipeWebhook")
	beego.Router("/api/chat-test", &controllers.ApiController{}, "POST:ChatTest")
	beego.Router("/api/chat-webhook/:pipeType/:pipeName", &controllers.ApiController{}, "GET:ChatWebhookVerify;POST:ChatWebhook")

	beego.Router("/api/get-servers", &controllers.ApiController{}, "GET:GetServers")
	beego.Router("/api/get-server", &controllers.ApiController{}, "GET:GetServer")
	beego.Router("/api/update-server", &controllers.ApiController{}, "POST:UpdateServer")
	beego.Router("/api/add-server", &controllers.ApiController{}, "POST:AddServer")
	beego.Router("/api/delete-server", &controllers.ApiController{}, "POST:DeleteServer")
	beego.Router("/api/test-mcp-server", &controllers.ApiController{}, "POST:TestMcpServer")
	beego.Router("/api/sync-mcp-tool", &controllers.ApiController{}, "POST:SyncMcpTool")
	beego.Router("/api/get-online-servers", &controllers.ApiController{}, "GET:GetOnlineServers")
	beego.Router("/api/sync-intranet-servers", &controllers.ApiController{}, "POST:SyncIntranetServers")

	beego.Router("/api/get-global-skills", &controllers.ApiController{}, "GET:GetGlobalSkills")
	beego.Router("/api/get-skills", &controllers.ApiController{}, "GET:GetSkills")
	beego.Router("/api/get-skill", &controllers.ApiController{}, "GET:GetSkill")
	beego.Router("/api/update-skill", &controllers.ApiController{}, "POST:UpdateSkill")
	beego.Router("/api/add-skill", &controllers.ApiController{}, "POST:AddSkill")
	beego.Router("/api/delete-skill", &controllers.ApiController{}, "POST:DeleteSkill")
	beego.Router("/api/load-skill", &controllers.ApiController{}, "GET:LoadSkill")
	beego.Router("/api/get-marketplace-sources", &controllers.ApiController{}, "GET:GetMarketplaceSources")
	beego.Router("/api/get-marketplace-skills", &controllers.ApiController{}, "GET:GetMarketplaceSkills")
	beego.Router("/api/install-marketplace-skill", &controllers.ApiController{}, "POST:InstallMarketplaceSkill")

	beego.Router("/api/get-global-tools", &controllers.ApiController{}, "GET:GetGlobalTools")
	beego.Router("/api/get-tools", &controllers.ApiController{}, "GET:GetTools")
	beego.Router("/api/get-tool", &controllers.ApiController{}, "GET:GetTool")
	beego.Router("/api/update-tool", &controllers.ApiController{}, "POST:UpdateTool")
	beego.Router("/api/add-tool", &controllers.ApiController{}, "POST:AddTool")
	beego.Router("/api/delete-tool", &controllers.ApiController{}, "POST:DeleteTool")
	beego.Router("/api/test-tool", &controllers.ApiController{}, "POST:TestTool")

	beego.Router("/api/get-global-files", &controllers.ApiController{}, "GET:GetGlobalFiles")
	beego.Router("/api/get-files", &controllers.ApiController{}, "GET:GetFiles")
	beego.Router("/api/get-file", &controllers.ApiController{}, "GET:GetFileMy")
	beego.Router("/api/update-file", &controllers.ApiController{}, "POST:UpdateFile")
	beego.Router("/api/add-file", &controllers.ApiController{}, "POST:AddFile")
	beego.Router("/api/delete-file", &controllers.ApiController{}, "POST:DeleteFile")
	beego.Router("/api/refresh-file-vectors", &controllers.ApiController{}, "POST:RefreshFileVectors")
	beego.Router("/api/upload-file", &controllers.ApiController{}, "POST:UploadFile")

	beego.Router("/api/get-global-vectors", &controllers.ApiController{}, "GET:GetGlobalVectors")
	beego.Router("/api/get-vectors", &controllers.ApiController{}, "GET:GetVectors")
	beego.Router("/api/get-vector", &controllers.ApiController{}, "GET:GetVector")
	beego.Router("/api/update-vector", &controllers.ApiController{}, "POST:UpdateVector")
	beego.Router("/api/add-vector", &controllers.ApiController{}, "POST:AddVector")
	beego.Router("/api/delete-vector", &controllers.ApiController{}, "POST:DeleteVector")
	beego.Router("/api/delete-all-vectors", &controllers.ApiController{}, "POST:DeleteAllVectors")

	beego.Router("/api/generate-text-to-speech-audio", &controllers.ApiController{}, "POST:GenerateTextToSpeechAudio")
	beego.Router("/api/generate-text-to-speech-audio-stream", &controllers.ApiController{}, "GET:GenerateTextToSpeechAudioStream")
	beego.Router("/api/process-speech-to-text", &controllers.ApiController{}, "POST:ProcessSpeechToText")
	beego.Router("/api/speech-stream", &controllers.ApiController{}, "GET:SpeechToTextStream")

	beego.Router("/api/get-global-chats", &controllers.ApiController{}, "GET:GetGlobalChats")
	beego.Router("/api/get-chats", &controllers.ApiController{}, "GET:GetChats")
	beego.Router("/api/get-chat", &controllers.ApiController{}, "GET:GetChat")
	beego.Router("/api/get-chat-status", &controllers.ApiController{}, "GET:GetChatStatus")
	beego.Router("/api/update-chat", &controllers.ApiController{}, "POST:UpdateChat")
	beego.Router("/api/add-chat", &controllers.ApiController{}, "POST:AddChat")
	beego.Router("/api/delete-chat", &controllers.ApiController{}, "POST:DeleteChat")

	beego.Router("/api/get-global-messages", &controllers.ApiController{}, "GET:GetGlobalMessages")
	beego.Router("/api/get-messages", &controllers.ApiController{}, "GET:GetMessages")
	beego.Router("/api/get-message", &controllers.ApiController{}, "GET:GetMessage")
	beego.Router("/api/get-message-answer", &controllers.ApiController{}, "GET:GetMessageAnswer")
	beego.Router("/api/cancel-message-answer", &controllers.ApiController{}, "POST:CancelMessageAnswer")
	beego.Router("/api/get-answer", &controllers.ApiController{}, "GET:GetAnswer")
	beego.Router("/api/update-message", &controllers.ApiController{}, "POST:UpdateMessage")
	beego.Router("/api/add-message", &controllers.ApiController{}, "POST:AddMessage")
	beego.Router("/api/delete-message", &controllers.ApiController{}, "POST:DeleteMessage")
	beego.Router("/api/delete-welcome-message", &controllers.ApiController{}, "POST:DeleteWelcomeMessage")

	beego.Router("/api/get-usages", &controllers.ApiController{}, "GET:GetUsages")
	beego.Router("/api/get-range-usages", &controllers.ApiController{}, "GET:GetRangeUsages")
	beego.Router("/api/get-users", &controllers.ApiController{}, "GET:GetUsers")
	beego.Router("/api/get-user-table-infos", &controllers.ApiController{}, "GET:GetUserTableInfos")
	beego.Router("/api/get-usage-providers", &controllers.ApiController{}, "GET:GetUsageProviders")
	beego.Router("/api/get-usage-heatmap", &controllers.ApiController{}, "GET:GetUsageHeatmap")

	beego.Router("/api/get-visitors", &controllers.ApiController{}, "GET:GetVisitors")
	// beego.Router("/api/get-range-visitors", &controllers.ApiController{}, "GET:GetRangeVisitors")

	beego.Router("/api/get-global-tasks", &controllers.ApiController{}, "GET:GetGlobalTasks")
	beego.Router("/api/get-tasks", &controllers.ApiController{}, "GET:GetTasks")
	beego.Router("/api/get-task", &controllers.ApiController{}, "GET:GetTask")
	beego.Router("/api/update-task", &controllers.ApiController{}, "POST:UpdateTask")
	beego.Router("/api/add-task", &controllers.ApiController{}, "POST:AddTask")
	beego.Router("/api/delete-task", &controllers.ApiController{}, "POST:DeleteTask")
	beego.Router("/api/upload-task-document", &controllers.ApiController{}, "POST:UploadTaskDocument")
	beego.Router("/api/analyze-task", &controllers.ApiController{}, "POST:AnalyzeTask")

	beego.Router("/api/get-global-scales", &controllers.ApiController{}, "GET:GetGlobalScales")
	beego.Router("/api/get-scales", &controllers.ApiController{}, "GET:GetScales")
	beego.Router("/api/get-scale", &controllers.ApiController{}, "GET:GetScale")
	beego.Router("/api/get-public-scales", &controllers.ApiController{}, "GET:GetPublicScales")
	beego.Router("/api/update-scale", &controllers.ApiController{}, "POST:UpdateScale")
	beego.Router("/api/add-scale", &controllers.ApiController{}, "POST:AddScale")
	beego.Router("/api/delete-scale", &controllers.ApiController{}, "POST:DeleteScale")

	beego.Router("/api/get-global-forms", &controllers.ApiController{}, "GET:GetGlobalForms")
	beego.Router("/api/get-forms", &controllers.ApiController{}, "GET:GetForms")
	beego.Router("/api/get-form", &controllers.ApiController{}, "GET:GetForm")
	beego.Router("/api/update-form", &controllers.ApiController{}, "POST:UpdateForm")
	beego.Router("/api/add-form", &controllers.ApiController{}, "POST:AddForm")
	beego.Router("/api/delete-form", &controllers.ApiController{}, "POST:DeleteForm")

	beego.Router("/api/get-form-data", &controllers.ApiController{}, "GET:GetFormData")

	beego.Router("/api/add-tree-file", &controllers.ApiController{}, "POST:AddTreeFile")
	beego.Router("/api/delete-tree-file", &controllers.ApiController{}, "POST:DeleteTreeFile")

	beego.Router("/api/get-global-resources", &controllers.ApiController{}, "GET:GetGlobalResources")
	beego.Router("/api/get-resource", &controllers.ApiController{}, "GET:GetResource")
	beego.Router("/api/update-resource", &controllers.ApiController{}, "POST:UpdateResource")
	beego.Router("/api/add-resource", &controllers.ApiController{}, "POST:AddResource")
	beego.Router("/api/delete-resource", &controllers.ApiController{}, "POST:DeleteResource")
	beego.Router("/api/upload-resource", &controllers.ApiController{}, "POST:UploadResource")

	beego.Router("/api/get-permissions", &controllers.ApiController{}, "GET:GetPermissions")
	beego.Router("/api/get-permission", &controllers.ApiController{}, "GET:GetPermission")
	beego.Router("/api/update-permission", &controllers.ApiController{}, "POST:UpdatePermission")
	beego.Router("/api/add-permission", &controllers.ApiController{}, "POST:AddPermission")
	beego.Router("/api/delete-permission", &controllers.ApiController{}, "POST:DeletePermission")

	beego.Router("/api/get-sessions", &controllers.ApiController{}, "GET:GetSessions")
	beego.Router("/api/get-session", &controllers.ApiController{}, "GET:GetSession")
	beego.Router("/api/update-session", &controllers.ApiController{}, "POST:UpdateSession")
	beego.Router("/api/add-session", &controllers.ApiController{}, "POST:AddSession")
	beego.Router("/api/delete-session", &controllers.ApiController{}, "POST:DeleteSession")
	beego.Router("/api/is-session-duplicated", &controllers.ApiController{}, "GET:IsSessionDuplicated")

	beego.Router("/api/get-snapshots", &controllers.ApiController{}, "GET:GetSnapshots")
	beego.Router("/api/get-snapshot", &controllers.ApiController{}, "GET:GetSnapshot")
	beego.Router("/api/rollback-snapshot", &controllers.ApiController{}, "POST:RollbackSnapshot")

	beego.Router("/api/get-records", &controllers.ApiController{}, "GET:GetRecords")
	beego.Router("/api/get-record", &controllers.ApiController{}, "GET:GetRecord")
	beego.Router("/api/update-record", &controllers.ApiController{}, "POST:UpdateRecord")
	beego.Router("/api/add-record", &controllers.ApiController{}, "POST:AddRecord")
	beego.Router("/api/add-records", &controllers.ApiController{}, "POST:AddRecords")
	beego.Router("/api/delete-record", &controllers.ApiController{}, "POST:DeleteRecord")

	beego.Router("/api/commit-record", &controllers.ApiController{}, "POST:CommitRecord")
	beego.Router("/api/commit-record-second", &controllers.ApiController{}, "POST:CommitRecordSecond")
	beego.Router("/api/query-record", &controllers.ApiController{}, "GET:QueryRecord")
	beego.Router("/api/query-record-second", &controllers.ApiController{}, "GET:QueryRecordSecond")

	beego.Router("/api/get-system-info", &controllers.ApiController{}, "GET:GetSystemInfo")
	beego.Router("/api/get-version-info", &controllers.ApiController{}, "GET:GetVersionInfo")
	beego.Router("/api/health", &controllers.ApiController{}, "GET:Health")
	beego.Router("/api/get-prometheus-info", &controllers.ApiController{}, "GET:GetPrometheusInfo")
	beego.Router("/api/metrics", &controllers.ApiController{}, "GET:GetMetrics")

	beego.Router("/api/chat/completions", &controllers.ApiController{}, "POST:ChatCompletions")
	beego.Router("/api/v1/chat/completions", &controllers.ApiController{}, "POST:ChatCompletions")
}
