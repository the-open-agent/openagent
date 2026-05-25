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
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/util"
)

type LearnWebsiteOptions struct {
	DisplayName string
}

var (
	websiteSnapshotLinePattern = regexp.MustCompile(`(?m)^\[(\d+)\]\s*<(\w+)(?:\s+role="([^"]*)")?(?:\s+href="([^"]*)")?(?:\s+placeholder="([^"]*)")?(?:\s+aria-label="([^"]*)")?>\s*(.*?)\s*\(x=([\d.]+)\s+y=([\d.]+)\s+w=([\d.]+)\s+h=([\d.]+)(?:\s+docX=([\d.]+)\s+docY=([\d.]+))?\)`)
	websiteContentURLPattern   = regexp.MustCompile(`(?m)(?:^|\n)\s*-?\s*URL:\s*(https?://[^\s]+)`)
	websiteSnapshotURLLine     = regexp.MustCompile(`(?m)^URL:\s*(.+)$`)
	websiteNumericPart         = regexp.MustCompile(`^[0-9]+$`)
	websiteSanitizePart        = regexp.MustCompile(`[^a-z0-9._-]+`)
	websiteSanitizeDash        = regexp.MustCompile(`-+`)
)

type toolCallTextBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type ParsedSnapshotElement struct {
	Index                         int
	Tag, Role, Href, Placeholder, AriaLabel, Text string
	X, Y, W, H, DocX, DocY        float64
}

func normalizeToolCallTextContent(content string) string {
	content = strings.TrimSpace(content)
	if content == "" {
		return ""
	}
	if strings.HasPrefix(content, "[") {
		var blocks []toolCallTextBlock
		if err := json.Unmarshal([]byte(content), &blocks); err == nil {
			parts := make([]string, 0, len(blocks))
			for _, block := range blocks {
				if strings.TrimSpace(block.Text) != "" {
					parts = append(parts, block.Text)
				}
			}
			if len(parts) > 0 {
				return strings.Join(parts, "\n")
			}
		}
	}
	if strings.HasPrefix(content, "{") {
		var response struct {
			Data string `json:"data"`
		}
		if err := json.Unmarshal([]byte(content), &response); err == nil && strings.TrimSpace(response.Data) != "" {
			return normalizeToolCallTextContent(response.Data)
		}
	}
	return content
}

func parseSnapshotElements(content string) []ParsedSnapshotElement {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil
	}
	matches := websiteSnapshotLinePattern.FindAllStringSubmatch(content, -1)
	elements := make([]ParsedSnapshotElement, 0, len(matches))
	for _, match := range matches {
		if len(match) < 12 {
			continue
		}
		index, _ := strconv.Atoi(match[1])
		x, _ := strconv.ParseFloat(match[8], 64)
		y, _ := strconv.ParseFloat(match[9], 64)
		w, _ := strconv.ParseFloat(match[10], 64)
		h, _ := strconv.ParseFloat(match[11], 64)
		docX, docY := x, y
		if len(match) > 13 && match[12] != "" {
			docX, _ = strconv.ParseFloat(match[12], 64)
			docY, _ = strconv.ParseFloat(match[13], 64)
		}
		placeholder, ariaLabel := "", ""
		if len(match) > 5 {
			placeholder = match[5]
			if len(match) > 6 {
				ariaLabel = match[6]
			}
		}
		elements = append(elements, ParsedSnapshotElement{
			Index: index, Tag: match[2], Role: match[3], Href: match[4], Placeholder: placeholder, AriaLabel: ariaLabel,
			Text: strings.TrimSpace(match[7]), X: x, Y: y, W: w, H: h, DocX: docX, DocY: docY,
		})
	}
	return elements
}

func stepProvidesSnapshot(step LearnStep) bool {
	return step.Tool == "browser_use_snapshot" || step.Tool == "browser_use_open"
}

func buildSnapshotTimeline(toolCalls []model.ToolCall) []string {
	snapshots := []string{}
	for _, tc := range toolCalls {
		if tc.Name != "browser_use_snapshot" && tc.Name != "browser_use_open" {
			continue
		}
		text := normalizeToolCallTextContent(tc.Content)
		if strings.TrimSpace(text) != "" && len(parseSnapshotElements(text)) > 0 {
			snapshots = append(snapshots, text)
		}
	}
	return snapshots
}

func snapshotBeforeStep(snapshots []string, stepIndex int) string {
	if len(snapshots) == 0 {
		return ""
	}
	if stepIndex <= 0 {
		return snapshots[0]
	}
	if stepIndex-1 < len(snapshots) {
		return snapshots[stepIndex-1]
	}
	return snapshots[len(snapshots)-1]
}

func findSnapshotElementByIndex(content string, index int) (ParsedSnapshotElement, bool) {
	for _, element := range parseSnapshotElements(content) {
		if element.Index == index {
			return element, true
		}
	}
	return ParsedSnapshotElement{}, false
}

