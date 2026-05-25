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
	"fmt"
	"strings"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/chromedp/chromedp"
)

type browserUseRunStepsBuiltin struct{ provider *BrowserUseTool }

func (b *browserUseRunStepsBuiltin) GetName() string { return "browser_use_run_steps" }

func (b *browserUseRunStepsBuiltin) GetDescription() string {
	return "Execute multiple browser actions in one call without intermediate snapshots or LLM turns. Supported ops: open, click, type, click_nth. Pass docX/docY when available; selector failures can fall back to coordinates. Set include_snapshot=false on open steps when appropriate."
}

func (b *browserUseRunStepsBuiltin) GetInputSchema() interface{} {
	stepProps := browserUsePositionSchemaProperties()
	stepProps["index"] = map[string]interface{}{"type": "integer", "description": "Element index fallback."}
	stepProps["selector"] = map[string]interface{}{"type": "string", "description": "CSS selector."}
	stepProps["op"] = map[string]interface{}{"type": "string", "description": "open, click, type, click_nth."}
	stepProps["url"] = map[string]interface{}{"type": "string", "description": "URL for open."}
	stepProps["include_snapshot"] = map[string]interface{}{"type": "boolean", "description": "Return snapshot after open."}
	stepProps["text"] = map[string]interface{}{"type": "string", "description": "Text for type."}
	stepProps["clear"] = map[string]interface{}{"type": "boolean", "description": "Clear before typing."}
	return map[string]interface{}{
		"type": "object", "additionalProperties": false,
		"properties": map[string]interface{}{
			"steps":             map[string]interface{}{"type": "array", "description": "Ordered browser steps.", "items": map[string]interface{}{"type": "object", "additionalProperties": true, "properties": stepProps, "required": []string{"op"}}},
			"snapshot_on_error": map[string]interface{}{"type": "boolean", "description": "Capture snapshot when a step fails.", "default": true},
		},
		"required": []string{"steps"},
	}
}

func (b *browserUseRunStepsBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawSteps, ok := arguments["steps"].([]interface{})
	if !ok || len(rawSteps) == 0 {
		return browserToolError("missing required parameter: steps"), nil
	}
	snapshotOnError := true
	if value, ok := arguments["snapshot_on_error"].(bool); ok {
		snapshotOnError = value
	}

	completed := make([]string, 0, len(rawSteps))
	for stepIndex, rawStep := range rawSteps {
		step, ok := rawStep.(map[string]interface{})
		if !ok {
			return browserUseRunStepsFailure(b.provider, snapshotOnError, completed, fmt.Sprintf("step %d is not an object", stepIndex+1)), nil
		}
		op := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", step["op"])))
		if err := browserUseExecuteRunStep(b.provider, op, step); err != nil {
			return browserUseRunStepsFailure(b.provider, snapshotOnError, completed, fmt.Sprintf("step %d (%s) failed: %s", stepIndex+1, op, err.Error())), nil
		}
		completed = append(completed, fmt.Sprintf("%d:%s", stepIndex+1, op))
	}

	summary := fmt.Sprintf("Completed %d browser step(s): %s.", len(completed), strings.Join(completed, ", "))
	return browserUseTextWithState(b.provider, summary), nil
}

func browserUseExecuteRunStep(provider *BrowserUseTool, op string, step map[string]interface{}) error {
	switch op {
	case "open":
		rawURL, ok := step["url"].(string)
		if !ok || strings.TrimSpace(rawURL) == "" {
			return fmt.Errorf("open requires url")
		}
		includeSnapshot := false
		if value, ok := step["include_snapshot"].(bool); ok {
			includeSnapshot = value
		}
		if err := provider.run(chromedp.Navigate(strings.TrimSpace(rawURL)), chromedp.WaitReady("body", chromedp.ByQuery)); err != nil {
			return err
		}
		if includeSnapshot {
			if _, err := browserUseSnapshot(provider); err != nil {
				return err
			}
		}
		return browserUseWaitForPageSettle(provider, "")
	case "click":
		target, err := browserUseResolveTarget(step)
		if err != nil {
			return err
		}
		previousURL, _ := browserUseCurrentURL(provider)
		if _, err = browserUseClickWithTabSwitch(provider, func(session *browserUseSession) error {
			return browserUsePerformClick(session, target)
		}); err != nil {
			return err
		}
		return browserUseWaitForPageSettle(provider, previousURL)
	case "click_nth":
		selector, ok := step["selector"].(string)
		if !ok || strings.TrimSpace(selector) == "" {
			return fmt.Errorf("click_nth requires selector")
		}
		index, err := browserUsePositiveInt(step["index"], "index")
		if err != nil {
			return err
		}
		previousURL, _ := browserUseCurrentURL(provider)
		if _, err = browserUseClickWithTabSwitch(provider, func(session *browserUseSession) error {
			return browserUsePerformClickNth(session, strings.TrimSpace(selector), index)
		}); err != nil {
			return err
		}
		return browserUseWaitForPageSettle(provider, previousURL)
	case "type":
		target, err := browserUseResolveTarget(step)
		if err != nil {
			return err
		}
		text, ok := step["text"].(string)
		if !ok {
			return fmt.Errorf("type requires text")
		}
		clear := true
		if value, ok := step["clear"].(bool); ok {
			clear = value
		}
		return provider.runSession(func(session *browserUseSession) error {
			return browserUsePerformType(session, target, text, clear)
		})
	default:
		return fmt.Errorf("unsupported op %q", op)
	}
}

func browserUseRunStepsFailure(provider *BrowserUseTool, snapshotOnError bool, completed []string, message string) *protocol.CallToolResult {
	prefix := message
	if len(completed) > 0 {
		prefix = fmt.Sprintf("%s\nCompleted before failure: %s", message, strings.Join(completed, ", "))
	}
	if !snapshotOnError {
		return browserUseErrorWithState(provider, prefix)
	}
	snapshot, err := browserUseSnapshot(provider)
	if err != nil {
		return browserUseErrorWithState(provider, fmt.Sprintf("%s\n\nSnapshot after failure unavailable: %s", prefix, err.Error()))
	}
	return browserUseErrorWithState(provider, fmt.Sprintf("%s\n\nSnapshot after failure:\n%s", prefix, snapshot))
}

func browserUseMinimalOpenSummary(provider *BrowserUseTool) (string, error) {
	var title, rawURL string
	if err := provider.run(chromedp.Title(&title), chromedp.Location(&rawURL)); err != nil {
		return "", err
	}
	return fmt.Sprintf("Opened %s\nTitle: %s", rawURL, title), nil
}
