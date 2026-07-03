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
)

const (
	IssueStatusOpen   = "Open"
	IssueStatusClosed = "Closed"
)

// Issue is a GitHub-style discussion topic scoped to a store (agent). The issue
// itself is the main text; its replies reuse the Comment system via a comment
// target of type CommentTargetTypeIssue keyed by the issue's id.
type Issue struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100) index(idx_issue_store_created)" json:"createdTime"`
	UpdatedTime string `xorm:"varchar(100)" json:"updatedTime"`

	Store string `xorm:"varchar(255) index(idx_issue_store_created)" json:"store"`

	Title   string `xorm:"varchar(200)" json:"title"`
	Content string `xorm:"varchar(2000)" json:"content"`
	Status  string `xorm:"varchar(20)" json:"status"`

	CommentCount int `xorm:"-" json:"commentCount"`
}

func (issue *Issue) GetId() string {
	return fmt.Sprintf("%s/%s", issue.Owner, issue.Name)
}

// fillIssueCommentCounts populates CommentCount for the given issues with a
// single grouped query over the comment table (avoids N+1).
func fillIssueCommentCounts(issues []*Issue) error {
	if len(issues) == 0 {
		return nil
	}

	keys := make([]string, 0, len(issues))
	for _, issue := range issues {
		keys = append(keys, issue.GetId())
	}

	type commentCountRow struct {
		TargetKey string
		Count     int
	}
	rows := []commentCountRow{}
	err := adapter.engine.Table(new(Comment)).
		Select("target_key, count(*) as count").
		Where("target_type = ?", CommentTargetTypeIssue).
		In("target_key", keys).
		GroupBy("target_key").
		Find(&rows)
	if err != nil {
		return err
	}

	countMap := map[string]int{}
	for _, row := range rows {
		countMap[row.TargetKey] = row.Count
	}
	for _, issue := range issues {
		issue.CommentCount = countMap[issue.GetId()]
	}
	return nil
}

func GetIssues(store string) ([]*Issue, error) {
	issues := []*Issue{}
	err := adapter.engine.Where("store = ?", store).Desc("created_time").Find(&issues)
	if err != nil {
		return nil, err
	}
	if err = fillIssueCommentCounts(issues); err != nil {
		return nil, err
	}
	return issues, nil
}

func GetIssueCount(store string) (int64, error) {
	return adapter.engine.Where("store = ?", store).Count(&Issue{})
}

func GetIssue(owner string, name string) (*Issue, error) {
	issue := Issue{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(&issue)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, nil
	}
	return &issue, nil
}

func UpdateIssue(id string, issue *Issue) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	issue.UpdatedTime = util.GetCurrentTimeWithMilli()
	_, err = adapter.engine.ID(core.PK{owner, name}).AllCols().Update(issue)
	if err != nil {
		return false, err
	}
	return true, nil
}

func AddIssue(issue *Issue) (bool, error) {
	now := util.GetCurrentTimeWithMilli()
	issue.Name = util.GetRandomString(24)
	issue.CreatedTime = now
	issue.UpdatedTime = now
	if issue.Status == "" {
		issue.Status = IssueStatusOpen
	}

	affected, err := adapter.engine.Insert(issue)
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

// DeleteIssue removes the issue and every comment made under it.
func DeleteIssue(issue *Issue) (bool, error) {
	session := adapter.engine.NewSession()
	defer session.Close()

	err := session.Begin()
	if err != nil {
		return false, err
	}

	affected, err := session.ID(core.PK{issue.Owner, issue.Name}).Delete(&Issue{})
	if err != nil {
		session.Rollback()
		return false, err
	}

	err = deleteCommentsByTargetWithSession(session, CommentTargetTypeIssue, issue.GetId())
	if err != nil {
		session.Rollback()
		return false, err
	}

	err = session.Commit()
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}
