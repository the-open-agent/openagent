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
	"math"
	"strconv"
	"strings"
	"time"

	cdpinput "github.com/chromedp/cdproto/input"
	"github.com/chromedp/cdproto/target"
	"github.com/chromedp/chromedp"
	"github.com/chromedp/chromedp/kb"
)

type browserUseTarget struct {
	Mode        string
	Selector    string
	Index       int
	DocX        float64
	DocY        float64
	Width       float64
	Height      float64
	HasPosition bool
}

func browserUsePositiveFloat(raw interface{}, name string) (float64, error) {
	switch value := raw.(type) {
	case float64:
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return 0, fmt.Errorf("%s must be a finite number", name)
		}
		return value, nil
	case int:
		return float64(value), nil
	case int64:
		return float64(value), nil
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
		if err != nil {
			return 0, fmt.Errorf("%s must be a number", name)
		}
		return parsed, nil
	default:
		return 0, fmt.Errorf("%s must be a number", name)
	}
}

func browserUseResolveTarget(arguments map[string]interface{}) (browserUseTarget, error) {
	docTarget, hasDoc, docErr := browserUseDocumentTarget(arguments)
	if docErr != nil {
		return browserUseTarget{}, docErr
	}

	if selector, ok := arguments["selector"].(string); ok && strings.TrimSpace(selector) != "" {
		selector = strings.TrimSpace(selector)
		if browserUseIsStableSelector(selector) {
			return browserUseTarget{
				Mode:        "selector",
				Selector:    selector,
				DocX:        docTarget.DocX,
				DocY:        docTarget.DocY,
				Width:       docTarget.Width,
				Height:      docTarget.Height,
				HasPosition: hasDoc,
			}, nil
		}
		if hasDoc {
			return docTarget, nil
		}
		return browserUseTarget{Mode: "selector", Selector: selector}, nil
	}

	if hasDoc {
		return docTarget, nil
	}

	if rawIndex, ok := arguments["index"]; ok {
		index, err := browserUsePositiveInt(rawIndex, "index")
		if err != nil {
			return browserUseTarget{}, err
		}
		return browserUseTarget{
			Mode:     "index",
			Index:    index,
			Selector: fmt.Sprintf(`[data-openagent-browser-use-ref="%d"]`, index),
		}, nil
	}

	return browserUseTarget{}, fmt.Errorf("missing required parameter: selector, docX/docY (or x/y), or index")
}

func browserUseDocumentTarget(arguments map[string]interface{}) (browserUseTarget, bool, error) {
	docX, hasDocX := arguments["docX"]
	docY, hasDocY := arguments["docY"]
	if !hasDocX {
		docX, hasDocX = arguments["x"]
	}
	if !hasDocY {
		docY, hasDocY = arguments["y"]
	}
	if !hasDocX || !hasDocY {
		return browserUseTarget{}, false, nil
	}

	x, err := browserUsePositiveFloat(docX, "docX")
	if err != nil {
		return browserUseTarget{}, false, err
	}
	y, err := browserUsePositiveFloat(docY, "docY")
	if err != nil {
		return browserUseTarget{}, false, err
	}
	target := browserUseTarget{
		Mode:        "position",
		DocX:        x,
		DocY:        y,
		HasPosition: true,
	}
	if width, ok := arguments["width"]; ok {
		target.Width, err = browserUsePositiveFloat(width, "width")
		if err != nil {
			return browserUseTarget{}, false, err
		}
	}
	if height, ok := arguments["height"]; ok {
		target.Height, err = browserUsePositiveFloat(height, "height")
		if err != nil {
			return browserUseTarget{}, false, err
		}
	}
	return target, true, nil
}

func browserUseIsStableSelector(selector string) bool {
	selector = strings.TrimSpace(selector)
	if selector == "" {
		return false
	}
	switch selector {
	case "a", "button", "input", "textarea", "select", "span", "div":
		return false
	}
	if strings.ContainsAny(selector, `#.[="`) {
		return true
	}
	if strings.Contains(selector, "[") && strings.Contains(selector, "]") {
		return true
	}
	return false
}

func browserUseViewportCenterAtDocumentScript(docX, docY, width, height float64) string {
	return fmt.Sprintf(`(()=>{const docX=%f,docY=%f,width=%f,height=%f,centerX=docX+(width>0?width/2:0),centerY=docY+(height>0?height/2:0);window.scrollTo({left:Math.max(0,centerX-window.innerWidth/2),top:Math.max(0,centerY-window.innerHeight/2),behavior:'instant'});return{x:centerX-window.scrollX,y:centerY-window.scrollY,scrollX:window.scrollX,scrollY:window.scrollY};})()`, docX, docY, width, height)
}