func ExtractBrowserUseSteps(toolCalls []model.ToolCall) []LearnStep {
	steps := make([]LearnStep, 0, len(toolCalls))
	for _, tc := range toolCalls {
		if !strings.HasPrefix(tc.Name, "browser_use_") {
			continue
		}
		args := map[string]any{}
		if err := json.Unmarshal([]byte(tc.Arguments), &args); err != nil {
			args = map[string]any{"raw": tc.Arguments}
		}
		step := LearnStep{Tool: tc.Name, Arguments: args}
		if step.Tool == "browser_use_snapshot" && len(steps) > 0 && steps[len(steps)-1].Tool == "browser_use_snapshot" {
			steps[len(steps)-1] = step
			continue
		}
		steps = append(steps, step)
	}
	return steps
}

func PrepareBrowserUseLearnSteps(toolCalls []model.ToolCall) []LearnStep {
	return ExpandBrowserUseRunSteps(ExtractBrowserUseSteps(toolCalls))
}

func ExpandBrowserUseRunSteps(steps []LearnStep) []LearnStep {
	expanded := make([]LearnStep, 0, len(steps))
	for _, step := range steps {
		if step.Tool != "browser_use_run_steps" {
			expanded = append(expanded, step)
			continue
		}
		rawSteps, ok := step.Arguments["steps"].([]any)
		if !ok {
			expanded = append(expanded, step)
			continue
		}
		for _, raw := range rawSteps {
			sub, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			op := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", sub["op"])))
			switch op {
			case "open":
				rawURL, _ := sub["url"].(string)
				if strings.TrimSpace(rawURL) == "" {
					continue
				}
				expanded = append(expanded, LearnStep{Tool: "browser_use_open", Arguments: map[string]any{"url": strings.TrimSpace(rawURL), "include_snapshot": sub["include_snapshot"]}})
			case "click", "click_nth":
				expanded = append(expanded, LearnStep{Tool: "browser_use_click", Arguments: cloneArguments(sub)})
			case "type":
				expanded = append(expanded, LearnStep{Tool: "browser_use_type", Arguments: cloneArguments(sub)})
			}
		}
	}
	return expanded
}

func InferSiteFromBrowserUse(steps []LearnStep, toolCalls []model.ToolCall) (siteId string, baseUrl string, err error) {
	for _, step := range steps {
		if step.Tool != "browser_use_open" {
			continue
		}
		rawURL, ok := step.Arguments["url"].(string)
		if ok && strings.TrimSpace(rawURL) != "" {
			return normalizeSite(rawURL)
		}
	}
	for _, step := range steps {
		if !strings.Contains(step.Tool, "snapshot") {
			continue
		}
		for _, key := range []string{"url", "current_url", "currentUrl", "page_url", "pageUrl"} {
			rawURL, ok := step.Arguments[key].(string)
			if ok && strings.TrimSpace(rawURL) != "" {
				return normalizeSite(rawURL)
			}
		}
	}
	urls := collectWebsiteUrlsForLearn(steps, toolCalls)
	if len(urls) == 0 {
		return "", "", fmt.Errorf("failed to infer site from browser_use steps")
	}
	return normalizeSite(urls[0])
}

func ParameterizeSteps(steps []LearnStep) []LearnStep {
	res := make([]LearnStep, 0, len(steps))
	for _, step := range steps {
		newStep := LearnStep{Tool: step.Tool, Arguments: cloneArguments(step.Arguments)}
		if newStep.Tool == "browser_use_type" {
			if text, ok := newStep.Arguments["text"].(string); ok && strings.TrimSpace(text) != "" {
				newStep.Arguments["text"] = "{{var:userText}}"
			}
		}
		if newStep.Tool == "browser_use_open" {
			if rawURL, ok := newStep.Arguments["url"].(string); ok && strings.TrimSpace(rawURL) != "" {
				newStep.Arguments["url"] = websiteUrlPattern(rawURL)
			}
		}
		res = append(res, newStep)
	}
	return res
}

