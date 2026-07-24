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

// Package aiguard reports OpenAgent API activity to an AIGuard instance.
package aiguard

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/beego/beego/logs"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/object"
)

const aiguardRecordEventType = "api"

var aiguardHTTPClient = &http.Client{Timeout: 3 * time.Second}

type aiguardRecord struct {
	Agent       string `json:"agent"`
	CreatedTime string `json:"createdTime"`
	EventType   string `json:"eventType"`
	Action      string `json:"action"`
	Outcome     string `json:"outcome"`
	User        string `json:"user,omitempty"`
}

type aiguardResponse struct {
	Status string `json:"status"`
	Msg    string `json:"msg"`
}

// SubmitRecord asynchronously reports a sanitized OpenAgent record when
// aiguardEndpoint is configured.
func SubmitRecord(record *object.Record) {
	endpoint := strings.TrimSpace(conf.GetConfigString("aiguardEndpoint"))
	if endpoint == "" || record == nil {
		return
	}

	aiguardRecord := newAIGuardRecord(record)
	go func() {
		err := postAIGuardRecord(endpoint, aiguardRecord)
		if err != nil {
			logs.Warning("aiguard.SubmitRecord() error: %s", err.Error())
		}
	}()
}

func newAIGuardRecord(record *object.Record) *aiguardRecord {
	outcome := "failure"
	response := &object.Response{}
	if err := json.Unmarshal([]byte(record.Response), response); (err == nil && response.Status == "ok") ||
		strings.HasPrefix(record.Response, `{"status":"ok",`) {
		outcome = "success"
	}

	return &aiguardRecord{
		Agent:       "openagent",
		CreatedTime: record.CreatedTime,
		EventType:   aiguardRecordEventType,
		Action:      record.Action,
		Outcome:     outcome,
		User:        record.User,
	}
}

func postAIGuardRecord(endpoint string, record *aiguardRecord) error {
	body, err := json.Marshal(record)
	if err != nil {
		return err
	}

	url := strings.TrimRight(endpoint, "/") + "/api/records"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := aiguardHTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("AIGuard returned HTTP status %d", resp.StatusCode)
	}

	result := &aiguardResponse{}
	if err = json.NewDecoder(resp.Body).Decode(result); err != nil {
		return err
	}
	if result.Status != "ok" {
		return fmt.Errorf("AIGuard returned status %q: %s", result.Status, result.Msg)
	}

	return nil
}
