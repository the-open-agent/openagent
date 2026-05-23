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

	"github.com/the-open-agent/openagent/util"
	"xorm.io/core"
)

type Chat struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`
	UpdatedTime string `xorm:"varchar(100)" json:"updatedTime"`

	Organization  string  `xorm:"varchar(100)" json:"organization"`
	DisplayName   string  `xorm:"varchar(100)" json:"displayName"`
	Store         string  `xorm:"varchar(100)" json:"store"`
	ModelProvider string  `xorm:"varchar(100)" json:"modelProvider"`
	Tool          string  `xorm:"varchar(100)" json:"tool"`
	Category      string  `xorm:"varchar(100)" json:"category"`
	User          string  `xorm:"varchar(100) index" json:"user"`
	ClientIp      string  `xorm:"varchar(100)" json:"clientIp"`
	UserAgent     string  `xorm:"varchar(200)" json:"userAgent"`
	ClientIpDesc  string  `xorm:"varchar(100)" json:"clientIpDesc"`
	UserAgentDesc string  `xorm:"varchar(100)" json:"userAgentDesc"`
	MessageCount  int     `json:"messageCount"`
	TokenCount    int     `json:"tokenCount"`
	Price         float64 `json:"price"`
	Currency      string  `xorm:"varchar(100)" json:"currency"`
	IsHidden      bool    `json:"isHidden"`
	IsDeleted     bool    `json:"isDeleted"`
	IsRead        bool    `json:"isRead"`
	IsGenerating  bool    `json:"isGenerating"`
	NeedTitle     bool    `json:"needTitle"`
}

func GetGlobalChats() ([]*Chat, error) {
	chats := []*Chat{}
	err := adapter.engine.Asc("owner").Desc("created_time").Find(&chats)
	if err != nil {
		return chats, err
	}

	return chats, nil
}

func GetChats(owner string, storeName string, user string) ([]*Chat, error) {
	chats := []*Chat{}
	err := adapter.engine.Desc("updated_time").Find(&chats, &Chat{Owner: owner, User: user, Store: storeName})
	if err != nil {
		return chats, err
	}

	return chats, nil
}

func getChat(owner, name string) (*Chat, error) {
	chat := Chat{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(&chat)
	if err != nil {
		return nil, err
	}

	if existed {
		return &chat, nil
	} else {
		return nil, nil
	}
}

func GetChat(id string) (*Chat, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	return getChat(owner, name)
}

func UpdateChat(id string, chat *Chat) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	_, err = getChat(owner, name)
	if err != nil {
		return false, err
	}
	if chat == nil {
		return false, nil
	}

	_, err = adapter.engine.ID(core.PK{owner, name}).AllCols().Update(chat)
	if err != nil {
		return false, err
	}

	// return affected != 0
	return true, nil
}

func ResetGeneratingChats() error {
	_, err := adapter.engine.Where("is_generating = ?", true).Cols("is_generating").Update(&Chat{IsGenerating: false})
	return err
}

func AddChat(chat *Chat) (bool, error) {
	chat.IsRead = true
	affected, err := adapter.engine.Insert(chat)
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

func DeleteChat(chat *Chat) (bool, error) {
	affected, err := adapter.engine.ID(core.PK{chat.Owner, chat.Name}).Delete(&Chat{})
	if err != nil {
		return false, err
	}

	return affected != 0, nil
}

func (chat *Chat) GetId() string {
	return fmt.Sprintf("%s/%s", chat.Owner, chat.Name)
}

func getChatCountByMessages(owner string, value string, store string) (int64, error) {
	session := adapter.engine.NewSession()
	if owner != "" {
		session = session.And("chat.owner=?", owner)
	}
	if store != "" {
		session = session.And("chat.store = ?", store)
	}
	// Join with message table and filter by message text
	session = session.Table("chat").
		Join("INNER", "message", "chat.owner = message.owner AND chat.name = message.chat").
		Where("message.text LIKE ?", fmt.Sprintf("%%%s%%", value)).
		Distinct("chat.owner", "chat.name")
	return session.Count(&Chat{})
}

func GetChatCount(owner string, field string, value string, store string) (int64, error) {
	// Handle the special "messages" field by joining with the message table
	if field == "messages" && value != "" {
		return getChatCountByMessages(owner, value, store)
	}

	session := GetDbSession(owner, -1, -1, field, value, "", "")
	if store != "" {
		session = session.And("store = ?", store)
	}
	return session.Count(&Chat{})
}

func GetChatCountByStoreNames(storeNames []string, field, value string) (int64, error) {
	if len(storeNames) == 0 {
		return 0, nil
	}
	session := GetDbSession("", -1, -1, field, value, "", "")
	session = session.In("store", storeNames)
	return session.Count(&Chat{})
}

func GetPaginationChatsByStoreNames(storeNames []string, offset, limit int, field, value, sortField, sortOrder string) ([]*Chat, error) {
	if len(storeNames) == 0 {
		return []*Chat{}, nil
	}
	chats := []*Chat{}
	session := GetDbSession("", offset, limit, field, value, sortField, sortOrder)
	session = session.In("store", storeNames)
	err := session.Find(&chats)
	if err != nil {
		return chats, err
	}
	return chats, nil
}

func GetChatCountByUser(user, store, field, value string) (int64, error) {
	session := GetDbSession("", -1, -1, field, value, "", "")
	session = session.And("user = ?", user)
	if store != "" {
		session = session.And("store = ?", store)
	}
	return session.Count(&Chat{})
}

func GetPaginationChatsByUser(user, store string, offset, limit int, field, value, sortField, sortOrder string) ([]*Chat, error) {
	chats := []*Chat{}
	session := GetDbSession("", offset, limit, field, value, sortField, sortOrder)
	session = session.And("user = ?", user)
	if store != "" {
		session = session.And("store = ?", store)
	}
	err := session.Find(&chats)
	if err != nil {
		return chats, err
	}
	return chats, nil
}

func getPaginationChatsByMessages(owner string, offset, limit int, value, sortField, sortOrder, store string) ([]*Chat, error) {
	chats := []*Chat{}
	session := adapter.engine.NewSession()
	if offset != -1 && limit != -1 {
		session.Limit(limit, offset)
	}
	if owner != "" {
		session = session.And("chat.owner=?", owner)
	}
	if store != "" {
		session = session.And("chat.store = ?", store)
	}
	// Join with message table and filter by message text
	session = session.Table("chat").
		Select("DISTINCT chat.*").
		Join("INNER", "message", "chat.owner = message.owner AND chat.name = message.chat").
		Where("message.text LIKE ?", fmt.Sprintf("%%%s%%", value))

	// Handle sorting
	if sortField == "" || sortOrder == "" {
		sortField = "created_time"
	}
	if sortOrder == "ascend" {
		session = session.Asc(fmt.Sprintf("chat.%s", util.SnakeString(sortField)))
	} else {
		session = session.Desc(fmt.Sprintf("chat.%s", util.SnakeString(sortField)))
	}

	err := session.Find(&chats)
	if err != nil {
		return chats, err
	}

	return chats, nil
}

func FilterChatsByTimeRange(chats []*Chat, startTime, endTime string) []*Chat {
	result := []*Chat{}
	for _, chat := range chats {
		if startTime != "" && chat.CreatedTime < startTime {
			continue
		}
		if endTime != "" && chat.CreatedTime > endTime {
			continue
		}
		result = append(result, chat)
	}
	return result
}

func GetPaginationChats(owner string, offset, limit int, field, value, sortField, sortOrder string, store string) ([]*Chat, error) {
	// Handle the special "messages" field by joining with the message table
	if field == "messages" && value != "" {
		return getPaginationChatsByMessages(owner, offset, limit, value, sortField, sortOrder, store)
	}

	chats := []*Chat{}
	session := GetDbSession(owner, offset, limit, field, value, sortField, sortOrder)
	if store != "" {
		session = session.And("store = ?", store)
	}

	err := session.Find(&chats)
	if err != nil {
		return chats, err
	}

	return chats, nil
}