func browserUseClickNthScript(selector string, index int) string {
	return fmt.Sprintf(`(()=>{const sel=%s,nodes=Array.from(document.querySelectorAll(sel));if(!nodes.length)return{error:'selector matched no elements: '+sel};const idx=%d-1;if(idx<0||idx>=nodes.length)return{error:'index out of range: '+(%d)+' of '+nodes.length};const el=nodes[idx];el.scrollIntoView({block:'center',inline:'center',behavior:'instant'});const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};})()`, browserUseJSONLiteral(selector), index, index)
}

type browserUseViewportPoint struct {
	X       float64 `json:"x"`
	Y       float64 `json:"y"`
	ScrollX float64 `json:"scrollX"`
	ScrollY float64 `json:"scrollY"`
	Error   string  `json:"error"`
}

func browserUseMouseClickXY(ctx context.Context, x, y float64) error {
	return chromedp.Run(ctx,
		chromedp.MouseClickXY(x, y),
		chromedp.Sleep(800*time.Millisecond),
	)
}

func browserUsePerformClick(session *browserUseSession, target browserUseTarget) error {
	timeoutCtx, cancel := context.WithTimeout(session.ctx, browserUseDefaultTimeout)
	defer cancel()

	switch target.Mode {
	case "selector", "index":
		err := chromedp.Run(timeoutCtx,
			chromedp.ScrollIntoView(target.Selector, chromedp.ByQuery),
			chromedp.Click(target.Selector, chromedp.ByQuery),
			chromedp.Sleep(800*time.Millisecond),
		)
		if err != nil && target.HasPosition {
			return browserUsePerformPositionClick(timeoutCtx, target)
		}
		return err
	case "position":
		return browserUsePerformPositionClick(timeoutCtx, target)
	default:
		return fmt.Errorf("unsupported click target mode: %s", target.Mode)
	}
}

func browserUsePerformPositionClick(ctx context.Context, target browserUseTarget) error {
	var point browserUseViewportPoint
	if err := chromedp.Run(ctx, chromedp.Evaluate(browserUseViewportCenterAtDocumentScript(target.DocX, target.DocY, target.Width, target.Height), &point)); err != nil {
		return err
	}
	if strings.TrimSpace(point.Error) != "" {
		return fmt.Errorf("%s", point.Error)
	}
	return browserUseMouseClickXY(ctx, point.X, point.Y)
}

func browserUsePerformClickNth(session *browserUseSession, selector string, index int) error {
	timeoutCtx, cancel := context.WithTimeout(session.ctx, browserUseDefaultTimeout)
	defer cancel()

	var point browserUseViewportPoint
	if err := chromedp.Run(timeoutCtx, chromedp.Evaluate(browserUseClickNthScript(selector, index), &point)); err != nil {
		return err
	}
	if strings.TrimSpace(point.Error) != "" {
		return fmt.Errorf("%s", point.Error)
	}
	return browserUseMouseClickXY(timeoutCtx, point.X, point.Y)
}

