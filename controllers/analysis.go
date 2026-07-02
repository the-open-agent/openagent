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

package controllers

import (
	"strconv"

	"github.com/the-open-agent/openagent/object"
)

// GetStoreWordCloud
// @Title GetStoreWordCloud
// @Tag Analysis API
// @Description get word cloud data for a store based on its chat messages
// @Success 200 {object} map[string]int The Response object
// @router /get-store-word-cloud [get]
func (c *ApiController) GetStoreWordCloud() {
	storeName := c.Input().Get("storeName")
	if storeName == "" {
		c.ResponseError("storeName is required")
		return
	}

	_, ok := c.RequireSignedIn()
	if !ok {
		return
	}

	wordCount, err := object.GetStoreWordCloud(storeName)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	c.ResponseOk(wordCount)
}

// GetStoreInsightsSummary
// @Title GetStoreInsightsSummary
// @Tag Analysis API
// @Description Pulse-style aggregate over a time window for a store: totals, per-bucket time series, and top active users.
// @Param   owner       query   string  true  "store owner"
// @Param   storeName   query   string  true  "store name"
// @Param   period      query   string  true  "time window: 24h | 7d | 30d"
// @Success 200 {object} object.StoreInsightsSummary The Response object
// @router /get-store-insights-summary [get]
func (c *ApiController) GetStoreInsightsSummary() {
	owner := c.Input().Get("owner")
	storeName := c.Input().Get("storeName")
	period := c.Input().Get("period")

	if owner == "" || storeName == "" {
		c.ResponseError("owner and storeName are required")
		return
	}
	if period == "" {
		period = "7d"
	}

	if _, ok := c.RequireSignedIn(); !ok {
		return
	}

	summary, err := object.GetStoreInsightsSummary(owner, storeName, period)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(summary)
}

// GetStoreContributors
// @Title GetStoreContributors
// @Tag Analysis API
// @Description Per-user rollup and time series for the Contributors sub-tab.
// @Param   owner       query   string  true  "store owner"
// @Param   storeName   query   string  true  "store name"
// @Param   period      query   string  true  "time window: 24h | 7d | 30d"
// @Param   topN        query   int     false "cap on returned contributors (default 20)"
// @Success 200 {object} object.StoreContributorsData The Response object
// @router /get-store-contributors [get]
func (c *ApiController) GetStoreContributors() {
	owner := c.Input().Get("owner")
	storeName := c.Input().Get("storeName")
	period := c.Input().Get("period")
	if owner == "" || storeName == "" {
		c.ResponseError("owner and storeName are required")
		return
	}
	if period == "" {
		period = "7d"
	}
	topN, _ := strconv.Atoi(c.Input().Get("topN"))

	if _, ok := c.RequireSignedIn(); !ok {
		return
	}

	data, err := object.GetStoreContributors(owner, storeName, period, topN)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(data)
}

// GetStoreTraffic
// @Title GetStoreTraffic
// @Tag Analysis API
// @Description Traffic sub-tab data: views/unique visitors time series, top referrers, top paths.
// @Param   owner       query   string  true  "store owner"
// @Param   storeName   query   string  true  "store name"
// @Param   period      query   string  true  "time window: 24h | 7d | 30d"
// @Success 200 {object} object.StoreTraffic The Response object
// @router /get-store-traffic [get]
func (c *ApiController) GetStoreTraffic() {
	owner := c.Input().Get("owner")
	storeName := c.Input().Get("storeName")
	period := c.Input().Get("period")
	if owner == "" || storeName == "" {
		c.ResponseError("owner and storeName are required")
		return
	}
	if period == "" {
		period = "7d"
	}

	if _, ok := c.RequireSignedIn(); !ok {
		return
	}

	data, err := object.GetStoreTrafficData(owner, storeName, period)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(data)
}
