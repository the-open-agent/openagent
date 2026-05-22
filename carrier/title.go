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

package carrier

import (
	"regexp"
	"strings"
)

const (
	// TitleDivider separates the model answer body from the generated chat title.
	TitleDivider = "====="
	// FallbackTitleMaxRunes is the maximum length of a fallback title derived from the user's first message.
	FallbackTitleMaxRunes = 16
	// MaxChatDisplayNameRunes matches object.Chat.DisplayName varchar(100).
	MaxChatDisplayNameRunes = 100
)

var (
	htmlTagRegexp        = regexp.MustCompile(`(?is)<[^>]+>`)
	whitespaceRegexp     = regexp.MustCompile(`\s+`)
	suggestionLeakRegexp = regexp.MustCompile(`\|\|\|`)
)

type TitleCarrier struct {
	divider   string
	needTitle bool
}

func NewTitleCarrier(needTitle bool) (*TitleCarrier, error) {
	return &TitleCarrier{divider: TitleDivider, needTitle: needTitle}, nil
}

func (p *TitleCarrier) GetQuestion(question string) (string, error) {
	if !p.needTitle {
		return question, nil
	}

	format := "<title>"
	question = question +
		"\n\n**At the end of your answer, you MUST append a clear, concise, and meaningful topic title based on both the user's input and your response.**\n" +
		"A meaningful topic title should be able to represent the user's purpose or the overall theme of this conversation.\n" +
		"Examples of generated title:\n" +
		"\tquery: what is openagent? title: introduction to openagent\n" +
		"It should appear at the very end of the response, prefixed by: " + p.divider + "\n" +
		"Only skip the divider and title when the user's message is completely empty.\n" +
		"Format:\n<Your complete answer>\n" + p.divider + format + "\n"

	return question, nil
}

func (p *TitleCarrier) ParseAnswer(answer string) (string, []string, error) {
	if !p.needTitle {
		return answer, []string{""}, nil
	}

	parts := strings.Split(answer, p.divider)
	if len(parts) < 2 {
		return answer, []string{""}, nil
	}

	parsedAnswer := parts[0]
	title := normalizeAITitle(parts[1])

	return parsedAnswer, []string{title}, nil
}

// ResolveChatTitle prefers the AI-generated title and falls back to a truncated user message.
func ResolveChatTitle(aiTitle, userMessage string) string {
	aiTitle = normalizeAITitle(aiTitle)
	if aiTitle != "" {
		return truncateRunes(aiTitle, MaxChatDisplayNameRunes, false)
	}

	fallback := FallbackTitleFromUserMessage(userMessage, FallbackTitleMaxRunes)
	return truncateRunes(fallback, MaxChatDisplayNameRunes, false)
}

// FallbackTitleFromUserMessage builds a sidebar title from the first user message when the model omits one.
func FallbackTitleFromUserMessage(text string, maxRunes int) string {
	if maxRunes <= 0 {
		maxRunes = FallbackTitleMaxRunes
	}
	text = SanitizeUserMessageForTitle(text)
	if text == "" {
		return ""
	}
	return truncateRunes(text, maxRunes, true)
}

// SanitizeUserMessageForTitle strips markup and collapses whitespace for title fallback input.
// The tag regex is intentionally simple: user messages rarely contain complex HTML, and
// attributes with ">" inside quoted values are a known limitation.
func SanitizeUserMessageForTitle(text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}

	text = htmlTagRegexp.ReplaceAllString(text, " ")
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\n", " ")
	text = whitespaceRegexp.ReplaceAllString(text, " ")
	return strings.TrimSpace(text)
}

func normalizeAITitle(title string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return ""
	}
	if idx := strings.IndexAny(title, "\r\n"); idx >= 0 {
		title = title[:idx]
	}
	if suggestionLeakRegexp.MatchString(title) {
		title = suggestionLeakRegexp.Split(title, 2)[0]
	}
	return strings.TrimSpace(title)
}

func truncateRunes(text string, maxRunes int, withEllipsis bool) string {
	if maxRunes <= 0 || text == "" {
		return ""
	}

	runes := []rune(text)
	if len(runes) <= maxRunes {
		return text
	}
	if withEllipsis && maxRunes > 1 {
		return string(runes[:maxRunes-1]) + "…"
	}
	return string(runes[:maxRunes])
}
