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
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/the-open-agent/openagent/proxy"
	"golang.org/x/net/html"
)

const (
	webFetchDefaultTimeout   = 30 * time.Second
	webFetchMaxResponseSize  = 5 * 1024 * 1024
	webFetchDefaultMaxLength = 8000
	webFetchMaxAllowedLength = 50000
	webFetchUserAgent        = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
)

// WebFetchTool is the Tool Type "web_fetch".
type WebFetchTool struct {
	httpClient  *http.Client
	enableProxy bool
}

func NewWebFetchTool(config Config) (*WebFetchTool, error) {
	var httpClient *http.Client
	if config.EnableProxy {
		httpClient = &http.Client{
			Transport: proxy.ProxyHttpClient.Transport,
			Timeout:   webFetchDefaultTimeout,
		}
	} else {
		httpClient = &http.Client{Timeout: webFetchDefaultTimeout}
	}
	return &WebFetchTool{httpClient: httpClient, enableProxy: config.EnableProxy}, nil
}

func (p *WebFetchTool) BuiltinTools() []BuiltinTool {
	return []BuiltinTool{&webFetchBuiltin{httpClient: p.httpClient, enableProxy: p.enableProxy}}
}

type webFetchBuiltin struct {
	httpClient  *http.Client
	enableProxy bool
}

type webFetchHTTPStatusError struct {
	code   int
	status string
}

func (e *webFetchHTTPStatusError) Error() string {
	return fmt.Sprintf("HTTP %d: %s", e.code, e.status)
}

func (b *webFetchBuiltin) GetName() string {
	return "web_fetch"
}

func (b *webFetchBuiltin) GetDescription() string {
	return `Fetch the content of a web page by URL and return its main text content. Useful for reading articles, documentation, or any publicly accessible page. Returns cleaned plain text extracted from the HTML, with scripts and styles removed. Use purpose="get_list" to mark this fetch as a source reference that will be shown to the user in the web sources panel.`
}

func (b *webFetchBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "The URL of the web page to fetch.",
			},
			"timeout": map[string]interface{}{
				"type":        "number",
				"description": "Request timeout in seconds (default 30, max 120).",
				"default":     30,
				"minimum":     1,
				"maximum":     120,
			},
			"max_length": map[string]interface{}{
				"type":        "number",
				"description": fmt.Sprintf("Maximum number of characters to return (default %d, max %d).", webFetchDefaultMaxLength, webFetchMaxAllowedLength),
				"default":     webFetchDefaultMaxLength,
				"minimum":     100,
				"maximum":     webFetchMaxAllowedLength,
			},
			"purpose": map[string]interface{}{
				"type":        "string",
				"description": "Controls how the result is surfaced to the user. \"read_content\" (default) fetches and returns the page text silently. \"get_list\" fetches the same content but also displays the URL as a visible source reference in the web sources panel.",
				"enum":        []string{"read_content", "get_list"},
				"default":     "read_content",
			},
		},
		"required": []string{"url"},
	}
}

func (b *webFetchBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawURL, ok := arguments["url"].(string)
	if !ok || strings.TrimSpace(rawURL) == "" {
		return webFetchToolError("missing required parameter: url"), nil
	}
	rawURL = strings.TrimSpace(rawURL)

	timeoutSecs := 30.0
	if t, ok := arguments["timeout"].(float64); ok && t > 0 {
		timeoutSecs = t
		if timeoutSecs > 120 {
			timeoutSecs = 120
		}
	}

	maxLength := webFetchDefaultMaxLength
	if ml, ok := arguments["max_length"].(float64); ok && ml > 0 {
		maxLength = int(ml)
		if maxLength > webFetchMaxAllowedLength {
			maxLength = webFetchMaxAllowedLength
		}
	}

	fetchCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSecs)*time.Second)
	defer cancel()

	content, title, err := fetchWebPageContent(fetchCtx, rawURL, b.httpClient)
	if err != nil {
		var statusErr *webFetchHTTPStatusError
		if errors.As(err, &statusErr) && statusErr.code == http.StatusForbidden {
			var fallbackErr error
			content, title, fallbackErr = fetchBrowserPageContent(fetchCtx, rawURL, timeoutSecs, b.enableProxy)
			if fallbackErr != nil {
				return webFetchToolError(fmt.Sprintf("failed to fetch URL %s: %s; browser fallback failed: %s", rawURL, err.Error(), fallbackErr.Error())), nil
			}
		} else {
			return webFetchToolError(fmt.Sprintf("failed to fetch URL %s: %s", rawURL, err.Error())), nil
		}
	}

	if len(content) > maxLength {
		content = content[:maxLength] + fmt.Sprintf("\n\n[Content truncated at %d characters]", maxLength)
	}

	result := fmt.Sprintf("URL: %s\nTitle: %s\n\n%s", rawURL, title, content)
	return webFetchToolText(result), nil
}

func fetchWebPageContent(ctx context.Context, rawURL string, client *http.Client) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", webFetchUserAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", "", &webFetchHTTPStatusError{code: resp.StatusCode, status: resp.Status}
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, webFetchMaxResponseSize+1))
	if err != nil {
		return "", "", err
	}
	if len(bodyBytes) > webFetchMaxResponseSize {
		return "", "", fmt.Errorf("response body exceeds %d bytes", webFetchMaxResponseSize)
	}

	root, err := html.Parse(strings.NewReader(string(bodyBytes)))
	if err != nil {
		return "", "", fmt.Errorf("failed to parse HTML: %w", err)
	}

	title := extractHTMLTitle(root)
	text := extractHTMLText(root)
	return text, title, nil
}

// skipWebFetchNode returns true for nodes whose subtree should be skipped entirely.
func skipWebFetchNode(n *html.Node) bool {
	if n.Type != html.ElementNode {
		return false
	}
	switch n.Data {
	case "script", "style", "noscript", "head", "nav", "footer", "aside", "header":
		return true
	}
	for _, attr := range n.Attr {
		if attr.Key == "role" && (attr.Val == "navigation" || attr.Val == "banner" || attr.Val == "contentinfo") {
			return true
		}
	}
	return false
}

func extractHTMLTitle(root *html.Node) string {
	titleNode := findHTMLNode(root, func(n *html.Node) bool {
		return n.Type == html.ElementNode && n.Data == "title"
	})
	if titleNode == nil {
		return ""
	}
	return strings.TrimSpace(nodeText(titleNode))
}

func extractHTMLText(root *html.Node) string {
	var sb strings.Builder
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if skipWebFetchNode(n) {
			return
		}
		if n.Type == html.TextNode {
			text := strings.TrimSpace(n.Data)
			if text != "" {
				sb.WriteString(text)
				sb.WriteString(" ")
			}
			return
		}
		if n.Type == html.ElementNode {
			switch n.Data {
			case "p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr", "blockquote":
				sb.WriteString("\n")
			case "br":
				sb.WriteString("\n")
			}
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(root)

	lines := strings.Split(sb.String(), "\n")
	var cleaned []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			cleaned = append(cleaned, line)
		}
	}
	return strings.Join(cleaned, "\n")
}

func webFetchToolText(text string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		IsError: false,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: text},
		},
	}
}

func webFetchToolError(text string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		IsError: true,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: text},
		},
	}
}
