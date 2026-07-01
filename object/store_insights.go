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
	"sort"
	"time"

	"github.com/the-open-agent/openagent/model"
)

type StoreInsightsSummary struct {
	Period    string `json:"period"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
	AsOf      string `json:"asOf"`

	ChatCount       int     `json:"chatCount"`
	MessageCount    int     `json:"messageCount"`
	ActiveUsers     int     `json:"activeUsers"`
	FilesAdded      int     `json:"filesAdded"`
	VectorsAdded    int     `json:"vectorsAdded"`
	TotalTokenCount int     `json:"totalTokenCount"`
	TotalPrice      float64 `json:"totalPrice"`
	Currency        string  `json:"currency"`

	Buckets  []*InsightsBucket `json:"buckets"`
	TopUsers []*InsightsUser   `json:"topUsers"`
}

type InsightsBucket struct {
	Date         string  `json:"date"`
	Chats        int     `json:"chats"`
	Messages     int     `json:"messages"`
	FilesAdded   int     `json:"filesAdded"`
	VectorsAdded int     `json:"vectorsAdded"`
	TokenCount   int     `json:"tokenCount"`
	Price        float64 `json:"price"`
}

type InsightsUser struct {
	User         string `json:"user"`
	MessageCount int    `json:"messageCount"`
	ChatCount    int    `json:"chatCount"`
}

type periodSpec struct {
	duration   time.Duration
	bucketUnit time.Duration
	bucketFmt  string
	bucketN    int
}

// resolvePeriod converts "24h" / "7d" / "30d" to concrete time-window and bucket parameters.
// Buckets are hourly for 24h, daily for 7d/30d.
func resolvePeriod(period string) (periodSpec, error) {
	switch period {
	case "24h":
		return periodSpec{duration: 24 * time.Hour, bucketUnit: time.Hour, bucketFmt: "2006-01-02T15:00:00Z", bucketN: 24}, nil
	case "7d":
		return periodSpec{duration: 7 * 24 * time.Hour, bucketUnit: 24 * time.Hour, bucketFmt: "2006-01-02", bucketN: 7}, nil
	case "30d":
		return periodSpec{duration: 30 * 24 * time.Hour, bucketUnit: 24 * time.Hour, bucketFmt: "2006-01-02", bucketN: 30}, nil
	default:
		return periodSpec{}, fmt.Errorf("unsupported period: %s (expected 24h, 7d, or 30d)", period)
	}
}

// bucketIndex returns which bucket a given timestamp falls into, or -1 if outside the window.
func bucketIndex(t, start time.Time, unit time.Duration, n int) int {
	if t.Before(start) {
		return -1
	}
	idx := int(t.Sub(start) / unit)
	if idx < 0 || idx >= n {
		return -1
	}
	return idx
}

func GetStoreInsightsSummary(owner string, storeName string, period string) (*StoreInsightsSummary, error) {
	spec, err := resolvePeriod(period)
	if err != nil {
		return nil, err
	}

	// Align start to the bucket boundary so hourly buckets start on the hour and daily buckets start at UTC midnight.
	now := time.Now().UTC()
	end := now.Truncate(spec.bucketUnit).Add(spec.bucketUnit)
	start := end.Add(-spec.duration)

	startStr := start.Format(time.RFC3339)
	endStr := end.Format(time.RFC3339)

	// Pre-fill buckets so the client always gets a dense series.
	buckets := make([]*InsightsBucket, spec.bucketN)
	for i := 0; i < spec.bucketN; i++ {
		buckets[i] = &InsightsBucket{
			Date: start.Add(time.Duration(i) * spec.bucketUnit).Format(spec.bucketFmt),
		}
	}

	summary := &StoreInsightsSummary{
		Period:    period,
		StartTime: startStr,
		EndTime:   endStr,
		AsOf:      now.Format(time.RFC3339),
		Buckets:   buckets,
	}

	// Chats — one row per Chat created in window (delta, not cumulative).
	chats := []*Chat{}
	if err = adapter.engine.
		Where("owner = ? and store = ? and created_time >= ? and created_time < ?", owner, storeName, startStr, endStr).
		Find(&chats); err != nil {
		return nil, err
	}
	for _, ch := range chats {
		t, perr := time.Parse(time.RFC3339, ch.CreatedTime)
		if perr != nil {
			continue
		}
		if idx := bucketIndex(t, start, spec.bucketUnit, spec.bucketN); idx >= 0 {
			buckets[idx].Chats++
		}
	}
	summary.ChatCount = len(chats)

	// Messages — aggregated per bucket, plus per-user rollup for TopUsers.
	messages := []*Message{}
	if err = adapter.engine.
		Where("owner = ? and store = ? and created_time >= ? and created_time < ?", owner, storeName, startStr, endStr).
		Find(&messages); err != nil {
		return nil, err
	}
	userMsgCount := map[string]int{}
	userChatSet := map[string]map[string]bool{}
	activeUserSet := map[string]bool{}
	for _, m := range messages {
		t, perr := time.Parse(time.RFC3339, m.CreatedTime)
		if perr != nil {
			continue
		}
		idx := bucketIndex(t, start, spec.bucketUnit, spec.bucketN)
		if idx < 0 {
			continue
		}
		buckets[idx].Messages++
		buckets[idx].TokenCount += m.TokenCount
		buckets[idx].Price += m.Price

		summary.MessageCount++
		summary.TotalTokenCount += m.TokenCount
		summary.TotalPrice += m.Price
		if m.Currency != "" && summary.Currency == "" {
			summary.Currency = m.Currency
		}
		if m.User != "" {
			userMsgCount[m.User]++
			activeUserSet[m.User] = true
			if _, ok := userChatSet[m.User]; !ok {
				userChatSet[m.User] = map[string]bool{}
			}
			if m.Chat != "" {
				userChatSet[m.User][m.Chat] = true
			}
		}
	}
	summary.ActiveUsers = len(activeUserSet)
	summary.TotalPrice = model.RefinePrice(summary.TotalPrice)
	for _, b := range buckets {
		b.Price = model.RefinePrice(b.Price)
	}

	// Files — deltas.
	files := []*File{}
	if err = adapter.engine.
		Where("owner = ? and store = ? and created_time >= ? and created_time < ?", owner, storeName, startStr, endStr).
		Find(&files); err != nil {
		return nil, err
	}
	for _, f := range files {
		t, perr := time.Parse(time.RFC3339, f.CreatedTime)
		if perr != nil {
			continue
		}
		if idx := bucketIndex(t, start, spec.bucketUnit, spec.bucketN); idx >= 0 {
			buckets[idx].FilesAdded++
		}
	}
	summary.FilesAdded = len(files)

	// Vectors — deltas.
	vectors := []*Vector{}
	if err = adapter.engine.
		Where("owner = ? and store = ? and created_time >= ? and created_time < ?", owner, storeName, startStr, endStr).
		Find(&vectors); err != nil {
		return nil, err
	}
	for _, v := range vectors {
		t, perr := time.Parse(time.RFC3339, v.CreatedTime)
		if perr != nil {
			continue
		}
		if idx := bucketIndex(t, start, spec.bucketUnit, spec.bucketN); idx >= 0 {
			buckets[idx].VectorsAdded++
		}
	}
	summary.VectorsAdded = len(vectors)

	// TopUsers — sorted by message count desc, capped at 10.
	top := make([]*InsightsUser, 0, len(userMsgCount))
	for user, cnt := range userMsgCount {
		top = append(top, &InsightsUser{
			User:         user,
			MessageCount: cnt,
			ChatCount:    len(userChatSet[user]),
		})
	}
	sort.Slice(top, func(i, j int) bool {
		if top[i].MessageCount != top[j].MessageCount {
			return top[i].MessageCount > top[j].MessageCount
		}
		return top[i].User < top[j].User
	})
	if len(top) > 10 {
		top = top[:10]
	}
	summary.TopUsers = top

	return summary, nil
}
