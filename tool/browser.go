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
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/chromedp/chromedp"
	"github.com/the-open-agent/openagent/proxy"
	"golang.org/x/net/html"
)

const (
	browserDefaultTimeout = 60 * time.Second
	browserMaxTimeout     = 120 * time.Second
	browserMaxContentLen  = 50000
	browserFetchWait      = 10 * time.Second
)

// BrowserTool is the Tool Type "web_browser".
type BrowserTool struct {
	enableProxy bool
}

func NewBrowserTool(config Config) (*BrowserTool, error) {
	return &BrowserTool{enableProxy: config.EnableProxy}, nil
}

func (p *BrowserTool) BuiltinTools() []BuiltinTool {
	return []BuiltinTool{
		&browserNavigateBuiltin{enableProxy: p.enableProxy},
		&browserScreenshotBuiltin{enableProxy: p.enableProxy},
		&browserEvaluateBuiltin{enableProxy: p.enableProxy},
		&browserClickBuiltin{enableProxy: p.enableProxy},
	}
}

// newBrowserCtx creates an allocator + browser context with the given timeout.
// When enableProxy is true the socks5 proxy from app.conf is forwarded to Chrome.
func newBrowserCtx(parent context.Context, timeoutSecs float64, enableProxy bool) (context.Context, context.CancelFunc) {
	timeout := time.Duration(timeoutSecs) * time.Second
	if timeout <= 0 || timeout > browserMaxTimeout {
		timeout = browserDefaultTimeout
	}

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("enable-automation", false),
		chromedp.Flag("disable-blink-features", "AutomationControlled"),
		chromedp.Flag("lang", "zh-CN"),
		chromedp.UserAgent(webFetchUserAgent),
		chromedp.WindowSize(1280, 900),
	)
	if enableProxy {
		if socks5Addr := proxy.GetActiveSocks5ProxyAddress(); socks5Addr != "" {
			opts = append(opts, chromedp.Flag("proxy-server", "socks5://"+socks5Addr))
		}
	}

	allocCtx, allocCancel := chromedp.NewExecAllocator(parent, opts...)

	ctx, ctxCancel := chromedp.NewContext(allocCtx)
	ctx, timeoutCancel := context.WithTimeout(ctx, timeout)

	return ctx, func() {
		timeoutCancel()
		ctxCancel()
		allocCancel()
	}
}

func browserToolText(text string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		IsError: false,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: text},
		},
	}
}

func browserToolError(text string) *protocol.CallToolResult {
	return &protocol.CallToolResult{
		IsError: true,
		Content: []protocol.Content{
			&protocol.TextContent{Type: "text", Text: text},
		},
	}
}

// extractTextFromHTML strips HTML and returns plain text content.
func extractTextFromHTML(rawHTML string) string {
	root, err := html.Parse(strings.NewReader(rawHTML))
	if err != nil {
		return rawHTML
	}
	text := extractHTMLText(root)
	if len(text) > browserMaxContentLen {
		text = text[:browserMaxContentLen] + fmt.Sprintf("\n\n[Content truncated at %d characters]", browserMaxContentLen)
	}
	return text
}

func fetchBrowserPageContent(ctx context.Context, rawURL string, timeoutSecs float64, enableProxy bool) (string, string, error) {
	bCtx, cancel := newBrowserCtx(ctx, timeoutSecs, enableProxy)
	defer cancel()

	var outerHTML, title string

	actions := []chromedp.Action{
		chromedp.Navigate(rawURL),
		chromedp.WaitReady("body", chromedp.ByQuery),
		chromedp.Sleep(browserFetchWait),
	}
	actions = append(actions,
		chromedp.Title(&title),
		chromedp.OuterHTML("html", &outerHTML),
	)

	if err := chromedp.Run(bCtx, actions...); err != nil {
		return "", "", err
	}

	return extractTextFromHTML(outerHTML), title, nil
}

// ---------------------------------------------------------------------------
// browser_navigate
// ---------------------------------------------------------------------------

type browserNavigateBuiltin struct{ enableProxy bool }

func (b *browserNavigateBuiltin) GetName() string { return "web_browser" }

func (b *browserNavigateBuiltin) GetDescription() string {
	return `Navigate to a URL using a real browser (chromedp/headless Chrome), execute JavaScript, wait for the page to fully render, and return the visible text content. Unlike plain HTTP fetch, this tool handles JavaScript-rendered pages (SPAs, dynamic content, login pages with redirects, etc.).`
}

func (b *browserNavigateBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "The URL to navigate to.",
			},
			"wait_selector": map[string]interface{}{
				"type":        "string",
				"description": "Optional CSS selector to wait for before extracting content (e.g. '#main-content'). If omitted, waits for document ready state 'complete'.",
			},
			"timeout": map[string]interface{}{
				"type":        "number",
				"description": "Timeout in seconds (default 60, max 120).",
				"default":     60,
				"minimum":     5,
				"maximum":     120,
			},
		},
		"required": []string{"url"},
	}
}

