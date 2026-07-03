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
	"fmt"

	"github.com/the-open-agent/openagent/util"
	"xorm.io/core"
	"xorm.io/xorm"
)

const (
	CommentTargetTypeAgentHub = "agenthub"
	CommentTargetTypeIssue    = "issue"
)

type Comment struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100) index(idx_comment_target_created)" json:"createdTime"`
	UpdatedTime string `xorm:"varchar(100)" json:"updatedTime"`

	TargetType string `xorm:"varchar(50) index(idx_comment_target_created)" json:"targetType"`
	TargetKey  string `xorm:"varchar(255) index(idx_comment_target_created)" json:"targetKey"`

	ParentOwner string `xorm:"varchar(100) index" json:"parentOwner"`
	ParentName  string `xorm:"varchar(100) index" json:"parentName"`
	RootOwner   string `xorm:"varchar(100) index" json:"rootOwner"`
	RootName    string `xorm:"varchar(100) index" json:"rootName"`

	Content string `xorm:"varchar(1000)" json:"content"`

	Replies []*Comment `xorm:"-" json:"replies,omitempty"`
}

func (comment *Comment) GetId() string {
	return fmt.Sprintf("%s/%s", comment.Owner, comment.Name)
}

func GetGlobalComments() ([]*Comment, error) {
	comments := []*Comment{}
	err := adapter.engine.Desc("created_time").Find(&comments)
	return comments, err
}

func GetGlobalCommentCount(field, value string) (int64, error) {
	session := GetDbSession("", -1, -1, field, value, "", "")
	return session.Count(&Comment{})
}

func GetGlobalPaginationComments(offset, limit int, field, value, sortField, sortOrder string) ([]*Comment, error) {
	comments := []*Comment{}
	session := GetDbSession("", offset, limit, field, value, sortField, sortOrder)
	err := session.Find(&comments)
	return comments, err
}

func GetComment(owner string, name string) (*Comment, error) {
	comment := Comment{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(&comment)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return &comment, nil
}

func GetCommentCount(targetType string, targetKey string) (int64, error) {
	return adapter.engine.Where("target_type = ? and target_key = ? and parent_owner = ? and parent_name = ?", targetType, targetKey, "", "").Count(&Comment{})
}

func GetPaginationComments(targetType string, targetKey string, offset int, limit int) ([]*Comment, error) {
	comments := []*Comment{}
	err := adapter.engine.Where("target_type = ? and target_key = ? and parent_owner = ? and parent_name = ?", targetType, targetKey, "", "").Desc("created_time").Limit(limit, offset).Find(&comments)
	if err != nil || len(comments) == 0 {
		return comments, err
	}

	rootOwners := make([]string, 0, len(comments))
	rootNames := make([]string, 0, len(comments))
	rootSet := map[string]bool{}
	for _, comment := range comments {
		rootOwners = append(rootOwners, comment.Owner)
		rootNames = append(rootNames, comment.Name)
		rootSet[comment.Owner+"/"+comment.Name] = true
	}

	replies := []*Comment{}
	err = adapter.engine.Where("target_type = ? and target_key = ?", targetType, targetKey).
		In("root_owner", rootOwners).In("root_name", rootNames).
		Asc("created_time").Find(&replies)
	if err != nil {
		return comments, err
	}

	commentMap := map[string]*Comment{}
	for _, comment := range comments {
		commentMap[comment.Owner+"/"+comment.Name] = comment
	}
	for _, reply := range replies {
		rootId := reply.RootOwner + "/" + reply.RootName
		if !rootSet[rootId] {
			continue
		}
		commentMap[rootId].Replies = append(commentMap[rootId].Replies, reply)
	}

	return comments, nil
}

func UpdateComment(id string, comment *Comment) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	comment.UpdatedTime = util.GetCurrentTimeWithMilli()
	_, err = adapter.engine.ID(core.PK{owner, name}).AllCols().Update(comment)
	if err != nil {
		return false, err
	}
	return true, nil
}

func AddComment(comment *Comment) (bool, error) {
	now := util.GetCurrentTimeWithMilli()
	comment.Name = util.GetRandomString(24)
	comment.CreatedTime = now
	comment.UpdatedTime = now

	affected, err := adapter.engine.Insert(comment)
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func DeleteComment(comment *Comment) (bool, error) {
	session := adapter.engine.NewSession()
	defer session.Close()

	err := session.Begin()
	if err != nil {
		return false, err
	}

	affected, err := session.ID(core.PK{comment.Owner, comment.Name}).Delete(&Comment{})
	if err != nil {
		session.Rollback()
		return false, err
	}
	if comment.ParentOwner == "" && comment.ParentName == "" {
		_, err = session.Where("root_owner = ? and root_name = ?", comment.Owner, comment.Name).Delete(&Comment{})
		if err != nil {
			session.Rollback()
			return false, err
		}
	} else {
		err = deleteCommentChildrenWithSession(session, comment)
		if err != nil {
			session.Rollback()
			return false, err
		}
	}

	err = session.Commit()
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func deleteCommentChildrenWithSession(session *xorm.Session, comment *Comment) error {
	children := []*Comment{}
	err := session.Where("parent_owner = ? and parent_name = ?", comment.Owner, comment.Name).Find(&children)
	if err != nil {
		return err
	}
	for _, child := range children {
		err = deleteCommentChildrenWithSession(session, child)
		if err != nil {
			return err
		}
		_, err = session.ID(core.PK{child.Owner, child.Name}).Delete(&Comment{})
		if err != nil {
			return err
		}
	}
	return nil
}

func deleteCommentsByTargetWithSession(session *xorm.Session, targetType string, targetKey string) error {
	_, err := session.Where("target_type = ? and target_key = ?", targetType, targetKey).Delete(&Comment{})
	return err
}
