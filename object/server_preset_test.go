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
	"encoding/json"
	"testing"
)

func TestBrowserUseCloudServerPreset(t *testing.T) {
	server := newBrowserUseCloudServer()

	if server.Owner != "admin" || server.Name != "browser_use_cloud" {
		t.Fatalf("unexpected preset identity: %s/%s", server.Owner, server.Name)
	}
	if server.DisplayName != "Browser Use Cloud" {
		t.Fatalf("unexpected display name: %q", server.DisplayName)
	}
	if server.Url != "https://api.browser-use.com/v3/mcp" || server.Transport != "streamablehttp" {
		t.Fatalf("unexpected transport: %s %s", server.Transport, server.Url)
	}
	if value, ok := server.Env["x-browser-use-api-key"]; !ok || value != "" {
		t.Fatalf("API key header should be present and empty: %#v", server.Env)
	}
	if server.Token != "" || server.IsDefault {
		t.Fatal("the cloud preset must not change the default browser or use Bearer auth")
	}

	var testCall struct {
		Tool string `json:"tool"`
	}
	if err := json.Unmarshal([]byte(server.TestContent), &testCall); err != nil {
		t.Fatalf("invalid test content: %v", err)
	}
	if testCall.Tool != "list_sessions" {
		t.Fatalf("unexpected read-only test tool: %q", testCall.Tool)
	}
}
