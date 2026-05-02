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
	"fmt"
	"strings"
	"time"

	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/storage"
	"github.com/the-open-agent/openagent/util"
	"xorm.io/core"
)

type TreeFile struct {
	Key         string      `xorm:"varchar(100)" json:"key"`
	Title       string      `xorm:"varchar(100)" json:"title"`
	Size        int64       `json:"size"`
	CreatedTime string      `xorm:"varchar(100)" json:"createdTime"`
	IsLeaf      bool        `json:"isLeaf"`
	Url         string      `xorm:"varchar(255)" json:"url"`
	Children    []*TreeFile `xorm:"varchar(1000)" json:"children"`

	ChildrenMap map[string]*TreeFile `xorm:"-" json:"-"`
}

type Properties struct {
	CollectedTime string `xorm:"varchar(100)" json:"collectedTime"`
	Subject       string `xorm:"varchar(100)" json:"subject"`
}

type UsageInfo struct {
	Provider   string    `xorm:"varchar(100)" json:"provider"`
	TokenCount int       `json:"tokenCount"`
	StartTime  time.Time `xorm:"created" json:"startTime"`
}

type ExampleQuestion struct {
	Title string `json:"title"`
	Text  string `json:"text"`
	Image string `json:"image"`
}

type Store struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk index(idx_store_name_created)" json:"name"`
	CreatedTime string `xorm:"varchar(100) index(idx_store_name_created)" json:"createdTime"`
	DisplayName string `xorm:"varchar(100)" json:"displayName"`

	StorageProvider      string   `xorm:"varchar(100)" json:"storageProvider"`
	StorageSubpath       string   `xorm:"varchar(100)" json:"storageSubpath"`
	ImageProvider        string   `xorm:"varchar(100)" json:"imageProvider"`
	SplitProvider        string   `xorm:"varchar(100)" json:"splitProvider"`
	SearchProvider       string   `xorm:"varchar(100)" json:"searchProvider"`
	ModelProvider        string   `xorm:"varchar(100)" json:"modelProvider"`
	EmbeddingProvider    string   `xorm:"varchar(100)" json:"embeddingProvider"`
	TextToSpeechProvider string   `xorm:"varchar(100)" json:"textToSpeechProvider"`
	EnableTtsStreaming   bool     `xorm:"bool" json:"enableTtsStreaming"`
	SpeechToTextProvider string   `xorm:"varchar(100)" json:"speechToTextProvider"`
	AgentProvider        string   `xorm:"varchar(100)" json:"agentProvider"`
	Tools                []string `xorm:"mediumtext" json:"tools"`
	VectorStoreId        string   `xorm:"varchar(100)" json:"vectorStoreId"`
	BuiltinTools         []string `xorm:"varchar(500)" json:"builtinTools"`

	MemoryLimit         int               `json:"memoryLimit"`
	Frequency           int               `json:"frequency"`
	LimitMinutes        int               `json:"limitMinutes"`
	KnowledgeCount      int               `json:"knowledgeCount"`
	SuggestionCount     int               `json:"suggestionCount"`
	Welcome             string            `xorm:"varchar(100)" json:"welcome"`
	WelcomeTitle        string            `xorm:"varchar(100)" json:"welcomeTitle"`
	WelcomeText         string            `xorm:"varchar(100)" json:"welcomeText"`
	Prompt              string            `xorm:"mediumtext" json:"prompt"`
	ExampleQuestions    []ExampleQuestion `xorm:"mediumtext" json:"exampleQuestions"`
	Avatar              string            `xorm:"varchar(200)" json:"avatar"`
	Title               string            `xorm:"varchar(100)" json:"title"`
	VectorStores        []string          `xorm:"mediumtext" json:"vectorStores"`
	ChildStores         []string          `xorm:"mediumtext" json:"childStores"`
	ChildModelProviders []string          `xorm:"mediumtext" json:"childModelProviders"`
	ForbiddenWords      []string          `xorm:"text" json:"forbiddenWords"`
	Owners              []string          `xorm:"mediumtext" json:"owners"`
	ShowAutoRead        bool              `json:"showAutoRead"`
	DisableFileUpload   bool              `json:"disableFileUpload"`
	HideThinking        bool              `json:"hideThinking"`
	EnableExtraOptions  bool              `json:"enableExtraOptions"`
	IsDefault           bool              `json:"isDefault"`
	State               string            `xorm:"varchar(100)" json:"state"`
	SharedBy            string            `xorm:"varchar(100)" json:"sharedBy"`

	ChatCount    int `xorm:"-" json:"chatCount"`
	MessageCount int `xorm:"-" json:"messageCount"`
	VectorCount  int `xorm:"-" json:"vectorCount"`

	FileTree      *TreeFile              `xorm:"mediumtext" json:"fileTree"`
	PropertiesMap map[string]*Properties `xorm:"mediumtext" json:"propertiesMap"`
}

