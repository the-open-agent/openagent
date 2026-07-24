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

package aiguard

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/the-open-agent/openagent/object"
)

func TestSubmitRecordDisabled(t *testing.T) {
	t.Setenv("aiguardEndpoint", "")

	SubmitRecord(&object.Record{Action: "update-store"})
}

func TestSubmitRecord(t *testing.T) {
	requestBody := make(chan map[string]interface{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/api/records" {
			t.Errorf("expected /api/records, got %s", r.URL.Path)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("expected application/json content type, got %s", r.Header.Get("Content-Type"))
		}

		payload := map[string]interface{}{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Errorf("failed to decode request: %v", err)
		}
		requestBody <- payload
		_, _ = w.Write([]byte(`{"status":"ok","msg":"","data":null}`))
	}))
	defer server.Close()
	t.Setenv("aiguardEndpoint", server.URL+"/")

	SubmitRecord(&object.Record{
		CreatedTime: "2026-07-23T12:00:00.000+08:00",
		Action:      "update-store",
		User:        "alice",
		Object:      `{"prompt":"secret prompt","accessToken":"secret token"}`,
		Response:    `{"status":"ok","msg":"secret response"}`,
	})

	select {
	case payload := <-requestBody:
		if len(payload) != 6 {
			t.Fatalf("expected 6 safe fields, got %d: %#v", len(payload), payload)
		}
		expected := map[string]string{
			"agent":       "openagent",
			"createdTime": "2026-07-23T12:00:00.000+08:00",
			"eventType":   aiguardRecordEventType,
			"action":      "update-store",
			"outcome":     "success",
			"user":        "alice",
		}
		for key, value := range expected {
			if payload[key] != value {
				t.Errorf("expected %s=%q, got %#v", key, value, payload[key])
			}
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for AIGuard request")
	}
}

func TestSubmitRecordDoesNotBlock(t *testing.T) {
	requestStarted := make(chan struct{})
	releaseRequest := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(requestStarted)
		<-releaseRequest
		_, _ = w.Write([]byte(`{"status":"ok","msg":"","data":null}`))
	}))
	defer server.Close()
	t.Setenv("aiguardEndpoint", server.URL)

	start := time.Now()
	SubmitRecord(&object.Record{Response: `{"status":"ok","msg":""}`})
	if elapsed := time.Since(start); elapsed > 100*time.Millisecond {
		t.Fatalf("SubmitRecord blocked for %v", elapsed)
	}

	select {
	case <-requestStarted:
		close(releaseRequest)
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for asynchronous AIGuard request")
	}
}

func TestPostAIGuardRecordHTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	err := postAIGuardRecord(server.URL, &aiguardRecord{Agent: "openagent"})
	if err == nil || !strings.Contains(err.Error(), "HTTP status 503") {
		t.Fatalf("expected HTTP status error, got %v", err)
	}
}

func TestPostAIGuardRecordStatusError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"status":"error","msg":"rejected"}`))
	}))
	defer server.Close()

	err := postAIGuardRecord(server.URL, &aiguardRecord{Agent: "openagent"})
	if err == nil || !strings.Contains(err.Error(), "rejected") {
		t.Fatalf("expected AIGuard status error, got %v", err)
	}
}