func GenerateWebsiteSkillContent(pb WebsitePlaybook) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## Website Site Memory\n- Site: `%s`\n- Base URL: `%s`\n", pb.SiteId, pb.BaseUrl))
	if strings.TrimSpace(pb.UpdatedAt) != "" {
		sb.WriteString(fmt.Sprintf("- Updated: `%s`\n", pb.UpdatedAt))
	}
	sb.WriteString(fmt.Sprintf("\n## Memory Status\n- Stored elements: %d\n- Known pages: %d\n\n## Elements\n", len(pb.Elements), len(pb.Pages)))
	elementNames := sortedWebsiteElementNames(pb.Elements)
	if len(elementNames) == 0 {
		sb.WriteString("- No element positions learned yet.\n")
	}
	for _, elementName := range elementNames {
		element := pb.Elements[elementName]
		sb.WriteString(fmt.Sprintf("- `%s` on `%s`: %s\n", element.Name, element.Page, displayWebsiteElementLabel(element)))
		if len(element.Selectors) > 0 {
			sb.WriteString(fmt.Sprintf("  - Selectors: %s\n", strings.Join(element.Selectors, ", ")))
		}
		if element.Position != nil {
			sb.WriteString(fmt.Sprintf("  - Position: x=%.0f y=%.0f w=%.0f h=%.0f\n", element.Position.X, element.Position.Y, element.Position.Width, element.Position.Height))
			if element.Position.DocumentX != 0 || element.Position.DocumentY != 0 {
				sb.WriteString(fmt.Sprintf("  - Document position: docX=%.0f docY=%.0f\n", element.Position.DocumentX, element.Position.DocumentY))
			}
		}
	}
	sb.WriteString("\n## Pages\n")
	pageNames := sortedWebsitePageNames(pb.Pages)
	if len(pageNames) == 0 {
		sb.WriteString("- No pages learned yet.\n")
	}
	for _, pageName := range pageNames {
		page := pb.Pages[pageName]
		sb.WriteString(fmt.Sprintf("- `%s`: %s\n", page.Name, strings.TrimSpace(page.Description)))
		if len(page.UrlPatterns) > 0 {
			sb.WriteString(fmt.Sprintf("  - URL patterns: %s\n", strings.Join(page.UrlPatterns, ", ")))
		}
	}
	sb.WriteString("\n## Execution Guidance\n- Match the current URL to Pages, reuse stored docX/docY/selectors for similar Elements, and fall back to browser_use_snapshot when memory is stale.\n")
	return sb.String()
}

func GenerateWebsiteSkillMd(pb WebsitePlaybook, description string) string {
	metaBytes, _ := json.Marshal(map[string]any{"openagent": map[string]any{"type": "website", "siteId": pb.SiteId}})
	return fmt.Sprintf("---\nname: %s\ndescription: '%s'\nhomepage: %s\nmetadata:\n  %s\n---\n%s",
		websiteSkillName(pb.SiteId), strings.ReplaceAll(description, "'", "''"), pb.BaseUrl, string(metaBytes), GenerateWebsiteSkillContent(pb))
}

func SyncWebsiteSkillFromPlaybook(skill *Skill, playbook WebsitePlaybook, displayName, description string) error {
	if strings.TrimSpace(description) == "" {
		description = fmt.Sprintf("Reusable site memory for %s", playbook.SiteId)
	}
	metadataBytes, err := json.Marshal(playbook)
	if err != nil {
		return err
	}
	skill.DisplayName = displayName
	skill.Type = "website"
	skill.Description = description
	skill.Homepage = playbook.BaseUrl
	skill.Metadata = string(metadataBytes)
	skill.Content = GenerateWebsiteSkillContent(playbook)
	skill.SkillMd = GenerateWebsiteSkillMd(playbook, description)
	skill.State = "Active"
	return nil
}

func firstStableWebsiteSelector(args map[string]any, selectors []string) string {
	if selector, ok := args["selector"].(string); ok && isStableWebsiteSelector(selector) {
		return strings.TrimSpace(selector)
	}
	for _, selector := range selectors {
		if isStableWebsiteSelector(selector) {
			return strings.TrimSpace(selector)
		}
	}
	return ""
}

func isStableWebsiteSelector(selector string) bool {
	selector = strings.TrimSpace(selector)
	if selector == "" {
		return false
	}
	switch selector {
	case "a", "button", "input", "textarea", "select", "span", "div":
		return false
	}
	return strings.ContainsAny(selector, `#.[="`) || (strings.Contains(selector, "[") && strings.Contains(selector, "]"))
}

func displayWebsiteElementLabel(element WebsiteElement) string {
	tag := strings.TrimSpace(element.Tag)
	if tag == "" {
		tag = strings.TrimSpace(element.Role)
	}
	if element.Position != nil {
		if element.Position.DocumentX != 0 || element.Position.DocumentY != 0 {
			return fmt.Sprintf("%s @ docY=%.0f docX=%.0f", tag, element.Position.DocumentY, element.Position.DocumentX)
		}
		return fmt.Sprintf("%s @ y=%.0f x=%.0f", tag, element.Position.Y, element.Position.X)
	}
	if tag != "" {
		return tag
	}
	return "element"
}

func websiteSkillName(siteId string) string {
	return fmt.Sprintf("website-%s", sanitizeSkillPart(siteId))
}

func sanitizeSkillPart(input string) string {
	normalized := strings.ToLower(strings.TrimPrefix(strings.TrimSpace(input), "www."))
	normalized = websiteSanitizeDash.ReplaceAllString(websiteSanitizePart.ReplaceAllString(normalized, "-"), "-")
	normalized = strings.Trim(normalized, "-.")
	if normalized == "" {
		return "unknown"
	}
	return normalized
}