// GetGlobalStores loads every row in the store table (admin UI / init). Not for hot per-request paths.
func GetGlobalStores() ([]*Store, error) {
	stores := []*Store{}
	err := adapter.engine.Asc("owner").Desc("created_time").Find(&stores)
	if err != nil {
		return stores, err
	}

	return stores, nil
}

func GetStores(owner string) ([]*Store, error) {
	stores := []*Store{}
	err := adapter.engine.Desc("created_time").Where("owner = ? OR owner = ?", owner, "admin").Find(&stores)
	if err != nil {
		return stores, err
	}

	return stores, nil
}

func GetDefaultStore(owner string) (*Store, error) {
	stores, err := GetStores(owner)
	if err != nil {
		return nil, err
	}

	for _, store := range stores {
		if store.IsDefault {
			return store, nil
		}
	}

	// GetStores orders by created_time DESC — first Active row is the newest active store.
	for _, store := range stores {
		if store.State == "Active" {
			return store, nil
		}
	}

	if len(stores) > 0 {
		return stores[0], nil
	}

	return nil, nil
}

// ResolveStoreFromId loads a store by id, then applies GetStoreForGetApi fallback so chat rows
// (owner "admin" + store name) still resolve when the store row is owned by a store admin user.
func ResolveStoreFromId(id string) (*Store, error) {
	store, err := GetStore(id)
	if err != nil {
		return nil, err
	}
	if store != nil {
		return store, nil
	}
	// Do not call GetStoreForGetApi here: it would repeat the same GetStore query.
	return resolveStoreWhenAdminIdMisses(id)
}

// ResolveStoreByOwnerAndName resolves owner/name like ResolveStoreFromId.
func ResolveStoreByOwnerAndName(owner string, storeName string) (*Store, error) {
	if storeName == "" {
		return nil, nil
	}
	return ResolveStoreFromId(util.GetIdFromOwnerAndName(owner, storeName))
}

// ResolveStoreForChat resolves the store referenced by a chat (same semantics as ResolveStoreByOwnerAndName).
func ResolveStoreForChat(chat *Chat) (*Store, error) {
	if chat == nil {
		return nil, nil
	}
	return ResolveStoreByOwnerAndName(chat.Owner, chat.Store)
}

func getStore(owner string, name string) (*Store, error) {
	store := Store{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(&store)
	if err != nil {
		return &store, err
	}

	if existed {
		return &store, nil
	}

	return nil, nil
}

func GetStore(id string) (*Store, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	return getStore(owner, name)
}

// resolveStoreWhenAdminIdMisses is used when owner/name is "admin/<storeName>" but no row matches:
// return the newest row with that store name under any owner (chat rows keep owner "admin").
// Uses WHERE name = ? ORDER BY created_time DESC — relies on composite index idx_store_name_created (see Store xorm tags).
func resolveStoreWhenAdminIdMisses(id string) (*Store, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil || name == "" || owner != "admin" {
		return nil, nil
	}
	var s Store
	has, err := adapter.engine.Where("name = ?", name).Desc("created_time").Get(&s)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, nil
	}
	return &s, nil
}

// GetStoreForGetApi resolves owner/name like GetStore. If there is no row for that exact pair
// and the owner segment is "admin", returns the newest store with the same name under any owner.
// This fixes links that incorrectly use admin as the owner while the store belongs to another user.
func GetStoreForGetApi(id string) (*Store, error) {
	store, err := GetStore(id)
	if err != nil {
		return nil, err
	}
	if store != nil {
		return store, nil
	}
	return resolveStoreWhenAdminIdMisses(id)
}

func UpdateStore(id string, store *Store) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	_, err = getStore(owner, name)
	if err != nil {
		return false, err
	}
	if store == nil {
		return false, nil
	}

	_, err = adapter.engine.ID(core.PK{owner, name}).AllCols().Update(store)
	if err != nil {
		return false, err
	}

	// return affected != 0
	return true, nil
}

