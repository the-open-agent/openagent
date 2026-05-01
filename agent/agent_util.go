// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
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

package agent

import "github.com/the-open-agent/openagent/mcp"

// Deprecated: use mcp.GetServerNameAndToolNameFromId instead.
func GetServerNameAndToolNameFromId(id string) (string, string) {
	return mcp.GetServerNameAndToolNameFromId(id)
}

// Deprecated: use mcp.GetIdFromServerNameAndToolName instead.
func GetIdFromServerNameAndToolName(serverName, toolName string) string {
	return mcp.GetIdFromServerNameAndToolName(serverName, toolName)
}