func normalizeSite(rawURL string) (siteId, baseUrl string, err error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" {
		return "", "", fmt.Errorf("invalid url: %w", err)
	}
	siteId = strings.TrimPrefix(strings.ToLower(parsed.Hostname()), "www.")
	if siteId == "" {
		return "", "", fmt.Errorf("invalid url: host is empty")
	}
	scheme := parsed.Scheme
	if scheme == "" {
		scheme = "https"
	}
	return siteId, fmt.Sprintf("%s://%s", scheme, parsed.Host), nil
}

func appendUniqueSource(sources []PlaybookSource, source PlaybookSource) []PlaybookSource {
	key := source.MessageOwner + "/" + source.MessageName
	for _, existing := range sources {
		if existing.MessageOwner+"/"+existing.MessageName == key {
			return sources
		}
	}
	return append(sources, source)
}

func appendUniqueStrings(values []string, next ...string) []string {
	seen := map[string]bool{}
	res := make([]string, 0, len(values)+len(next))
	for _, value := range append(values, next...) {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		res = append(res, value)
	}
	return res
}

func collectWebsiteUrls(steps []LearnStep) []string {
	urls := []string{}
	for _, step := range steps {
		for _, key := range []string{"url", "current_url", "currentUrl", "page_url", "pageUrl"} {
			rawURL, ok := step.Arguments[key].(string)
			if ok && strings.TrimSpace(rawURL) != "" && !strings.Contains(rawURL, "{{var:") {
				urls = appendUniqueStrings(urls, rawURL)
			}
		}
	}
	return urls
}

func extractUrlsFromToolCallContent(content string) []string {
	content = normalizeToolCallTextContent(content)
	if content == "" {
		return nil
	}
	urls := []string{}
	for _, match := range websiteContentURLPattern.FindAllStringSubmatch(content, -1) {
		if len(match) < 2 {
			continue
		}
		raw := strings.TrimRight(strings.TrimSpace(match[1]), ".,;)")
		if raw != "" && !strings.Contains(raw, "{{var:") {
			urls = appendUniqueStrings(urls, raw)
		}
	}
	return urls
}

func collectWebsiteUrlsForLearn(steps []LearnStep, toolCalls []model.ToolCall) []string {
	urls := collectWebsiteUrls(steps)
	for _, tc := range toolCalls {
		if strings.HasPrefix(tc.Name, "browser_use_") {
			urls = appendUniqueStrings(urls, extractUrlsFromToolCallContent(tc.Content)...)
		}
	}
	return urls
}

func inferWebsitePageNameFromURL(rawURL string) string {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" {
		return ""
	}
	parts := cleanPathParts(parsed.Path)
	if len(parts) == 0 {
		return "default_page"
	}
	tokens := make([]string, 0, len(parts))
	for _, part := range parts {
		if websiteNumericPart.MatchString(part) {
			tokens = append(tokens, "id")
			continue
		}
		token := sanitizeSkillPart(part)
		if token == "" {
			token = "segment"
		}
		tokens = append(tokens, token)
	}
	return strings.Join(tokens, "_")
}

func inferWebsitePageNames(urls []string) []string {
	seen := map[string]bool{}
	names := []string{}
	for _, rawURL := range urls {
		name := inferWebsitePageNameFromURL(rawURL)
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		names = append(names, name)
	}
	if len(names) == 0 {
		return []string{"default_page"}
	}
	return names
}

func primaryWebsitePageName(urls []string) string {
	names := inferWebsitePageNames(urls)
	if len(names) == 0 {
		return "default_page"
	}
	for i := len(names) - 1; i >= 0; i-- {
		if names[i] != "default_page" {
			return names[i]
		}
	}
	return names[len(names)-1]
}

func upsertWebsitePages(memory WebsitePlaybook, urls []string, siteId, now string, delta *LearnDelta) WebsitePlaybook {
	if memory.Pages == nil {
		memory.Pages = map[string]WebsitePage{}
	}
	for _, rawURL := range urls {
		pageName := inferWebsitePageNameFromURL(rawURL)
		if pageName == "" {
			continue
		}
		if _, ok := memory.Pages[pageName]; !ok {
			delta.PagesAdded = appendUniqueStrings(delta.PagesAdded, pageName)
		}
		page := memory.Pages[pageName]
		if page.Name == "" {
			page.Name = pageName
			page.Description = describeWebsitePage(pageName, siteId)
		}
		page.LastSeenAt = now
		page.ObservedUrls = appendUniqueStrings(page.ObservedUrls, rawURL)
		if pattern := websiteUrlPattern(rawURL); pattern != "" {
			page.UrlPatterns = appendUniqueStrings(page.UrlPatterns, pattern)
		}
		memory.Pages[pageName] = page
	}
	return memory
}

func describeWebsitePage(pageName, siteId string) string {
	if pageName == "default_page" {
		return "Home page on " + siteId
	}
	return "Page " + strings.ReplaceAll(pageName, "_", "/") + " on " + siteId
}

