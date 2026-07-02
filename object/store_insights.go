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
	"github.com/the-open-agent/openagent/util"
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

type StoreContributorsData struct {
	Period    string `json:"period"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
	AsOf      string `json:"asOf"`

	TotalActiveUsers int             `json:"totalActiveUsers"`
	TotalSeries      []*ContribPoint `json:"totalSeries"`
	Contributors     []*ContribUser  `json:"contributors"`
}

type ContribPoint struct {
	Date         string `json:"date"`
	MessageCount int    `json:"messageCount"`
}

type ContribUser struct {
	User         string          `json:"user"`
	MessageCount int             `json:"messageCount"`
	ChatCount    int             `json:"chatCount"`
	Series       []*ContribPoint `json:"series"`
}

type StoreTraffic struct {
	Period    string `json:"period"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
	AsOf      string `json:"asOf"`

	TotalViews          int `json:"totalViews"`
	TotalUniqueVisitors int `json:"totalUniqueVisitors"`

	Buckets      []*TrafficBucket `json:"buckets"`
	TopReferrers []*TrafficItem   `json:"topReferrers"`
	TopPaths     []*TrafficItem   `json:"topPaths"`
}

type TrafficBucket struct {
	Date           string `json:"date"`
	Views          int    `json:"views"`
	UniqueVisitors int    `json:"uniqueVisitors"`
}

