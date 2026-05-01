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

package object

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/the-open-agent/openagent/agent"
	"github.com/the-open-agent/openagent/auth"
	"github.com/the-open-agent/openagent/chat"
	"github.com/the-open-agent/openagent/embedding"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/scan"
	"github.com/the-open-agent/openagent/storage"
	"github.com/the-open-agent/openagent/stt"
	"github.com/the-open-agent/openagent/tts"
	"github.com/the-open-agent/openagent/util"
	"xorm.io/core"
	"xorm.io/xorm"
)

type Provider struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`

	DisplayName        string            `xorm:"varchar(100)" json:"displayName"`
	DisplayName2       string            `xorm:"varchar(100)" json:"displayName2"`
	Category           string            `xorm:"varchar(100)" json:"category"`
	Type               string            `xorm:"varchar(100)" json:"type"`
	SubType            string            `xorm:"varchar(100)" json:"subType"`
	Flavor             string            `xorm:"varchar(100)" json:"flavor"`
	ClientId           string            `xorm:"varchar(100)" json:"clientId"`
	ClientSecret       string            `xorm:"varchar(2000)" json:"clientSecret"`
	Region             string            `xorm:"varchar(100)" json:"region"`
	ProviderKey        string            `xorm:"varchar(100)" json:"providerKey"`
	ProviderUrl        string            `xorm:"varchar(200)" json:"providerUrl"`
	ApiVersion         string            `xorm:"varchar(100)" json:"apiVersion"`
	CompatibleProvider string            `xorm:"varchar(100)" json:"compatibleProvider"`
	Domain             string            `xorm:"varchar(200)" json:"domain"`
	McpTools           []*agent.McpTools `xorm:"text" json:"mcpTools"`
	Text               string            `xorm:"mediumtext" json:"text"`
	ConfigText         string            `xorm:"mediumtext" json:"configText"`
	RawText            string            `xorm:"mediumtext" json:"rawText"` // Raw result from scan (for Scan category providers)

	EnableThinking   bool    `json:"enableThinking"`
	Temperature      float32 `xorm:"float" json:"temperature"`
	TopP             float32 `xorm:"float" json:"topP"`
	TopK             int     `xorm:"int" json:"topK"`
	FrequencyPenalty float32 `xorm:"float" json:"frequencyPenalty"`
	PresencePenalty  float32 `xorm:"float" json:"presencePenalty"`

	InputPricePerThousandTokens  float64 `xorm:"DECIMAL(10, 4)" json:"inputPricePerThousandTokens"`
	OutputPricePerThousandTokens float64 `xorm:"DECIMAL(10, 4)" json:"outputPricePerThousandTokens"`
	Currency                     string  `xorm:"varchar(100)" json:"currency"`

	UserKey        string `xorm:"varchar(1000)" json:"userKey"`
	UserCert       string `xorm:"mediumtext" json:"userCert"`
	SignKey        string `xorm:"varchar(1000)" json:"signKey"`
	SignCert       string `xorm:"mediumtext" json:"signCert"`
	ContractName   string `xorm:"varchar(100)" json:"contractName"`
	ContractMethod string `xorm:"varchar(100)" json:"contractMethod"`
	Network        string `xorm:"varchar(100)" json:"network"`
	Chain          string `xorm:"varchar(100)" json:"chain"`
	TestContent    string `xorm:"varchar(500)" json:"testContent"`
	ModelProvider  string `xorm:"varchar(100)" json:"modelProvider"`

	// New fields for unified scan widget (for Scan category providers)
	TargetMode    string `xorm:"varchar(100)" json:"targetMode"`    // "Manual Input" or "Asset"
	Target        string `xorm:"varchar(500)" json:"target"`        // Manual input target (IP address or network range)
	Asset         string `xorm:"varchar(200)" json:"asset"`         // Selected asset for scan
	Runner        string `xorm:"varchar(100)" json:"runner"`        // Hostname about who runs the scan job
	ErrorText     string `xorm:"mediumtext" json:"errorText"`       // Error message for the job execution
	ResultSummary string `xorm:"varchar(500)" json:"resultSummary"` // Short summary of scan results

	EnableProxy bool   `json:"enableProxy"`
	IsDefault   bool   `json:"isDefault"`
	IsRemote    bool   `json:"isRemote"`
	State       string `xorm:"varchar(100)" json:"state"`
	BrowserUrl  string `xorm:"varchar(200)" json:"browserUrl"`
}

func GetMaskedProvider(provider *Provider, isMaskEnabled bool, user *auth.User) *Provider {
	if !isMaskEnabled {
		return provider
	}

	if provider == nil {
		return nil
	}

	if provider.ClientSecret != "" {
		provider.ClientSecret = "***"
	}

	if !util.IsAdmin(user) {
		if provider.ProviderKey != "" {
			provider.ProviderKey = "***"
		}
		if provider.UserKey != "" {
			provider.UserKey = "***"
		}
		if provider.ConfigText != "" {
			provider.ConfigText = "***"
		}
		if provider.SignKey != "" {
			provider.SignKey = "***"
		}
	}

	return provider
}

func GetMaskedProviders(providers []*Provider, isMaskEnabled bool, user *auth.User) []*Provider {
	if !isMaskEnabled {
		return providers
	}

	for _, provider := range providers {
		provider = GetMaskedProvider(provider, isMaskEnabled, user)
	}
	return providers
}

func GetGlobalProviders() ([]*Provider, error) {
	providers := []*Provider{}
	err := adapter.engine.Asc("owner").Desc("created_time").Find(&providers)
	if err != nil {
		return providers, err
	}

	if providerAdapter != nil {
		providers2 := []*Provider{}
		err = providerAdapter.engine.Asc("owner").Desc("created_time").Find(&providers2)
		if err != nil {
			return providers2, err
		}

		// Mark remote providers
		for _, provider := range providers2 {
			provider.IsRemote = true
		}

		providers = append(providers, providers2...)
	}

	return providers, nil
}

func GetProviders(owner string) ([]*Provider, error) {
	providers := []*Provider{}
	err := adapter.engine.Desc("created_time").Find(&providers, &Provider{Owner: owner})
	if err != nil {
		return providers, err
	}

	if providerAdapter != nil {
		providers2 := []*Provider{}
		err = providerAdapter.engine.Desc("created_time").Find(&providers2, &Provider{Owner: owner})
		if err != nil {
			return providers2, err
		}

		// Mark remote providers
		for _, provider := range providers2 {
			provider.IsRemote = true
		}

		providers = append(providers, providers2...)
	}

	return providers, nil
}

func getProvider(owner string, name string) (*Provider, error) {
	provider := Provider{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(&provider)
	if err != nil {
		return &provider, err
	}

	if providerAdapter != nil && !existed {
		existed, err = providerAdapter.engine.Get(&provider)
		if err != nil {
			return &provider, err
		}
		if existed {
			provider.IsRemote = true
		}
	}

	if existed {
		return &provider, nil
	} else {
		return nil, nil
	}
}

func GetProvider(id string) (*Provider, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	return getProvider(owner, name)
}

// GetProviderByOwnerAndName resolves a provider row from either a full id (owner/name) or a short name.
// Short names are looked up under owner first, then under admin when missing (built-in and shared providers are created under admin).
func GetProviderByOwnerAndName(owner string, nameOrId string) (*Provider, error) {
	if nameOrId == "" {
		return nil, nil
	}
	var id string
	if _, _, err := util.GetOwnerAndNameFromIdWithError(nameOrId); err == nil {
		id = nameOrId
	} else {
		id = util.GetIdFromOwnerAndName(owner, nameOrId)
	}
	p, err := GetProvider(id)
	if err != nil {
		return nil, err
	}
	if p != nil {
		return p, nil
	}
	if owner != "admin" && !strings.Contains(nameOrId, "/") {
		return GetProvider(util.GetIdFromOwnerAndName("admin", nameOrId))
	}
	return nil, nil
}

func UpdateProvider(id string, provider *Provider) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	providerDb, err := getProvider(owner, name)
	if err != nil {
		return false, err
	}
	if provider == nil {
		return false, nil
	}

	provider.processProviderParams(providerDb)

	if providerAdapter != nil && provider.IsRemote {
		_, err = providerAdapter.engine.ID(core.PK{owner, name}).AllCols().Update(provider)
		if err != nil {
			return false, err
		}

		// return affected != 0
		return true, nil
	}

	_, err = adapter.engine.ID(core.PK{owner, name}).AllCols().Update(provider)
	if err != nil {
		return false, err
	}

	// return affected != 0
	return true, nil
}

func AddProvider(provider *Provider) (bool, error) {
	if provider.ProviderKey == "" && provider.Category == "Model" {
		provider.ProviderKey = generateProviderKey()
	}

	if providerAdapter != nil && provider.IsRemote {
		affected, err := providerAdapter.engine.Insert(provider)
		if err != nil {
			return false, err
		}

		return affected != 0, nil
	}

	affected, err := adapter.engine.Insert(provider)
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

func DeleteProvider(provider *Provider) (bool, error) {
	if providerAdapter != nil && provider.IsRemote {
		affected, err := providerAdapter.engine.ID(core.PK{provider.Owner, provider.Name}).Delete(&Provider{})
		if err != nil {
			return false, err
		}

		return affected != 0, nil
	}

	affected, err := adapter.engine.ID(core.PK{provider.Owner, provider.Name}).Delete(&Provider{})
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

func (provider *Provider) GetId() string {
	return fmt.Sprintf("%s/%s", provider.Owner, provider.Name)
}

func GetDefaultKubernetesProvider(lang string) (*Provider, error) {
	providers, err := GetProviders("admin")
	if err != nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:failed to get providers: %v"), err)
	}

	for _, provider := range providers {
		if provider.Category == "Private Cloud" && provider.Type == "Kubernetes" && provider.State == "Active" {
			return provider, nil
		}
	}
	return nil, fmt.Errorf(i18n.Translate(lang, "object:no Kubernetes provider found"))
}

func (p *Provider) GetStorageProviderObj(vectorStoreId string, lang string) (storage.StorageProvider, error) {
	pProvider, err := storage.GetStorageProvider(p.Type, p.ClientId, p.ClientSecret, p.Name, vectorStoreId, lang)
	if err != nil {
		return nil, err
	}

	if pProvider == nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:the storage provider type: %s is not supported"), p.Type)
	}

	return pProvider, nil
}

func (p *Provider) GetModelProvider(lang string) (model.ModelProvider, error) {
	pProvider, err := model.GetModelProvider(p.Type, p.SubType, p.ClientId, p.ClientSecret, p.UserKey, p.Temperature, p.TopP, p.TopK, p.FrequencyPenalty, p.PresencePenalty, p.ProviderUrl, p.ApiVersion, p.CompatibleProvider, p.InputPricePerThousandTokens, p.OutputPricePerThousandTokens, p.Currency, p.EnableThinking)
	if err != nil {
		return nil, err
	}

	if pProvider == nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:the model provider type: %s is not supported"), p.Type)
	}

	return pProvider, nil
}

func (p *Provider) GetEmbeddingProvider(lang string) (embedding.EmbeddingProvider, error) {
	pProvider, err := embedding.GetEmbeddingProvider(p.Type, p.SubType, p.ClientId, p.ClientSecret, p.ProviderUrl, p.ApiVersion, p.InputPricePerThousandTokens, p.Currency, lang)
	if err != nil {
		return nil, err
	}

	if pProvider == nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:the embedding provider type: %s is not supported"), p.Type)
	}

	return pProvider, nil
}

func (p *Provider) GetAgentProvider(lang string) (agent.AgentProvider, error) {
	pProvider, err := agent.GetAgentProvider(p.Type, p.SubType, p.Text, p.McpTools, lang)
	if err != nil {
		return nil, err
	}

	if pProvider == nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "agent:the agent provider type: %s is not supported"), p.Type)
	}

	return pProvider, nil
}

func (p *Provider) GetTextToSpeechProvider(lang string) (tts.TextToSpeechProvider, error) {
	pProvider, err := tts.GetTextToSpeechProvider(p.Type, p.SubType, p.ClientId, p.ClientSecret, p.ProviderUrl, p.ApiVersion, p.InputPricePerThousandTokens, p.Currency, p.Flavor, lang)
	if err != nil {
		return nil, err
	}

	if pProvider == nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:the TTS provider type: %s is not supported"), p.Type)
	}

	return pProvider, nil
}

func (p *Provider) GetSpeechToTextProvider(lang string) (stt.SpeechToTextProvider, error) {
	pProvider, err := stt.GetSpeechToTextProvider(p.Type, p.SubType, p.ClientSecret, p.ProviderUrl)
	if err != nil {
		return nil, err
	}

	if pProvider == nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:the STT provider type: %s is not supported"), p.Type)
	}

	return pProvider, nil
}

func (p *Provider) GetChatProvider(lang string) (chat.ChatProvider, error) {
	pProvider, err := chat.GetChatProvider(p.Type, p.ClientSecret, lang)
	if err != nil {
		return nil, err
	}

	if pProvider == nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:the chat provider type: %s is not supported"), p.Type)
	}

	return pProvider, nil
}

func (p *Provider) GetScanProvider(lang string) (scan.ScanProvider, error) {
	pProvider, err := scan.GetScanProvider(p.Type, p.ClientId, lang)
	if err != nil {
		return nil, err
	}

	if pProvider == nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:the scan provider type: %s is not supported"), p.Type)
	}

	return pProvider, nil
}

func GetModelProviderFromContext(owner string, name string, lang string) (*Provider, model.ModelProvider, error) {
	var providerName string
	if name != "" {
		providerName = name
	} else {
		store, err := GetDefaultStore(owner)
		if err != nil {
			return nil, nil, err
		}

		if store != nil && store.ModelProvider != "" {
			providerName = store.ModelProvider
		}
	}

	return getModelProviderFromName(owner, providerName, lang)
}

func GetEmbeddingProviderFromContext(owner string, name string, lang string) (*Provider, embedding.EmbeddingProvider, error) {
	var providerName string
	if name != "" {
		providerName = name
	} else {
		store, err := GetDefaultStore(owner)
		if err != nil {
			return nil, nil, err
		}

		if store != nil && store.EmbeddingProvider != "" {
			providerName = store.EmbeddingProvider
		}
	}

	return getEmbeddingProviderFromName(owner, providerName, lang)
}

func GetAgentProviderFromContext(owner string, name string, lang string) (*Provider, agent.AgentProvider, error) {
	var providerName string
	if name != "" {
		providerName = name
	} else {
		store, err := GetDefaultStore(owner)
		if err != nil {
			return nil, nil, err
		}

		if store != nil && store.AgentProvider != "" {
			providerName = store.AgentProvider
		}
	}

	return getAgentProviderFromName(owner, providerName, lang)
}

func GetAgentClients(agentProviderObj agent.AgentProvider) (*agent.AgentClients, error) {
	if agentProviderObj == nil {
		return nil, nil
	}
	return agentProviderObj.GetAgentClients()
}

func GetProviderCount(owner, storeName, field, value string) (int64, error) {
	session := GetDbSession(owner, -1, -1, field, value, "", "")
	if storeName != "" {
		store, err := ResolveStoreFromId(util.GetIdFromOwnerAndName(owner, storeName))
		if err != nil {
			return 0, err
		}
		providerNames := collectProviderNames(store)
		if len(providerNames) > 0 {
			session = session.In("name", providerNames)
		}
	}
	count, err := session.Count(&Provider{})
	if err != nil {
		return 0, err
	}

	// Add count from remote adapter if available
	if providerAdapter != nil {
		session2, err := buildRemoteProviderSession(owner, field, value, storeName)
		if err != nil {
			return count, err
		}
		count2, err := session2.Count(&Provider{})
		if err != nil {
			return count, err
		}
		count += count2
	}

	return count, nil
}

func collectProviderNames(store *Store) []string {
	var providerNames []string

	if store.StorageProvider != "" {
		providerNames = append(providerNames, store.StorageProvider)
	}
	if store.ImageProvider != "" {
		providerNames = append(providerNames, store.ImageProvider)
	}
	if store.SplitProvider != "" {
		providerNames = append(providerNames, store.SplitProvider)
	}
	if store.SearchProvider != "" {
		providerNames = append(providerNames, store.SearchProvider)
	}
	if store.ModelProvider != "" {
		providerNames = append(providerNames, store.ModelProvider)
	}
	if store.EmbeddingProvider != "" {
		providerNames = append(providerNames, store.EmbeddingProvider)
	}
	if store.TextToSpeechProvider != "" {
		providerNames = append(providerNames, store.TextToSpeechProvider)
	}
	if store.SpeechToTextProvider != "" {
		providerNames = append(providerNames, store.SpeechToTextProvider)
	}
	if store.AgentProvider != "" {
		providerNames = append(providerNames, store.AgentProvider)
	}
	if store.ChildModelProviders != nil {
		providerNames = append(providerNames, store.ChildModelProviders...)
	}

	return providerNames
}

func buildRemoteProviderSession(owner, field, value, storeName string) (*xorm.Session, error) {
	if providerAdapter == nil {
		return nil, fmt.Errorf("providerAdapter is nil")
	}
	session := providerAdapter.engine.NewSession()
	if owner != "" {
		session = session.And("owner=?", owner)
	}
	if field != "" && value != "" {
		if util.FilterField(field) {
			session = session.And(fmt.Sprintf("%s like ?", util.SnakeString(field)), fmt.Sprintf("%%%s%%", value))
		}
	}
	if storeName != "" {
		store, err := ResolveStoreFromId(util.GetIdFromOwnerAndName(owner, storeName))
		if err != nil {
			return nil, err
		}
		providerNames := collectProviderNames(store)
		if len(providerNames) > 0 {
			session = session.In("name", providerNames)
		}
	}
	return session, nil
}

func GetPaginationProviders(owner, storeName string, offset, limit int, field, value, sortField, sortOrder string) ([]*Provider, error) {
	providers := []*Provider{}
	// Fetch from local adapter without pagination to properly merge with remote providers
	session := GetDbSession(owner, -1, -1, field, value, sortField, sortOrder)
	if storeName != "" {
		store, err := ResolveStoreFromId(util.GetIdFromOwnerAndName(owner, storeName))
		if err != nil {
			return providers, err
		}
		providerNames := collectProviderNames(store)
		if len(providerNames) > 0 {
			session = session.In("name", providerNames)
		}
	}

	err := session.Find(&providers)
	if err != nil {
		return providers, err
	}

	// Fetch from remote adapter if available
	if providerAdapter != nil {
		providers2 := []*Provider{}
		session2, err := buildRemoteProviderSession(owner, field, value, storeName)
		if err != nil {
			return providers, err
		}
		// Apply same sort order to remote providers
		sortFieldToUse := sortField
		if sortFieldToUse == "" {
			sortFieldToUse = "created_time"
		}
		if sortOrder == "ascend" {
			session2 = session2.Asc(util.SnakeString(sortFieldToUse))
		} else {
			session2 = session2.Desc(util.SnakeString(sortFieldToUse))
		}

		err = session2.Find(&providers2)
		if err != nil {
			return providers, err
		}

		// Mark remote providers
		for _, provider := range providers2 {
			provider.IsRemote = true
		}

		// Append remote providers after local providers
		providers = append(providers, providers2...)
	}

	// Apply pagination on merged results
	if offset != -1 && limit != -1 {
		start := offset
		end := offset + limit
		if start >= len(providers) {
			return []*Provider{}, nil
		}
		if end > len(providers) {
			end = len(providers)
		}
		providers = providers[start:end]
	}

	return providers, nil
}

func RefreshMcpTools(provider *Provider) error {
	tools, err := agent.GetToolsList(provider.Text)
	if err != nil {
		return err
	}

	provider.McpTools = tools
	return nil
}

// TestMcpProvider parses provider.testContent as {"tool":"...","arguments":{}} and invokes one MCP tools/call.
func TestMcpProvider(p *Provider, lang string) (string, error) {
	if p.Category != "Agent" || p.Type != "MCP" {
		return "", fmt.Errorf(i18n.Translate(lang, "object:provider is not an MCP agent provider"))
	}
	if strings.TrimSpace(p.Text) == "" {
		return "", fmt.Errorf("MCP servers configuration (text) is empty")
	}
	var payload struct {
		Tool      string                 `json:"tool"`
		Arguments map[string]interface{} `json:"arguments"`
	}
	if err := json.Unmarshal([]byte(p.TestContent), &payload); err != nil {
		return "", fmt.Errorf(i18n.Translate(lang, "object:invalid MCP test JSON in testContent: %v"), err)
	}
	if strings.TrimSpace(payload.Tool) == "" {
		return "", fmt.Errorf(i18n.Translate(lang, "object:MCP test JSON must include non-empty \"tool\""))
	}
	if payload.Arguments == nil {
		payload.Arguments = map[string]interface{}{}
	}
	return agent.TestMcpToolCall(p.Text, p.McpTools, payload.Tool, payload.Arguments)
}

func (p *Provider) processProviderParams(providerDb *Provider) {
	if p.ClientSecret == "***" {
		p.ClientSecret = providerDb.ClientSecret
	}
	if p.UserKey == "***" {
		p.UserKey = providerDb.UserKey
	}
	if p.SignKey == "***" {
		p.SignKey = providerDb.SignKey
	}
	if p.ProviderKey == "" && p.Category == "Model" {
		p.ProviderKey = generateProviderKey()
	}

	if p.Type == "Ollama" && p.ProviderUrl != "" && !strings.HasPrefix(p.ProviderUrl, "http") {
		p.ProviderUrl = "http://" + p.ProviderUrl
	}
	if p.Category == "Model" && p.Type == "OpenAI" && (strings.Contains(p.SubType, "o1") || strings.Contains(p.SubType, "o3") || strings.Contains(p.SubType, "o4")) {
		p.Temperature = 1
		p.TopP = 1
		p.FrequencyPenalty = 0
		p.PresencePenalty = 0
	}
}
