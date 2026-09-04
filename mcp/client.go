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

package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/ThinkInAIXYZ/go-mcp/client"
	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/ThinkInAIXYZ/go-mcp/transport"
)

type acceptNoContentTransport struct {
	base http.RoundTripper
}

func (t acceptNoContentTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	resp, err := t.base.RoundTrip(req)
	if err != nil {
		return nil, err
	}
	// Some stateless Streamable HTTP servers acknowledge notifications with
	// 204 No Content. go-mcp expects the equivalent 202 Accepted response.
	if resp.StatusCode == http.StatusNoContent {
		resp.StatusCode = http.StatusAccepted
		resp.Status = "202 Accepted"
	}
	return resp, nil
}

type ServerConfig struct {
	// Stdio config
	Command string            `json:"command"`
	Args    []string          `json:"args"`
	Env     map[string]string `json:"env"`

	// SSE / StreamableHTTP config
	URL string `json:"url"`

	// Transport type: "sse", "stdio", "streamablehttp"
	// Auto-detected from URL when omitted: URL set → streamablehttp, else → stdio.
	Type string `json:"type,omitempty"`
}

// NewClient opens a persistent MCP connection to the given URL using
// StreamableHTTP transport. token is sent as a Bearer Authorization header
// when non-empty. The caller is responsible for closing the returned client.
func NewClient(url, token string) (*client.Client, error) {
	env := map[string]string{}
	if token != "" {
		env["Authorization"] = "Bearer " + token
	}
	return createClient(ServerConfig{
		URL:  url,
		Type: "streamablehttp",
		Env:  env,
	})
}

// CallTool opens a short-lived MCP connection to url, calls toolName with
// the supplied arguments, and returns the JSON-marshalled result content.
func CallTool(url, token, toolName string, arguments map[string]interface{}) (string, error) {
	cli, err := NewClient(url, token)
	if err != nil {
		return "", err
	}
	defer cli.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	result, err := cli.CallTool(ctx, &protocol.CallToolRequest{
		Name:      toolName,
		Arguments: arguments,
	})
	if err != nil {
		return "", err
	}
	if result.IsError {
		b, mErr := json.Marshal(result.Content)
		if mErr != nil {
			return "", fmt.Errorf("MCP tool returned error")
		}
		return "", fmt.Errorf("MCP tool returned error: %s", string(b))
	}
	b, err := json.Marshal(result.Content)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func createClient(srv ServerConfig) (*client.Client, error) {
	var tr transport.ClientTransport
	var err error

	transportType := srv.Type
	if transportType == "" {
		if srv.URL != "" {
			transportType = "sse"
		} else {
			transportType = "stdio"
		}
	}

	switch transportType {
	case "sse":
		if srv.URL == "" {
			return nil, fmt.Errorf("URL is required for SSE transport")
		}
		tr, err = transport.NewSSEClientTransport(srv.URL)
	case "streamablehttp":
		if srv.URL == "" {
			return nil, fmt.Errorf("URL is required for StreamableHTTP transport")
		}
		options := []transport.StreamableHTTPClientTransportOption{
			transport.WithStreamableHTTPClientOptionHTTPClient(&http.Client{
				Transport: acceptNoContentTransport{base: http.DefaultTransport},
			}),
		}
		if len(srv.Env) > 0 {
			options = append(options, transport.WithStreamableHTTPClientOptionHeader(srv.Env))
		}
		tr, err = transport.NewStreamableHTTPClientTransport(srv.URL, options...)
	case "stdio":
		envs := make([]string, 0, len(srv.Env))
		for k, v := range srv.Env {
			envs = append(envs, fmt.Sprintf("%s=%s", k, v))
		}
		tr, err = transport.NewStdioClientTransport(
			srv.Command,
			srv.Args,
			transport.WithStdioClientOptionEnv(envs...),
		)
	default:
		return nil, fmt.Errorf("unsupported transport type: %s", transportType)
	}
	if err != nil {
		return nil, err
	}

	cli, err := client.NewClient(tr)
	if err != nil {
		return nil, err
	}

	return cli, nil
}

// NewClientFromConfig opens a persistent MCP connection described by an
// explicit ServerConfig, so stdio servers (command + args) are supported
// alongside URL-based ones. The caller is responsible for closing the client.
func NewClientFromConfig(srv ServerConfig) (*client.Client, error) {
	return createClient(srv)
}

// CallToolWithConfig opens a short-lived MCP connection described by cfg,
// calls toolName with the supplied arguments, and returns the JSON-marshalled
// result content. It is the stdio-aware counterpart of CallTool.
func CallToolWithConfig(cfg ServerConfig, toolName string, arguments map[string]interface{}) (string, error) {
	cli, err := createClient(cfg)
	if err != nil {
		return "", err
	}
	defer cli.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	result, err := cli.CallTool(ctx, &protocol.CallToolRequest{
		Name:      toolName,
		Arguments: arguments,
	})
	if err != nil {
		return "", err
	}
	if result.IsError {
		b, mErr := json.Marshal(result.Content)
		if mErr != nil {
			return "", fmt.Errorf("MCP tool returned error")
		}
		return "", fmt.Errorf("MCP tool returned error: %s", string(b))
	}
	b, err := json.Marshal(result.Content)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
