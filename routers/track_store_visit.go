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

package routers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"github.com/beego/beego/context"
	"github.com/beego/beego/logs"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

// TrackStoreVisit records one page-view row per successful GET /api/get-store.
// Runs on AfterExec so the response is already prepared: owner/storeName come
// from what GetStore actually resolved and returned (see storeFromResponse),
// not from request parameters, so a request for a non-existent store neither
// logs anything nor can be aimed at an arbitrary owner/name pair.
//
// This filter replaces the earlier POST /api/track-store-visit endpoint. The
// old design let anyone POST arbitrary owner/storeName pairs and inflate or
// pollute another store's counters; moving the trigger server-side removes
// that attack surface entirely — the request that fires this filter has to
// go through the normal auth + routing stack, and its identity is read back
// from the response, not supplied by the caller.
func TrackStoreVisit(ctx *context.Context) {
	if ctx.Request.URL.Path != "/api/get-store" {
		return
	}
	if ctx.Request.Method != "GET" {
		return
	}

	owner, storeName, ok := storeFromResponse(ctx)
	if !ok {
		return
	}

	clientIp := strings.Replace(util.GetIPFromRequest(ctx.Request), ": ", "", -1)
	userAgent := ctx.Request.UserAgent()
	username := getUsername(ctx)
	visitor, isGuest := resolveVisitor(username, clientIp, userAgent)

	// (visitor, owner, name) dedupe: same viewer bouncing on the page or a
	// double-mount in dev inside `visitDedupeTTL` still counts as one view.
	if !visitDedupe.shouldLog(visitor, owner, storeName) {
		return
	}

	language := ctx.Request.Header.Get("Accept-Language")
	if len(language) > 2 {
		language = language[0:2]
	}

	visit := &object.StoreVisit{
		CreatedTime: util.FormatTimeForCompare(time.Now()),
		StoreOwner:  owner,
		StoreName:   storeName,
		Visitor:     visitor,
		IsGuest:     isGuest,
		ClientIp:    clientIp,
		UserAgent:   userAgent,
		Referrer:    ctx.Request.Referer(),
		Language:    language,
		Path:        ctx.Request.URL.Path,
	}
	if _, err := object.AddStoreVisit(visit); err != nil {
		// Best-effort — never break page rendering just because the analytics
		// table is having a bad time.
		logs.Warn("TrackStoreVisit: AddStoreVisit failed: %s", err.Error())
	}
}

// storeFromResponse extracts the (owner, storeName) of the store GetStore
// actually returned, read straight off the `{status:"ok", data:{...}}` body
// it already wrote to ctx.Input.Data()["json"] — the same map c.Data aliases,
// so this sees whatever the controller set via ResponseOk. Deriving the
// store's identity from the response rather than from the request's "id"
// query param matters for the "admin/_default_store_" alias: GetStore
// reroutes that id through GetDefaultStore(c.defaultStoreOwner()), whose
// owner is resolved per-session and often isn't literally "admin". Parsing
// "id" would log that traffic under a placeholder owner/name that no real
// store has, and GetStoreTraffic — which filters by the real owner/name —
// would never surface it.
func storeFromResponse(ctx *context.Context) (owner string, storeName string, ok bool) {
	respBytes, err := json.Marshal(ctx.Input.Data()["json"])
	if err != nil {
		return "", "", false
	}
	var resp struct {
		Status string `json:"status"`
		Data   struct {
			Owner string `json:"owner"`
			Name  string `json:"name"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBytes, &resp); err != nil {
		return "", "", false
	}
	if resp.Status != "ok" || resp.Data.Owner == "" || resp.Data.Name == "" {
		return "", "", false
	}
	return resp.Data.Owner, resp.Data.Name, true
}

// resolveVisitor returns the visitor identity used for unique-visitor counting.
// Signed-in users are identified by username; guests by a stable hash of IP+UA
// so the same guest bouncing on the page counts once, without storing the raw
// (IP, UA) tuple as the unique key.
func resolveVisitor(username, clientIp, userAgent string) (string, bool) {
	if username != "" {
		return username, false
	}
	sum := sha256.Sum256([]byte(clientIp + "|" + userAgent))
	return "guest_" + hex.EncodeToString(sum[:])[:16], true
}

// visitDedupeTTL is the window in which a (visitor, owner, name) triple counts
// as a single view. Short enough that a page refresh right after visiting
// still counts as one view, long enough that React StrictMode's double-mount
// and any rapid retries collapse into a single row.
const visitDedupeTTL = 3 * time.Second

// visitDedupe is a tiny sync.Map-backed cache keyed by "visitor|owner|name".
// It only absorbs *accidental* duplicates (React StrictMode's double-mount,
// a page refresh, a rapid tab-swap) within visitDedupeTTL. It is not an
// anti-abuse mechanism: guest visitor identity is derived from the
// client-supplied X-Forwarded-For header and User-Agent (see resolveVisitor),
// both trivially variable per request, so a determined caller can mint a
// "new" visitor on every hit and bypass the dedupe entirely.
var visitDedupe = &dedupeCache{}

type dedupeCache struct {
	m sync.Map // key string → time.Time
}

func (d *dedupeCache) shouldLog(visitor, owner, storeName string) bool {
	key := visitor + "|" + owner + "|" + storeName
	now := time.Now()
	if last, ok := d.m.Load(key); ok {
		if now.Sub(last.(time.Time)) < visitDedupeTTL {
			return false
		}
	}
	d.m.Store(key, now)
	return true
}
