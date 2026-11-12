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

package tool

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func newKeenableTestServer(t *testing.T, check func(r *http.Request, body keenableSearchRequest)) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		raw, _ := io.ReadAll(r.Body)
		var body keenableSearchRequest
		if err := json.Unmarshal(raw, &body); err != nil {
			t.Fatalf("bad request body %q: %v", raw, err)
		}
		check(r, body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"query":"q","mode":"pro","results":[
			{"title":"First","url":"https://example.com/a","description":"","snippet":"alpha"},
			{"title":"","url":"https://example.com/skip","snippet":"no title"},
			{"title":"Second","url":"https://docs.example.org/b","snippet":"beta","published_at":"2026-11-01T00:00:00Z"},
			{"title":"Third","url":"https://example.net/c","snippet":"gamma"}
		]}`))
	}))
}

func TestParseWebSearchEngineKeenable(t *testing.T) {
	engine, err := parseWebSearchEngine("Keenable")
	if err != nil || engine != webSearchEngineKeenable {
		t.Fatalf("parseWebSearchEngine(Keenable) = %q, %v", engine, err)
	}
}

func TestRunKeenableSearchKeyless(t *testing.T) {
	server := newKeenableTestServer(t, func(r *http.Request, body keenableSearchRequest) {
		if got := r.Header.Get("X-API-Key"); got != "" {
			t.Errorf("keyless request sent X-API-Key %q", got)
		}
		if got := r.Header.Get("X-Keenable-Title"); got != "OpenAgent" {
			t.Errorf("X-Keenable-Title = %q", got)
		}
		if body.Query != "openagent" || body.MaxResults != 2 {
			t.Errorf("body = %+v", body)
		}
	})
	defer server.Close()

	results, err := runKeenableSearch(context.Background(), webSearchParams{Query: "openagent", Count: 2}, "", server.URL, server.Client())
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 2 {
		t.Fatalf("got %d results, want 2 (untitled result skipped, then limited)", len(results))
	}
	if results[0].Title != "First" || results[0].Snippet != "alpha" || results[0].SiteName != "example.com" {
		t.Errorf("results[0] = %+v", results[0])
	}
	if results[1].URL != "https://docs.example.org/b" {
		t.Errorf("results[1] = %+v", results[1])
	}
}

func TestRunKeenableSearchWithKey(t *testing.T) {
	server := newKeenableTestServer(t, func(r *http.Request, body keenableSearchRequest) {
		if got := r.Header.Get("X-API-Key"); got != "test-key" {
			t.Errorf("X-API-Key = %q, want test-key", got)
		}
	})
	defer server.Close()

	if _, err := runKeenableSearch(context.Background(), webSearchParams{Query: "q", Count: 5}, " test-key ", server.URL, server.Client()); err != nil {
		t.Fatal(err)
	}
}

func TestRunKeenableSearchHTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"Unauthorized"}`))
	}))
	defer server.Close()

	if _, err := runKeenableSearch(context.Background(), webSearchParams{Query: "q", Count: 5}, "bad", server.URL, server.Client()); err == nil {
		t.Fatal("expected an error for HTTP 401")
	}
}

func TestRunKeenableSearchNoResults(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"query":"q","mode":"pro","results":[]}`))
	}))
	defer server.Close()

	if _, err := runKeenableSearch(context.Background(), webSearchParams{Query: "q", Count: 5}, "", server.URL, server.Client()); err == nil {
		t.Fatal("expected an error when no results come back")
	}
}

// TestRunKeenableSearchLive hits the real keyless endpoint. Opt in with
// KEENABLE_LIVE_TEST=1.
func TestRunKeenableSearchLive(t *testing.T) {
	if os.Getenv("KEENABLE_LIVE_TEST") == "" {
		t.Skip("set KEENABLE_LIVE_TEST=1 to run against api.keenable.ai")
	}
	results, err := runKeenableSearch(context.Background(), webSearchParams{Query: "Go programming language", Count: 3}, os.Getenv("KEENABLE_API_KEY"), "", webSearchHTTPClient)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) == 0 {
		t.Fatal("no results")
	}
	t.Logf("first result: %s %s", results[0].Title, results[0].URL)
}
