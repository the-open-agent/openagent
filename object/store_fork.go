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
	"encoding/json"
	"fmt"

	"github.com/the-open-agent/openagent/util"
)

func pickForkStoreName(owner, base string) (string, error) {
	if base == "" {
		return "", fmt.Errorf("empty store name")
	}
	if len(base) > 100 {
		base = base[:100]
	}
	candidate := base
	for i := 0; i < 1000; i++ {
		if i > 0 {
			suffix := fmt.Sprintf("_%d", i)
			max := 100 - len(suffix)
			if max < 1 {
				return "", fmt.Errorf("failed to allocate unique store name")
			}
			trunc := base
			if len(trunc) > max {
				trunc = trunc[:max]
			}
			candidate = trunc + suffix
		}

		exists, err := adapter.engine.Where("owner = ? AND name = ?", owner, candidate).Exist(&Store{})
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("failed to find unique store name for fork")
}

func applyForkOwnerProviders(store *Store, targetOwner string) error {
	defaultStore, err := GetDefaultStore(targetOwner)
	if err != nil {
		return err
	}
	if defaultStore == nil {
		store.StorageProvider = ""
		store.ImageProvider = ""
		store.SplitProvider = "Default"
		store.SearchProvider = "Default"
		store.ModelProvider = ""
		store.EmbeddingProvider = ""
		store.TextToSpeechProvider = "Browser Built-In"
		store.SpeechToTextProvider = "Browser Built-In"
		store.McpServer = ""
		store.VectorStoreId = ""
		return nil
	}

	store.StorageProvider = defaultStore.StorageProvider
	store.ImageProvider = defaultStore.ImageProvider
	store.SplitProvider = defaultStore.SplitProvider
	store.SearchProvider = defaultStore.SearchProvider
	store.ModelProvider = defaultStore.ModelProvider
	store.EmbeddingProvider = defaultStore.EmbeddingProvider
	store.TextToSpeechProvider = defaultStore.TextToSpeechProvider
	store.EnableTtsStreaming = defaultStore.EnableTtsStreaming
	store.SpeechToTextProvider = defaultStore.SpeechToTextProvider
	store.McpServer = defaultStore.McpServer
	store.VectorStoreId = defaultStore.VectorStoreId
	return nil
}

// HasUserForkedStore reports whether targetOwner already owns a store forked
// from the given source store.
func HasUserForkedStore(targetOwner, srcOwner, srcName string) (bool, error) {
	if targetOwner == "" || srcOwner == "" || srcName == "" {
		return false, nil
	}
	count, err := adapter.engine.Where("owner = ? and forked_from_owner = ? and forked_from_name = ?", targetOwner, srcOwner, srcName).Count(&Store{})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// ForkStore duplicates only the store configuration for targetOwner and records the source store.
func ForkStore(srcOwner, srcName, targetOwner string) (*Store, error) {
	if srcOwner == "" || srcName == "" || targetOwner == "" {
		return nil, fmt.Errorf("owner, store name and target owner are required")
	}

	src, err := getStore(srcOwner, srcName)
	if err != nil {
		return nil, err
	}
	if src == nil {
		return nil, fmt.Errorf("source store not found")
	}

	newName, err := pickForkStoreName(targetOwner, srcName)
	if err != nil {
		return nil, err
	}

	var newStore Store
	payload, err := json.Marshal(src)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(payload, &newStore)
	if err != nil {
		return nil, err
	}

	newStore.Owner = targetOwner
	newStore.Name = newName
	newStore.CreatedTime = util.GetCurrentTimeWithMilli()
	newStore.StorageSubpath = fmt.Sprintf("store_%s", util.GetRandomName())
	if targetOwner != src.Owner {
		err = applyForkOwnerProviders(&newStore, targetOwner)
		if err != nil {
			return nil, err
		}
	}
	newStore.ForkedFromOwner = src.Owner
	newStore.ForkedFromName = src.Name
	newStore.SharedBy = ""
	newStore.IsDefault = false
	newStore.PublishState = ""
	newStore.ExternalApiKey = ""
	newStore.FileTree = nil
	newStore.PropertiesMap = nil
	newStore.ChatCount = 0
	newStore.MessageCount = 0
	newStore.VectorCount = 0
	newStore.HubDbName = ""
	newStore.Endpoint = ""

	success, err := AddStore(&newStore)
	if err != nil {
		return nil, err
	}
	if !success {
		return nil, fmt.Errorf("failed to insert forked store")
	}

	return getStore(targetOwner, newName)
}