type TrafficItem struct {
	Label string `json:"label"`
	Count int    `json:"count"`
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

	// Align start to the bucket boundary so hourly buckets start on the hour and daily buckets start at midnight.
	now := time.Now()
	end := now.Truncate(spec.bucketUnit).Add(spec.bucketUnit)
	start := end.Add(-spec.duration)

	startStr := util.FormatTimeForCompare(start)
	endStr := util.FormatTimeForCompare(end)

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
	// Note: Chat.Owner is always "admin" (system-created), so filtering by the store's
	// owner would never match — filter by store alone, like PopulateStoreCounts does.
	chats := []*Chat{}
	if err = adapter.engine.
		Where("store = ? and created_time >= ? and created_time < ?", storeName, startStr, endStr).
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
	// Only fetch the fields the aggregation actually reads so we don't drag the
	// mediumtext columns (Text, ReasonText, ErrorText, Comment) into memory.
	messages := []*Message{}
	if err = adapter.engine.
		Cols("user", "chat", "created_time", "author", "token_count", "price", "currency").
		Where("store = ? and created_time >= ? and created_time < ?", storeName, startStr, endStr).
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
		// Token/price include AI replies because billing does; but the message-
		// count / per-user metrics only count human-authored messages, matching
		// the pattern in object/analysis.go's GetStoreWordCloud.
		buckets[idx].TokenCount += m.TokenCount
		buckets[idx].Price += m.Price
		summary.TotalTokenCount += m.TokenCount
		summary.TotalPrice += m.Price
		if m.Currency != "" && summary.Currency == "" {
			summary.Currency = m.Currency
		}
		if m.Author == "AI" {
			continue
		}
		buckets[idx].Messages++
		summary.MessageCount++
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
		Where("store = ? and created_time >= ? and created_time < ?", storeName, startStr, endStr).
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
		Where("store = ? and created_time >= ? and created_time < ?", storeName, startStr, endStr).
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

// GetStoreContributors returns per-user rollup and per-bucket series for the Contributors sub-tab.
// topN caps the number of user cards returned (defaults to 20 if <= 0).
func GetStoreContributors(owner string, storeName string, period string, topN int) (*StoreContributorsData, error) {
	spec, err := resolvePeriod(period)
	if err != nil {
		return nil, err
	}
	if topN <= 0 {
		topN = 20
	}

	now := time.Now()
	end := now.Truncate(spec.bucketUnit).Add(spec.bucketUnit)
	start := end.Add(-spec.duration)

	startStr := util.FormatTimeForCompare(start)
	endStr := util.FormatTimeForCompare(end)

	dates := make([]string, spec.bucketN)
	for i := 0; i < spec.bucketN; i++ {
		dates[i] = start.Add(time.Duration(i) * spec.bucketUnit).Format(spec.bucketFmt)
	}

	// Filter by store only. Message.Owner is always "admin" (system-created), so
	// filtering by the store's owner would never match — same reasoning as
	// GetStoreInsightsSummary. Also restrict fetched columns so we don't drag
	// the mediumtext body columns into memory (Text, ReasonText, ErrorText,
	// Comment) since the aggregation only needs the four short fields below.
	messages := []*Message{}
	if err = adapter.engine.
		Cols("user", "chat", "created_time", "author").
		Where("store = ? and created_time >= ? and created_time < ?", storeName, startStr, endStr).
		Find(&messages); err != nil {
		return nil, err
	}

	totalSeries := make([]*ContribPoint, spec.bucketN)
	for i := 0; i < spec.bucketN; i++ {
		totalSeries[i] = &ContribPoint{Date: dates[i]}
	}

	// One accumulator per user; we only allocate series for users that actually have activity.
	type userAgg struct {
		messageCount int
		chatSet      map[string]bool
		series       []*ContribPoint
	}
	users := map[string]*userAgg{}

	for _, m := range messages {
		t, perr := time.Parse(time.RFC3339, m.CreatedTime)
		if perr != nil {
			continue
		}
		idx := bucketIndex(t, start, spec.bucketUnit, spec.bucketN)
		if idx < 0 {
			continue
		}
		// Exclude AI replies — Contributors ranks people by how much they typed,
		// not by how much AI answered them (matches GetStoreWordCloud's filter).
		if m.Author == "AI" {
			continue
		}
		totalSeries[idx].MessageCount++
		if m.User == "" {
			continue
		}
		u, ok := users[m.User]
		if !ok {
			series := make([]*ContribPoint, spec.bucketN)
			for i := 0; i < spec.bucketN; i++ {
				series[i] = &ContribPoint{Date: dates[i]}
			}
			u = &userAgg{chatSet: map[string]bool{}, series: series}
			users[m.User] = u
		}
		u.messageCount++
		u.series[idx].MessageCount++
		if m.Chat != "" {
			u.chatSet[m.Chat] = true
		}
	}

	contributors := make([]*ContribUser, 0, len(users))
	for name, u := range users {
		contributors = append(contributors, &ContribUser{
			User:         name,
			MessageCount: u.messageCount,
			ChatCount:    len(u.chatSet),
			Series:       u.series,
		})
	}
	sort.Slice(contributors, func(i, j int) bool {
		if contributors[i].MessageCount != contributors[j].MessageCount {
			return contributors[i].MessageCount > contributors[j].MessageCount
		}
		return contributors[i].User < contributors[j].User
	})
	totalActive := len(contributors)
	if len(contributors) > topN {
		contributors = contributors[:topN]
	}

	return &StoreContributorsData{
		Period:           period,
		StartTime:        startStr,
		EndTime:          endStr,
		AsOf:             now.Format(time.RFC3339),
		TotalActiveUsers: totalActive,
		TotalSeries:      totalSeries,
		Contributors:     contributors,
	}, nil
}

// GetStoreTrafficData returns views/uniques time series plus referrer/path
// breakdowns for the Traffic sub-tab. Unlike the Chat/Message aggregations,
// StoreVisit has real StoreOwner/StoreName fields (we control the schema),
// so filtering by both correctly disambiguates stores that share a name.
func GetStoreTrafficData(owner string, storeName string, period string) (*StoreTraffic, error) {
	spec, err := resolvePeriod(period)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	end := now.Truncate(spec.bucketUnit).Add(spec.bucketUnit)
	start := end.Add(-spec.duration)
	startStr := util.FormatTimeForCompare(start)
	endStr := util.FormatTimeForCompare(end)

	buckets := make([]*TrafficBucket, spec.bucketN)
	// Per-bucket visitor sets so a returning visitor counts once per bucket.
	bucketVisitors := make([]map[string]bool, spec.bucketN)
	for i := 0; i < spec.bucketN; i++ {
		buckets[i] = &TrafficBucket{
			Date: start.Add(time.Duration(i) * spec.bucketUnit).Format(spec.bucketFmt),
		}
		bucketVisitors[i] = map[string]bool{}
	}

	// Only fetch the four columns the aggregation reads — user_agent is a
	// varchar(500) and client_ip / language / is_guest / session_id aren't
	// used downstream, so leaving them on-disk keeps the loop lean.
	visits := []*StoreVisit{}
	if err = adapter.engine.
		Cols("created_time", "visitor", "referrer", "path").
		Where("store_owner = ? and store_name = ? and created_time >= ? and created_time < ?", owner, storeName, startStr, endStr).
		Asc("created_time").
		Find(&visits); err != nil {
		return nil, err
	}

	referrerCount := map[string]int{}
	pathCount := map[string]int{}
	totalVisitorSet := map[string]bool{}

	for _, v := range visits {
		t, perr := time.Parse(time.RFC3339, v.CreatedTime)
		if perr != nil {
			continue
		}
		idx := bucketIndex(t, start, spec.bucketUnit, spec.bucketN)
		if idx < 0 {
			continue
		}
		buckets[idx].Views++
		if v.Visitor != "" {
			bucketVisitors[idx][v.Visitor] = true
			totalVisitorSet[v.Visitor] = true
		}
		if v.Referrer != "" {
			referrerCount[v.Referrer]++
		}
		if v.Path != "" {
			pathCount[v.Path]++
		}
	}

	for i, b := range buckets {
		b.UniqueVisitors = len(bucketVisitors[i])
	}

	return &StoreTraffic{
		Period:              period,
		StartTime:           startStr,
		EndTime:             endStr,
		AsOf:                now.Format(time.RFC3339),
		TotalViews:          len(visits),
		TotalUniqueVisitors: len(totalVisitorSet),
		Buckets:             buckets,
		TopReferrers:        topItems(referrerCount, 10),
		TopPaths:            topItems(pathCount, 10),
	}, nil
}

// topItems sorts a label→count map descending (ties broken by label ascending)
// and returns at most `limit` entries. Kept unexported since Traffic is its
// only current consumer.
func topItems(counts map[string]int, limit int) []*TrafficItem {
	items := make([]*TrafficItem, 0, len(counts))
	for label, count := range counts {
		items = append(items, &TrafficItem{Label: label, Count: count})
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Count != items[j].Count {
			return items[i].Count > items[j].Count
		}
		return items[i].Label < items[j].Label
	})
	if len(items) > limit {
		items = items[:limit]
	}
	return items
}
