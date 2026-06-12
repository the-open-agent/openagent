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

package object

import (
	"encoding/json"
	"fmt"

	"github.com/the-open-agent/openagent/auth"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/util"
)

func pickSharedStoreName(owner, base string) (string, error) {
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
	return "", fmt.Errorf("failed to find unique store name for share")
}

// ShareStore duplicates only the store row for targetUserName (new owner), sets SharedBy to sharedByUserName (source user name).
func ShareStore(srcOwner, srcName, targetUserName, sharedByUserName string) (*Store, error) {
	if srcOwner == "" || srcName == "" || targetUserName == "" || sharedByUserName == "" {
		return nil, fmt.Errorf("owner, store name, target user and sharer are required")
	}
	if targetUserName == srcOwner {
		return nil, fmt.Errorf("cannot share to the same owner")
	}

	src, err := getStore(srcOwner, srcName)
	if err != nil {
		return nil, err
	}
	if src == nil {
		return nil, fmt.Errorf("source store not found")
	}

	accountUser, err := GetUserByRuntimeName(targetUserName)
	if err != nil {
		return nil, err
	}
	if accountUser == nil {
		targetUser, err := auth.GetUser(targetUserName)
		if err != nil {
			return nil, err
		}
		if targetUser == nil {
			return nil, fmt.Errorf("target user not found")
		}
		if targetUser.IsDeleted || targetUser.IsForbidden {
			return nil, fmt.Errorf("target user is not available")
		}

		org := conf.GetConfigString("casdoorOrganization")
		if org != "" && targetUser.Owner != org {
			return nil, fmt.Errorf("target user is not in this organization")
		}
	} else if accountUser.IsDeleted || accountUser.IsForbidden {
		return nil, fmt.Errorf("target user is not available")
	}

	baseName := fmt.Sprintf("%s_%s", srcName, targetUserName)
	newName, err := pickSharedStoreName(targetUserName, baseName)
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

	newStore.Owner = targetUserName
	newStore.Name = newName
	newStore.SharedBy = sharedByUserName
	newStore.IsDefault = false
	newStore.FileTree = nil
	newStore.ChatCount = 0
	newStore.MessageCount = 0
	newStore.VectorCount = 0
	newStore.ApiKey = ""
	// Always use share moment as created time (do not keep source store's createdTime).
	newStore.CreatedTime = util.GetCurrentTimeWithMilli()

	// MustCols ensures created_time is written on insert (xorm may otherwise omit in edge cases).
	affected, err := adapter.engine.MustCols("created_time").Insert(&newStore)
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		return nil, fmt.Errorf("failed to insert shared store")
	}

	out, err := getStore(targetUserName, newName)
	if err != nil {
		return nil, err
	}
	return out, nil
}