func (b *browserNavigateBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawURL, ok := arguments["url"].(string)
	if !ok || strings.TrimSpace(rawURL) == "" {
		return browserToolError("missing required parameter: url"), nil
	}
	rawURL = strings.TrimSpace(rawURL)

	timeout := 60.0
	if t, ok := arguments["timeout"].(float64); ok && t > 0 {
		timeout = t
	}

	waitSelector, _ := arguments["wait_selector"].(string)

	var outerHTML, title string
	actions := []chromedp.Action{
		chromedp.Navigate(rawURL),
	}

	if strings.TrimSpace(waitSelector) != "" {
		actions = append(actions, chromedp.WaitVisible(waitSelector, chromedp.ByQuery))
	} else {
		actions = append(actions, chromedp.WaitReady("body", chromedp.ByQuery))
	}

	actions = append(actions,
		chromedp.Title(&title),
		chromedp.OuterHTML("html", &outerHTML),
	)

	bCtx, cancel := newBrowserCtx(ctx, timeout, b.enableProxy)
	defer cancel()

	if err := chromedp.Run(bCtx, actions...); err != nil {
		return browserToolError(fmt.Sprintf("browser navigation failed for %s: %s", rawURL, err.Error())), nil
	}

	text := extractTextFromHTML(outerHTML)
	result := fmt.Sprintf("URL: %s\nTitle: %s\n\n%s", rawURL, title, text)
	return browserToolText(result), nil
}

// ---------------------------------------------------------------------------
// browser_screenshot
// ---------------------------------------------------------------------------

type browserScreenshotBuiltin struct{ enableProxy bool }

func (b *browserScreenshotBuiltin) GetName() string { return "browser_screenshot" }

func (b *browserScreenshotBuiltin) GetDescription() string {
	return `Navigate to a URL using a real browser and capture a full-page screenshot. Returns the screenshot as a base64-encoded PNG string. Useful for visually inspecting page layout, verifying content, or capturing dynamic UI.`
}

func (b *browserScreenshotBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "The URL to navigate to before taking the screenshot.",
			},
			"wait_selector": map[string]interface{}{
				"type":        "string",
				"description": "Optional CSS selector to wait for before capturing the screenshot.",
			},
			"timeout": map[string]interface{}{
				"type":        "number",
				"description": "Timeout in seconds (default 60, max 120).",
				"default":     60,
				"minimum":     5,
				"maximum":     120,
			},
		},
		"required": []string{"url"},
	}
}

func (b *browserScreenshotBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawURL, ok := arguments["url"].(string)
	if !ok || strings.TrimSpace(rawURL) == "" {
		return browserToolError("missing required parameter: url"), nil
	}
	rawURL = strings.TrimSpace(rawURL)

	timeout := 60.0
	if t, ok := arguments["timeout"].(float64); ok && t > 0 {
		timeout = t
	}

	waitSelector, _ := arguments["wait_selector"].(string)

	bCtx, cancel := newBrowserCtx(ctx, timeout, b.enableProxy)
	defer cancel()

	actions := []chromedp.Action{
		chromedp.Navigate(rawURL),
	}

	if strings.TrimSpace(waitSelector) != "" {
		actions = append(actions, chromedp.WaitVisible(waitSelector, chromedp.ByQuery))
	} else {
		actions = append(actions, chromedp.WaitReady("body", chromedp.ByQuery))
	}

	var buf []byte
	actions = append(actions, chromedp.FullScreenshot(&buf, 90))

	if err := chromedp.Run(bCtx, actions...); err != nil {
		return browserToolError(fmt.Sprintf("browser screenshot failed for %s: %s", rawURL, err.Error())), nil
	}

	encoded := base64.StdEncoding.EncodeToString(buf)
	result := fmt.Sprintf("URL: %s\nScreenshot (base64 PNG, length %d):\n%s", rawURL, len(encoded), encoded)
	return browserToolText(result), nil
}

// ---------------------------------------------------------------------------
// browser_evaluate
// ---------------------------------------------------------------------------

type browserEvaluateBuiltin struct{ enableProxy bool }

func (b *browserEvaluateBuiltin) GetName() string { return "browser_evaluate" }

func (b *browserEvaluateBuiltin) GetDescription() string {
	return `Navigate to a URL using a real browser, then evaluate a JavaScript expression in the page context and return the result as a string. Useful for extracting dynamic data, reading DOM properties, or triggering page actions.`
}