func browserUsePerformType(session *browserUseSession, target browserUseTarget, text string, clear bool) error {
	timeoutCtx, cancel := context.WithTimeout(session.ctx, browserUseDefaultTimeout)
	defer cancel()

	selector := target.Selector
	var clickPoint browserUseViewportPoint
	hasClickPoint := false

	if target.Mode == "position" {
		if err := chromedp.Run(timeoutCtx, chromedp.Evaluate(browserUseViewportCenterAtDocumentScript(target.DocX, target.DocY, target.Width, target.Height), &clickPoint)); err != nil {
			return err
		}
		if strings.TrimSpace(clickPoint.Error) != "" {
			return fmt.Errorf("%s", clickPoint.Error)
		}
		if err := browserUseMouseClickXY(timeoutCtx, clickPoint.X, clickPoint.Y); err != nil {
			return err
		}
		hasClickPoint = true
	} else {
		if err := chromedp.Run(timeoutCtx,
			chromedp.ScrollIntoView(selector, chromedp.ByQuery),
			chromedp.Click(selector, chromedp.ByQuery),
			chromedp.Sleep(100*time.Millisecond),
		); err != nil {
			if !target.HasPosition {
				return err
			}
			if err := chromedp.Run(timeoutCtx, chromedp.Evaluate(browserUseViewportCenterAtDocumentScript(target.DocX, target.DocY, target.Width, target.Height), &clickPoint)); err != nil {
				return err
			}
			if strings.TrimSpace(clickPoint.Error) != "" {
				return fmt.Errorf("%s", clickPoint.Error)
			}
			if err := browserUseMouseClickXY(timeoutCtx, clickPoint.X, clickPoint.Y); err != nil {
				return err
			}
			hasClickPoint = true
		}
	}

	return chromedp.Run(timeoutCtx, chromedp.ActionFunc(func(ctx context.Context) error {
		if hasClickPoint {
			var tag string
			tagScript := fmt.Sprintf(`(() => {
  const el = document.elementFromPoint(%f, %f);
  return el ? el.tagName.toLowerCase() : '';
})()`, clickPoint.X, clickPoint.Y)
			if err := chromedp.Evaluate(tagScript, &tag).Do(ctx); err != nil {
				return err
			}
			if tag == "select" {
				pointSelector := fmt.Sprintf(`document.elementFromPoint(%f, %f)`, clickPoint.X, clickPoint.Y)
				var result string
				if err := chromedp.Evaluate(browserUseSelectOptionScript(pointSelector, text), &result).Do(ctx); err != nil {
					return err
				}
				if strings.HasPrefix(result, "select option not found") {
					return fmt.Errorf("%s", result)
				}
				return chromedp.Sleep(300 * time.Millisecond).Do(ctx)
			}
		} else {
			var tag string
			if err := chromedp.Evaluate(browserUseElementTagScript(selector), &tag).Do(ctx); err != nil {
				return err
			}
			if tag == "select" {
				var result string
				if err := chromedp.Evaluate(browserUseSelectOptionScript(selector, text), &result).Do(ctx); err != nil {
					return err
				}
				if strings.HasPrefix(result, "select option not found") {
					return fmt.Errorf("%s", result)
				}
				return chromedp.Sleep(300 * time.Millisecond).Do(ctx)
			}

			var setValueResult string
			if err := chromedp.Evaluate(browserUseSetTextValueScript(selector, text, clear), &setValueResult).Do(ctx); err != nil {
				return err
			}
			if setValueResult != "fallback" {
				if strings.HasPrefix(setValueResult, "element not found") {
					return fmt.Errorf("%s", setValueResult)
				}
				return chromedp.Sleep(300 * time.Millisecond).Do(ctx)
			}
		}

		if clear {
			if err := chromedp.KeyEvent("a", chromedp.KeyModifiers(browserUseSelectAllModifier())).Do(ctx); err != nil {
				return err
			}
			if err := chromedp.KeyEvent(kb.Backspace).Do(ctx); err != nil {
				return err
			}
		}
		if err := cdpinput.InsertText(text).Do(ctx); err != nil {
			return err
		}
		return chromedp.Sleep(300 * time.Millisecond).Do(ctx)
	}))
}

func browserUseCurrentURL(provider *BrowserUseTool) (string, error) {
	var rawURL string
	if err := provider.run(chromedp.Location(&rawURL)); err != nil {
		return "", err
	}
	return rawURL, nil
}

func browserUseWaitForPageSettle(provider *BrowserUseTool, previousURL string) error {
	if err := provider.run(chromedp.WaitReady("body", chromedp.ByQuery)); err != nil {
		return err
	}
	var currentURL string
	if err := provider.run(chromedp.Location(&currentURL)); err != nil {
		return err
	}
	if previousURL != "" && strings.TrimSpace(currentURL) != strings.TrimSpace(previousURL) {
		time.Sleep(500 * time.Millisecond)
		return provider.run(chromedp.WaitReady("body", chromedp.ByQuery))
	}
	return nil
}

func browserUseClickWithTabSwitch(provider *BrowserUseTool, clickFn func(session *browserUseSession) error) (bool, error) {
	switchedTab := false
	err := provider.runSession(func(session *browserUseSession) error {
		var previousURL string
		beforeTargets, targetErr := session.pageTargetsLocked()
		if targetErr != nil {
			return targetErr
		}
		before := map[target.ID]bool{}
		for _, item := range beforeTargets {
			before[item.TargetID] = true
			if item.TargetID == session.currentTargetIDLocked() {
				previousURL = item.URL
			}
		}

		if err := clickFn(session); err != nil {
			return err
		}

		var switchErr error
		switchedTab, switchErr = session.switchToNewTargetLocked(before, previousURL)
		return switchErr
	})
	return switchedTab, err
}

func browserUseTargetDescription(target browserUseTarget) string {
	switch target.Mode {
	case "selector":
		return target.Selector
	case "index":
		return fmt.Sprintf("index %d", target.Index)
	case "position":
		return fmt.Sprintf("docX=%.0f docY=%.0f", target.DocX, target.DocY)
	default:
		return target.Mode
	}
}

func browserUsePositionSchemaProperties() map[string]interface{} {
	return map[string]interface{}{
		"docX": map[string]interface{}{"type": "number", "description": "Document X coordinate."},
		"docY": map[string]interface{}{"type": "number", "description": "Document Y coordinate."},
		"x":    map[string]interface{}{"type": "number", "description": "Viewport X fallback."},
		"y":    map[string]interface{}{"type": "number", "description": "Viewport Y fallback."},
		"width": map[string]interface{}{"type": "number", "description": "Optional element width."},
		"height": map[string]interface{}{"type": "number", "description": "Optional element height."},
	}
}