func websiteUrlPattern(rawURL string) string {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil || parsed.Host == "" {
		return strings.TrimSpace(rawURL)
	}
	parts := cleanPathParts(parsed.Path)
	for i, part := range parts {
		if websiteNumericPart.MatchString(part) {
			parts[i] = "{{var:id}}"
		}
	}
	parsed.Path = "/" + strings.Join(parts, "/")
	if parsed.Path == "/" {
		return parsed.Scheme + "://" + parsed.Host + "/"
	}
	return parsed.Scheme + "://" + parsed.Host + parsed.Path
}

func cleanPathParts(path string) []string {
	parts := []string{}
	for _, part := range strings.Split(strings.Trim(path, "/"), "/") {
		if part = strings.TrimSpace(part); part != "" {
			parts = append(parts, part)
		}
	}
	return parts
}

func inferPageNameFromSnapshot(snapshotContent, fallback string) string {
	match := websiteSnapshotURLLine.FindStringSubmatch(strings.TrimSpace(snapshotContent))
	if len(match) >= 2 {
		if pageName := inferWebsitePageNameFromURL(strings.TrimSpace(match[1])); pageName != "" {
			return pageName
		}
	}
	return fallback
}

func hrefLooksInstanceSpecific(href string) bool {
	parsed, err := url.Parse(strings.TrimSpace(href))
	if err != nil {
		return false
	}
	for _, part := range cleanPathParts(parsed.Path) {
		if websiteNumericPart.MatchString(part) {
			return true
		}
	}
	return false
}

func hrefCSSSelector(href string) string {
	href = strings.TrimSpace(href)
	if href == "" {
		return ""
	}
	parsed, err := url.Parse(href)
	if err != nil || parsed.Path == "" {
		return ""
	}
	if parsed.Scheme != "" && parsed.Host != "" {
		return fmt.Sprintf(`a[href=%q]`, parsed.Scheme+"://"+parsed.Host+parsed.Path)
	}
	return fmt.Sprintf(`a[href=%q]`, parsed.Path)
}

func positionBucket(pos *ElementPosition) string {
	if pos == nil {
		return "unknown"
	}
	x, y := pos.X, pos.Y
	if pos.DocumentX != 0 || pos.DocumentY != 0 {
		x, y = pos.DocumentX, pos.DocumentY
	}
	return fmt.Sprintf("y%d_x%d", int((y+12)/25)*25, int((x+12)/25)*25)
}

func buildElementFromInteraction(step LearnStep, snapshotContent, pageName, now string) (WebsiteElement, bool) {
	if step.Tool != "browser_use_type" && step.Tool != "browser_use_click" && step.Tool != "browser_use_select_option" {
		return WebsiteElement{}, false
	}
	role := strings.TrimPrefix(step.Tool, "browser_use_")
	var snapEl ParsedSnapshotElement
	hasSnap := false
	if rawIndex, hasIndex := step.Arguments["index"]; hasIndex && strings.TrimSpace(snapshotContent) != "" {
		if index, ok := websiteArgumentInt(rawIndex, true); ok {
			snapEl, hasSnap = findSnapshotElementByIndex(snapshotContent, index)
		}
	}
	stepPos := elementPositionFromStepArguments(step.Arguments)
	stableSelector := firstStableWebsiteSelector(step.Arguments, nil)
	userTypedText := ""
	if step.Tool == "browser_use_type" {
		if t, ok := step.Arguments["text"].(string); ok && !strings.Contains(t, "{{var:") {
			userTypedText = strings.TrimSpace(t)
		}
	}
	if !shouldLearnGenericElement(step, snapEl, hasSnap, stepPos, stableSelector) {
		return WebsiteElement{}, false
	}
	text := ""
	if hasSnap {
		text = snapEl.Text
	}
	if step.Tool == "browser_use_type" && userTypedText != "" {
		text = userTypedText
	}
	tag := strings.ToLower(strings.TrimSpace(snapEl.Tag))
	if tag == "" {
		tag = tagFromStepArguments(step.Arguments, role, stableSelector)
	}
	pos := elementPositionFromSnap(snapEl, hasSnap)
	if pos == nil {
		pos = stepPos
	}
	name := genericElementName(pageName, role, tag, pos)
	if presetName, ok := step.Arguments["element"].(string); ok && strings.TrimSpace(presetName) != "" {
		name = strings.TrimSpace(presetName)
	}
	element := WebsiteElement{
		Name: name, Kind: role, Role: role, Label: tag, Text: text, Page: pageName,
		Description: fmt.Sprintf("%s at %s on %s", tag, positionBucket(pos), pageName), LastSeenAt: now,
	}
	if hasSnap {
		element.Tag = snapEl.Tag
		element.Href = snapEl.Href
		element.Placeholder = snapEl.Placeholder
		if snapEl.AriaLabel != "" && !isUserSpecificLabel(snapEl.AriaLabel, userTypedText) {
			element.AriaLabel = snapEl.AriaLabel
		}
	}
	element.Position = pos
	if stableSelector != "" {
		element.Selectors = []string{stableSelector}
	} else if selector, ok := step.Arguments["selector"].(string); ok && strings.TrimSpace(selector) != "" {
		element.Selectors = []string{strings.TrimSpace(selector)}
	}
	element.Selectors = appendUniqueStrings(element.Selectors, buildSelectorsFromElementMeta(element)...)
	return element, element.Name != "" && (len(element.Selectors) > 0 || element.Position != nil)
}