func (b *browserEvaluateBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "The URL to navigate to before evaluating the expression.",
			},
			"expression": map[string]interface{}{
				"type":        "string",
				"description": "JavaScript expression to evaluate in the page context. The result is converted to a string.",
			},
			"wait_selector": map[string]interface{}{
				"type":        "string",
				"description": "Optional CSS selector to wait for before evaluating the expression.",
			},
			"timeout": map[string]interface{}{
				"type":        "number",
				"description": "Timeout in seconds (default 60, max 120).",
				"default":     60,
				"minimum":     5,
				"maximum":     120,
			},
		},
		"required": []string{"url", "expression"},
	}
}

func (b *browserEvaluateBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawURL, ok := arguments["url"].(string)
	if !ok || strings.TrimSpace(rawURL) == "" {
		return browserToolError("missing required parameter: url"), nil
	}
	rawURL = strings.TrimSpace(rawURL)

	expression, ok := arguments["expression"].(string)
	if !ok || strings.TrimSpace(expression) == "" {
		return browserToolError("missing required parameter: expression"), nil
	}

	timeout := 60.0
	if t, ok := arguments["timeout"].(float64); ok && t > 0 {
		timeout = t
	}

	waitSelector, _ := arguments["wait_selector"].(string)

	bCtx, cancel := newBrowserCtx(ctx, timeout, b.enableProxy)
	defer cancel()

	actions := []chromedp.Action{
		chromedp.Navigate(rawURL),
	}

	if strings.TrimSpace(waitSelector) != "" {
		actions = append(actions, chromedp.WaitVisible(waitSelector, chromedp.ByQuery))
	} else {
		actions = append(actions, chromedp.WaitReady("body", chromedp.ByQuery))
	}

	var evalResult interface{}
	actions = append(actions, chromedp.Evaluate(expression, &evalResult))

	if err := chromedp.Run(bCtx, actions...); err != nil {
		return browserToolError(fmt.Sprintf("browser evaluate failed for %s: %s", rawURL, err.Error())), nil
	}

	result := fmt.Sprintf("URL: %s\nExpression: %s\nResult: %v", rawURL, expression, evalResult)
	return browserToolText(result), nil
}

// ---------------------------------------------------------------------------
// browser_click
// ---------------------------------------------------------------------------

type browserClickBuiltin struct{ enableProxy bool }

func (b *browserClickBuiltin) GetName() string { return "browser_click" }

func (b *browserClickBuiltin) GetDescription() string {
	return `Navigate to a URL using a real browser, click an element identified by a CSS selector, wait for the page to update, and return the resulting page content. Useful for interacting with buttons, links, tabs, or other clickable UI elements.`
}

func (b *browserClickBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "The URL to navigate to before clicking.",
			},
			"selector": map[string]interface{}{
				"type":        "string",
				"description": "CSS selector of the element to click (e.g. '#submit-btn', '.nav-link', 'button[type=submit]').",
			},
			"wait_selector": map[string]interface{}{
				"type":        "string",
				"description": "Optional CSS selector to wait for after the click before extracting content.",
			},
			"timeout": map[string]interface{}{
				"type":        "number",
				"description": "Timeout in seconds (default 60, max 120).",
				"default":     60,
				"minimum":     5,
				"maximum":     120,
			},
		},
		"required": []string{"url", "selector"},
	}
}

func (b *browserClickBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawURL, ok := arguments["url"].(string)
	if !ok || strings.TrimSpace(rawURL) == "" {
		return browserToolError("missing required parameter: url"), nil
	}
	rawURL = strings.TrimSpace(rawURL)

	selector, ok := arguments["selector"].(string)
	if !ok || strings.TrimSpace(selector) == "" {
		return browserToolError("missing required parameter: selector"), nil
	}

	timeout := 60.0
	if t, ok := arguments["timeout"].(float64); ok && t > 0 {
		timeout = t
	}

	waitSelector, _ := arguments["wait_selector"].(string)

	bCtx, cancel := newBrowserCtx(ctx, timeout, b.enableProxy)
	defer cancel()

	actions := []chromedp.Action{
		chromedp.Navigate(rawURL),
		chromedp.WaitReady("body", chromedp.ByQuery),
		chromedp.Click(selector, chromedp.ByQuery),
	}

	if strings.TrimSpace(waitSelector) != "" {
		actions = append(actions, chromedp.WaitVisible(waitSelector, chromedp.ByQuery))
	}

	var outerHTML, title string
	actions = append(actions,
		chromedp.Title(&title),
		chromedp.OuterHTML("html", &outerHTML),
	)

	if err := chromedp.Run(bCtx, actions...); err != nil {
		return browserToolError(fmt.Sprintf("browser click failed for %s (selector: %s): %s", rawURL, selector, err.Error())), nil
	}

	text := extractTextFromHTML(outerHTML)
	result := fmt.Sprintf("URL: %s\nClicked: %s\nTitle: %s\n\n%s", rawURL, selector, title, text)
	return browserToolText(result), nil
}