func AddStore(store *Store) (bool, error) {
	affected, err := adapter.engine.Insert(store)
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

func DeleteStore(store *Store) (bool, error) {
	affected, err := adapter.engine.ID(core.PK{store.Owner, store.Name}).Delete(&Store{})
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

func (store *Store) GetId() string {
	return fmt.Sprintf("%s/%s", store.Owner, store.Name)
}

func (store *Store) GetStorageProviderObj(lang string) (storage.StorageProvider, error) {
	var provider *Provider
	var err error
	if store.StorageProvider == "" {
		provider, err = GetDefaultStorageProvider()
	} else {
		provider, err = GetProviderByOwnerAndName(store.Owner, store.StorageProvider)
	}
	if err != nil {
		return nil, err
	}

	var storageProvider storage.StorageProvider
	if provider != nil {
		storageProvider, err = provider.GetStorageProviderObj(store.VectorStoreId, lang)
		if err != nil {
			return nil, err
		}
	} else {
		storageProvider, err = storage.NewCasdoorProvider(store.StorageProvider, lang)
		if err != nil {
			return nil, err
		}
	}

	return NewSubpathStorageProvider(storageProvider, store.StorageSubpath), nil
}

func (store *Store) GetImageProviderObj(lang string) (storage.StorageProvider, error) {
	if store.ImageProvider == "" {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:The image provider for store: %s should not be empty"), store.GetId())
	}

	if conf.IsCasdoorAvailable() {
		return storage.NewCasdoorProvider(store.ImageProvider, lang)
	}

	provider, err := GetProviderByOwnerAndName(store.Owner, store.ImageProvider)
	if err != nil {
		return nil, err
	}
	if provider == nil {
		return nil, fmt.Errorf(i18n.Translate(lang, "object:The image provider for store: %s should not be empty"), store.GetId())
	}
	return provider.GetStorageProviderObj("", lang)
}

func (store *Store) GetModelProvider() (*Provider, error) {
	if store.ModelProvider == "" {
		return GetDefaultModelProvider()
	}

	return GetProviderByOwnerAndName(store.Owner, store.ModelProvider)
}

func (store *Store) GetTextToSpeechProvider() (*Provider, error) {
	if store.TextToSpeechProvider == "" {
		return GetDefaultTextToSpeechProvider()
	}

	return GetProviderByOwnerAndName(store.Owner, store.TextToSpeechProvider)
}

func (store *Store) GetSpeechToTextProvider() (*Provider, error) {
	if store.SpeechToTextProvider == "" {
		return GetDefaultSpeechToTextProvider()
	}

	return GetProviderByOwnerAndName(store.Owner, store.SpeechToTextProvider)
}

func (store *Store) GetEmbeddingProvider() (*Provider, error) {
	if store.EmbeddingProvider == "" {
		return GetDefaultEmbeddingProvider()
	}

	return GetProviderByOwnerAndName(store.Owner, store.EmbeddingProvider)
}

func RefreshStoreVectors(store *Store, lang string) (bool, error) {
	storageProviderObj, err := store.GetStorageProviderObj(lang)
	if err != nil {
		return false, err
	}

	modelProvider, err := store.GetModelProvider()
	if err != nil {
		return false, err
	}
	if modelProvider == nil {
		return false, fmt.Errorf(i18n.Translate(lang, "object:The model provider for store: %s is not found"), store.GetId())
	}

	embeddingProvider, err := store.GetEmbeddingProvider()
	if err != nil {
		return false, err
	}
	if embeddingProvider == nil {
		return false, fmt.Errorf(i18n.Translate(lang, "object:The embedding provider for store: %s is not found"), store.GetId())
	}

	embeddingProviderObj, err := embeddingProvider.GetEmbeddingProvider(lang)
	if err != nil {
		return false, err
	}

	err = UpdateFilesStatusByStore(store.Owner, store.Name, FileStatusPending)
	if err != nil {
		return false, err
	}

	_, err = DeleteVectorsByStore(store.Owner, store.Name)
	if err != nil {
		return false, err
	}

	ok, err := addVectorsForStore(storageProviderObj, embeddingProviderObj, "", store.Owner, store.Name, store.SplitProvider, embeddingProvider.Name, modelProvider.SubType, lang)
	return ok, err
}

func AddVectorsForFile(store *Store, fileName string, fileUrl string, lang string) (bool, error) {
	modelProvider, err := store.GetModelProvider()
	if err != nil {
		return false, err
	}
	if modelProvider == nil {
		return false, fmt.Errorf(i18n.Translate(lang, "object:The model provider for store: %s is not found"), store.GetId())
	}

	embeddingProvider, err := store.GetEmbeddingProvider()
	if err != nil {
		return false, err
	}
	if embeddingProvider == nil {
		return false, fmt.Errorf(i18n.Translate(lang, "object:The embedding provider for store: %s is not found"), store.GetId())
	}

	embeddingProviderObj, err := embeddingProvider.GetEmbeddingProvider(lang)
	if err != nil {
		return false, err
	}

	ok, err := withFileStatus(store.Owner, store.Name, fileName, func() (bool, int, error) {
		return addVectorsForFile(embeddingProviderObj, store.Name, fileName, fileUrl, store.SplitProvider, embeddingProvider.Name, modelProvider.SubType, lang)
	})

	return ok, err
}

func RefreshFileVectors(file *File, lang string) (bool, error) {
	store, err := getStore(file.Owner, file.Store)
	if err != nil {
		return false, err
	}
	if store == nil {
		return false, fmt.Errorf(i18n.Translate(lang, "account:The store: %s is not found"), file.Store)
	}

	var objectKey string
	prefix := fmt.Sprintf("%s_", file.Store)
	if strings.HasPrefix(file.Name, prefix) {
		objectKey = strings.TrimPrefix(file.Name, prefix)
	} else {
		objectKey = file.Name
	}
	if objectKey == "" {
		return false, fmt.Errorf(i18n.Translate(lang, "object:The file: %s is not found"), file.Name)
	}

	if file.Url == "" {
		return false, fmt.Errorf(i18n.Translate(lang, "object:The file URL for: %s is empty"), file.Name)
	}

	_, err = DeleteVectorsByFile(store.Owner, store.Name, objectKey)
	if err != nil {
		return false, err
	}

	return AddVectorsForFile(store, objectKey, file.Url, lang)
}

func refreshVector(vector *Vector, lang string) (bool, error) {
	_, embeddingProviderObj, err := getEmbeddingProviderFromName("admin", vector.Provider, lang)
	if err != nil {
		return false, err
	}

	data, _, err := queryVectorSafe(embeddingProviderObj, vector.Text, vector.Provider, lang)
	if err != nil {
		return false, err
	}

	vector.Data = data

	return true, nil
}

func GetStoresByFields(owner string, fields ...string) ([]*Store, error) {
	stores := []*Store{}
	var err error
	if owner == "" {
		err = adapter.engine.Desc("created_time").Cols(fields...).Find(&stores)
	} else {
		err = adapter.engine.Desc("created_time").Cols(fields...).Find(&stores, &Store{Owner: owner})
	}
	if err != nil {
		return nil, err
	}

	return stores, nil
}

func GetStoreCount(name, field, value string) (int64, error) {
	session := GetDbSession("", -1, -1, field, value, "", "")
	return session.Count(&Store{Name: name})
}

func GetStoreCountByOwner(owner, field, value string) (int64, error) {
	session := GetDbSession("", -1, -1, field, value, "", "")
	return session.Where("owner = ? OR owner = ?", owner, "admin").Count(&Store{})
}

func GetPaginationStores(offset, limit int, name, field, value, sortField, sortOrder string) ([]*Store, error) {
	stores := []*Store{}
	session := GetDbSession("", offset, limit, field, value, sortField, sortOrder)
	var err error
	if name != "" {
		err = session.Find(&stores, &Store{Name: name})
	} else {
		err = session.Find(&stores)
	}
	if err != nil {
		return stores, err
	}

	return stores, nil
}

func GetPaginationStoresByOwner(owner string, offset, limit int, field, value, sortField, sortOrder string) ([]*Store, error) {
	stores := []*Store{}
	session := GetDbSession("", offset, limit, field, value, sortField, sortOrder)
	err := session.Where("owner = ? OR owner = ?", owner, "admin").Find(&stores)
	if err != nil {
		return stores, err
	}

	return stores, nil
}

func (store *Store) ContainsForbiddenWords(text string) (bool, string) {
	if store.ForbiddenWords == nil || len(store.ForbiddenWords) == 0 {
		return false, ""
	}

	lowerText := strings.ToLower(text)
	for _, forbiddenWord := range store.ForbiddenWords {
		if forbiddenWord == "" {
			continue
		}
		lowerForbiddenWord := strings.ToLower(forbiddenWord)
		if strings.Contains(lowerText, lowerForbiddenWord) {
			return true, forbiddenWord
		}
	}
	return false, ""
}