func elementPositionFromSnap(snapEl ParsedSnapshotElement, hasSnap bool) *ElementPosition {
	if !hasSnap {
		return nil
	}
	return &ElementPosition{X: snapEl.X, Y: snapEl.Y, Width: snapEl.W, Height: snapEl.H, DocumentX: snapEl.DocX, DocumentY: snapEl.DocY}
}

func elementPositionFromStepArguments(args map[string]any) *ElementPosition {
	docX, hasDocX := websiteArgumentFloat(args["docX"])
	docY, hasDocY := websiteArgumentFloat(args["docY"])
	if !hasDocX {
		docX, hasDocX = websiteArgumentFloat(args["x"])
	}
	if !hasDocY {
		docY, hasDocY = websiteArgumentFloat(args["y"])
	}
	if !hasDocX || !hasDocY {
		return nil
	}
	pos := &ElementPosition{DocumentX: docX, DocumentY: docY, X: docX, Y: docY}
	if width, ok := websiteArgumentFloat(args["width"]); ok {
		pos.Width = width
	}
	if height, ok := websiteArgumentFloat(args["height"]); ok {
		pos.Height = height
	}
	return pos
}

func tagFromStepArguments(args map[string]any, role, stableSelector string) string {
	if tag := tagFromWebsiteSelector(stableSelector); tag != "" {
		return tag
	}
	if selector, ok := args["selector"].(string); ok {
		if tag := tagFromWebsiteSelector(selector); tag != "" {
			return tag
		}
	}
	switch role {
	case "type":
		return "input"
	case "select_option":
		return "select"
	default:
		return "element"
	}
}

func tagFromWebsiteSelector(selector string) string {
	selector = strings.TrimSpace(selector)
	if selector == "" {
		return ""
	}
	if idx := strings.Index(selector, "["); idx > 0 {
		return strings.ToLower(selector[:idx])
	}
	switch strings.ToLower(selector) {
	case "a", "button", "input", "textarea", "select":
		return strings.ToLower(selector)
	}
	return ""
}

func shouldLearnGenericElement(step LearnStep, snapEl ParsedSnapshotElement, hasSnap bool, stepPos *ElementPosition, stableSelector string) bool {
	if !hasSnap {
		return stepPos != nil || stableSelector != ""
	}
	tag := strings.ToLower(strings.TrimSpace(snapEl.Tag))
	switch step.Tool {
	case "browser_use_type":
		return tag == "textarea" || tag == "input" || tag == "select"
	case "browser_use_select_option":
		return tag == "select"
	case "browser_use_click":
		return tag != "textarea" && tag != "input"
	default:
		return false
	}
}

func isUserSpecificLabel(label, userTypedText string) bool {
	label = strings.TrimSpace(label)
	return label != "" && (label == userTypedText || len([]rune(label)) > 40)
}

func genericElementName(pageName, role, tag string, pos *ElementPosition) string {
	if tag == "" {
		tag = "element"
	}
	name := sanitizeSkillPart(pageName) + "_" + sanitizeSkillPart(role) + "_" + sanitizeSkillPart(tag) + "_" + positionBucket(pos)
	if name == "" {
		name = sanitizeSkillPart(pageName + "_" + role + "_target")
	}
	return name
}

func elementCanonicalKey(element WebsiteElement) string {
	page := sanitizeSkillPart(element.Page)
	role := sanitizeSkillPart(element.Role)
	tag := sanitizeSkillPart(strings.ToLower(element.Tag))
	if page == "" || tag == "" {
		return ""
	}
	if role == "" {
		role = "click"
	}
	return page + "_" + role + "_" + tag + "_" + positionBucket(element.Position)
}

func buildSelectorsFromElementMeta(element WebsiteElement) []string {
	selectors := []string{}
	href := strings.TrimSpace(element.Href)
	if href != "" && !hrefLooksInstanceSpecific(href) {
		if sel := hrefCSSSelector(href); sel != "" {
			selectors = append(selectors, sel)
		}
	}
	if strings.TrimSpace(element.Placeholder) != "" {
		selectors = append(selectors, fmt.Sprintf(`[placeholder=%q]`, element.Placeholder))
	}
	if aria := strings.TrimSpace(element.AriaLabel); aria != "" && !isUserSpecificLabel(aria, element.Text) {
		selectors = append(selectors, fmt.Sprintf(`[aria-label=%q]`, aria))
	}
	if tag := strings.TrimSpace(element.Tag); tag != "" {
		selectors = append(selectors, tag)
	}
	return selectors
}

func isTargetInteractionStep(step LearnStep) bool {
	return step.Tool == "browser_use_click" || step.Tool == "browser_use_type" || step.Tool == "browser_use_select_option"
}

func websiteArgumentInt(value any, ok bool) (int, bool) {
	if !ok || value == nil {
		return 0, false
	}
	switch typed := value.(type) {
	case int:
		return typed, true
	case int64:
		return int(typed), true
	case float64:
		return int(typed), true
	case json.Number:
		parsed, err := typed.Int64()
		return int(parsed), err == nil
	default:
		return 0, false
	}
}

func websiteArgumentFloat(value any) (float64, bool) {
	if value == nil {
		return 0, false
	}
	switch typed := value.(type) {
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case int:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case json.Number:
		parsed, err := typed.Float64()
		return parsed, err == nil
	default:
		return 0, false
	}
}

func mergeWebsiteElement(existing, next WebsiteElement) WebsiteElement {
	if existing.Name == "" {
		return next
	}
	for _, pair := range []struct{ dst *string; src string }{
		{&existing.Role, next.Role}, {&existing.Label, next.Label}, {&existing.Text, next.Text}, {&existing.Tag, next.Tag},
		{&existing.Page, next.Page}, {&existing.Description, next.Description}, {&existing.AriaLabel, next.AriaLabel},
		{&existing.Placeholder, next.Placeholder}, {&existing.Href, next.Href}, {&existing.ParamVar, next.ParamVar},
	} {
		if strings.TrimSpace(*pair.dst) == "" {
			*pair.dst = pair.src
		}
	}
	if strings.TrimSpace(next.ParamHint) != "" {
		existing.ParamHint = next.ParamHint
	}
	if strings.TrimSpace(next.Kind) != "" {
		existing.Kind = next.Kind
	}
	if next.Position != nil {
		existing.Position = next.Position
	}
	existing.Selectors = appendUniqueStrings(existing.Selectors, next.Selectors...)
	existing.LastSeenAt = next.LastSeenAt
	return existing
}

func sortedWebsitePageNames(pages map[string]WebsitePage) []string {
	names := make([]string, 0, len(pages))
	for name := range pages {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func sortedWebsiteElementNames(elements map[string]WebsiteElement) []string {
	names := make([]string, 0, len(elements))
	for name := range elements {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func cloneArguments(args map[string]any) map[string]any {
	if args == nil {
		return map[string]any{}
	}
	res := make(map[string]any, len(args))
	for k, v := range args {
		res[k] = v
	}
	return res
}

func LearnWebsiteFromMessageWithDelta(owner, messageName string, opts LearnWebsiteOptions, lang string) (*LearnWebsiteResult, error) {
	result, existingSkill, err := buildWebsiteLearnResult(owner, messageName, opts)
	if err != nil {
		return nil, err
	}
	skillId := util.GetIdFromOwnerAndName("admin", result.Skill.Name)
	if existingSkill != nil {
		ok, err := UpdateSkill(skillId, result.Skill)
		if err != nil || !ok {
			if err != nil {
				return nil, err
			}
			return nil, fmt.Errorf("failed to update skill: %s", skillId)
		}
	} else if ok, err := AddSkill(result.Skill); err != nil || !ok {
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("failed to add skill: %s", skillId)
	}
	return result, nil
}

func buildWebsiteLearnResult(owner, messageName string, opts LearnWebsiteOptions) (*LearnWebsiteResult, *Skill, error) {
	messageId := util.GetIdFromOwnerAndName(owner, messageName)
	msg, err := GetMessage(messageId)
	if err != nil {
		return nil, nil, err
	}
	if msg == nil {
		return nil, nil, fmt.Errorf("message not found: %s", messageId)
	}
	if msg.Author != "AI" {
		return nil, nil, fmt.Errorf("only assistant message can be learned")
	}
	if len(msg.ToolCalls) == 0 {
		return nil, nil, fmt.Errorf("message has no tool calls")
	}
	steps := PrepareBrowserUseLearnSteps(msg.ToolCalls)
	if len(steps) == 0 {
		return nil, nil, fmt.Errorf("no browser_use steps found")
	}
	siteId, baseUrl, err := InferSiteFromBrowserUse(steps, msg.ToolCalls)
	if err != nil {
		return nil, nil, err
	}
	steps = ParameterizeSteps(steps)
	displayName := strings.TrimSpace(opts.DisplayName)
	if displayName == "" {
		displayName = fmt.Sprintf("%s site memory", siteId)
	}
	skillName := websiteSkillName(siteId)
	existingSkill, err := GetSkill(util.GetIdFromOwnerAndName("admin", skillName))
	if err != nil {
		return nil, nil, err
	}
	playbook := WebsitePlaybook{}
	if existingSkill != nil && strings.TrimSpace(existingSkill.Metadata) != "" {
		if playbook, err = ParseWebsitePlaybook(existingSkill.Metadata); err != nil {
			return nil, nil, fmt.Errorf("failed to parse existing website memory: %w", err)
		}
	}
	source := PlaybookSource{MessageOwner: owner, MessageName: messageName, LearnedAt: util.GetCurrentTime()}
	playbook, delta := MergeWebsiteMemory(playbook, siteId, baseUrl, source, steps, msg.ToolCalls)
	skill := &Skill{Owner: "admin", Name: skillName, CreatedTime: util.GetCurrentTime()}
	if existingSkill != nil {
		skill.CreatedTime = existingSkill.CreatedTime
		if strings.TrimSpace(existingSkill.DisplayName) != "" {
			displayName = existingSkill.DisplayName
		}
	}
	if err := SyncWebsiteSkillFromPlaybook(skill, playbook, displayName, fmt.Sprintf("Reusable site memory for %s", siteId)); err != nil {
		return nil, nil, err
	}
	return &LearnWebsiteResult{Skill: skill, Playbook: playbook, Delta: delta}, existingSkill, nil
}

func ConsolidateWebsiteMemory(skillId, lang string) (*Skill, []ElementMergeRecord, error) {
	skill, err := GetSkill(skillId)
	if err != nil {
		return nil, nil, err
	}
	if skill == nil {
		return nil, nil, fmt.Errorf("skill not found")
	}
	if skill.Type != "website" {
		return nil, nil, fmt.Errorf("skill is not a website knowledge")
	}
	playbook, err := ParseWebsitePlaybook(skill.Metadata)
	if err != nil {
		return nil, nil, err
	}
	playbook, records := DedupWebsiteElements(playbook)
	if err := SyncWebsiteSkillFromPlaybook(skill, playbook, skill.DisplayName, skill.Description); err != nil {
		return nil, nil, err
	}
	ok, err := UpdateSkill(skillId, skill)
	if err != nil || !ok {
		if err != nil {
			return nil, nil, err
		}
		return nil, nil, fmt.Errorf("failed to update website knowledge")
	}
	return skill, records, nil
}

func MergeWebsiteMemory(memory WebsitePlaybook, siteId, baseUrl string, source PlaybookSource, steps []LearnStep, toolCalls []model.ToolCall) (WebsitePlaybook, LearnDelta) {
	now := source.LearnedAt
	if now == "" {
		now = util.GetCurrentTime()
		source.LearnedAt = now
	}
	delta := LearnDelta{SiteId: siteId}
	memory = NormalizePlaybook(memory)
	memory.Version = WebsitePlaybookVersionV4
	memory.SiteId = siteId
	memory.BaseUrl = baseUrl
	memory.UpdatedAt = now
	memory.Source = source
	memory.Sources = appendUniqueSource(memory.Sources, source)
	if memory.Pages == nil {
		memory.Pages = map[string]WebsitePage{}
	}
	if memory.Elements == nil {
		memory.Elements = map[string]WebsiteElement{}
	}
	observedUrls := collectWebsiteUrlsForLearn(steps, toolCalls)
	pageName := primaryWebsitePageName(observedUrls)
	delta.DetectedPages = inferWebsitePageNames(observedUrls)
	delta.DetectedUrls = append([]string{}, observedUrls...)
	memory = upsertWebsitePages(memory, observedUrls, siteId, now, &delta)
	snapshots := buildSnapshotTimeline(toolCalls)
	beforeElements := map[string]WebsiteElement{}
	for name, el := range memory.Elements {
		beforeElements[name] = el
	}
	snapshotIdx := 0
	for _, step := range steps {
		if stepProvidesSnapshot(step) {
			if snapshotIdx < len(snapshots) {
				snapshotIdx++
			}
			continue
		}
		if !isTargetInteractionStep(step) {
			continue
		}
		element, ok := buildElementFromInteraction(step, snapshotBeforeStep(snapshots, snapshotIdx), inferPageNameFromSnapshot(snapshotBeforeStep(snapshots, snapshotIdx), pageName), now)
		if !ok {
			continue
		}
		existing := memory.Elements[element.Name]
		if _, wasNew := beforeElements[element.Name]; !wasNew && existing.Name != "" {
			delta.ElementsUpdated = appendUniqueStrings(delta.ElementsUpdated, element.Name)
		} else if existing.Name == "" {
			delta.ElementsAdded = appendUniqueStrings(delta.ElementsAdded, element.Name)
		}
		memory.Elements[element.Name] = mergeWebsiteElement(existing, element)
	}
	var dedupRecords []ElementMergeRecord
	memory, dedupRecords = DedupWebsiteElements(memory)
	delta.ElementsMerged = append(delta.ElementsMerged, dedupRecords...)
	return memory, delta
}
