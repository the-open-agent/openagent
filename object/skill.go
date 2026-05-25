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
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/the-open-agent/openagent/util"
	"xorm.io/core"
)

// SkillReference represents a single file inside a skill's references/ directory.
type SkillReference struct {
	Name    string `json:"name"`    // filename, e.g. "get-started.md"
	Content string `json:"content"` // full file content
}

// Skill is a reusable capability definition.
//
// When loaded from a standard skill folder the fields map as follows:
//   - SkillMd     ← full raw SKILL.md text (front matter + body)
//   - Content     ← markdown body of SKILL.md (after front matter), injected into system prompt
//   - Description ← "description" field from front matter
//   - Homepage    ← "homepage" field from front matter
//   - Emoji       ← metadata.openclaw.emoji extracted from front matter
//   - Metadata    ← raw "metadata:" block text from front matter
//   - References  ← every file found in references/ directory
type Skill struct {
	Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
	Name        string `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedTime string `xorm:"varchar(100)" json:"createdTime"`

	DisplayName string           `xorm:"varchar(200)" json:"displayName"`
	Type        string           `xorm:"varchar(100)" json:"type"`
	Description string           `xorm:"mediumtext" json:"description"`
	Homepage    string           `xorm:"varchar(500)" json:"homepage"`
	Emoji       string           `xorm:"varchar(50)" json:"emoji"`
	Metadata    string           `xorm:"mediumtext" json:"metadata"`
	Content     string           `xorm:"mediumtext" json:"content"`
	SkillMd     string           `xorm:"mediumtext" json:"skillMd"`
	References  []SkillReference `xorm:"mediumtext" json:"references"`

	State string `xorm:"varchar(100)" json:"state"`
}

func (s *Skill) GetId() string {
	return fmt.Sprintf("%s/%s", s.Owner, s.Name)
}

// ---------------------------------------------------------------------------
// SKILL.md front-matter parser
// ---------------------------------------------------------------------------

// parseSkillMd parses a raw SKILL.md file and returns its structured fields.
// Front-matter format:
//
//	---
//	name: <name>
//	description: '<desc>'   # may be single/double quoted or bare
//	homepage: <url>         # optional
//	metadata:               # optional JSON5-ish block
//	  { ... }
//	---
//	<markdown body>
func parseSkillMd(raw string) (name, description, homepage, metadata, emoji, body string) {
	// Must start with "---"
	trimmed := strings.TrimLeft(raw, " \t")
	if !strings.HasPrefix(trimmed, "---") {
		body = raw
		return
	}

	// Skip the opening "---" line
	afterOpen := raw[strings.Index(raw, "---")+3:]
	newlineIdx := strings.Index(afterOpen, "\n")
	if newlineIdx >= 0 {
		afterOpen = afterOpen[newlineIdx+1:]
	}

	// Find closing "---"
	closingIdx := strings.Index(afterOpen, "\n---")
	if closingIdx < 0 {
		body = raw
		return
	}

	frontMatter := afterOpen[:closingIdx]
	body = strings.TrimSpace(afterOpen[closingIdx+4:]) // skip "\n---"

	// -----------------------------------------------------------------------
	// Parse front-matter line by line.
	// We handle:
	//   key: bare value
	//   key: 'single-quoted value'
	//   key: "double-quoted value"
	//   metadata: <multi-line block until next top-level key or EOF>
	// -----------------------------------------------------------------------
	lines := strings.Split(frontMatter, "\n")
	var metaLines []string
	inMetadata := false

	for _, line := range lines {
		// A top-level key starts at column 0 with no leading whitespace
		// and contains at least one word character before the colon.
		isTopKey := len(line) > 0 && line[0] != ' ' && line[0] != '\t' && strings.Contains(line, ":")

		if isTopKey {
			key, val, _ := strings.Cut(line, ":")
			key = strings.TrimSpace(key)
			val = strings.TrimSpace(val)

			switch key {
			case "name":
				name = unquote(val)
				inMetadata = false
			case "description":
				description = unquote(val)
				inMetadata = false
			case "homepage":
				homepage = unquote(val)
				inMetadata = false
			case "metadata":
				inMetadata = true
				metaLines = nil
				if val != "" {
					metaLines = append(metaLines, val)
				}
			default:
				inMetadata = false
			}
		} else if inMetadata {
			metaLines = append(metaLines, line)
		}
	}

	metadata = strings.Join(metaLines, "\n")

	// Extract emoji: look for  "emoji": "<value>"
	if m := regexp.MustCompile(`"emoji"\s*:\s*"([^"]+)"`).FindStringSubmatch(metadata); len(m) > 1 {
		emoji = m[1]
	}

	return
}

// unquote strips surrounding single or double quotes from a YAML string value.
func unquote(s string) string {
	s = strings.TrimSpace(s)
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
			return s[1 : len(s)-1]
		}
	}
	return s
}

// ---------------------------------------------------------------------------
// LoadSkillFromPath reads a skill folder from the server filesystem and
// returns a partially-populated Skill (not yet persisted to the database).
// ---------------------------------------------------------------------------

// LoadSkill reads {dir}/SKILL.md and all {dir}/references/*.md files,
// parses them, and returns a Skill struct ready to be saved with AddSkill.
func LoadSkill(dir string) (*Skill, error) {
	skillMdPath := filepath.Join(dir, "SKILL.md")
	rawBytes, err := os.ReadFile(skillMdPath)
	if err != nil {
		return nil, fmt.Errorf("cannot read SKILL.md at %s: %w", skillMdPath, err)
	}
	raw := string(rawBytes)

	name, description, homepage, metadata, emoji, content := parseSkillMd(raw)
	if name == "" {
		// Fall back to directory base-name
		name = filepath.Base(dir)
	}

	// Read references/
	var refs []SkillReference
	refsDir := filepath.Join(dir, "references")
	if entries, err2 := os.ReadDir(refsDir); err2 == nil {
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			refPath := filepath.Join(refsDir, e.Name())
			refBytes, err3 := os.ReadFile(refPath)
			if err3 != nil {
				continue
			}
			refs = append(refs, SkillReference{
				Name:    e.Name(),
				Content: string(refBytes),
			})
		}
	}

	return &Skill{
		Name:        name,
		DisplayName: name,
		Type:        "custom",
		Description: description,
		Homepage:    homepage,
		Emoji:       emoji,
		Metadata:    metadata,
		Content:     content,
		SkillMd:     raw,
		References:  refs,
		State:       "Active",
	}, nil
}

// ---------------------------------------------------------------------------
// Standard CRUD
// ---------------------------------------------------------------------------

func GetGlobalSkills() ([]*Skill, error) {
	skills := []*Skill{}
	err := adapter.engine.Asc("owner").Desc("created_time").Find(&skills)
	return skills, err
}

func GetSkills(owner string) ([]*Skill, error) {
	skills := []*Skill{}
	err := adapter.engine.Desc("created_time").Find(&skills, &Skill{Owner: owner})
	return skills, err
}

func getSkill(owner string, name string) (*Skill, error) {
	s := Skill{Owner: owner, Name: name}
	existed, err := adapter.engine.Get(&s)
	if err != nil {
		return &s, err
	}
	if existed {
		return &s, nil
	}
	return nil, nil
}

func GetSkill(id string) (*Skill, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return nil, err
	}
	return getSkill(owner, name)
}

func GetSkillByOwnerAndName(owner string, nameOrId string) (*Skill, error) {
	if nameOrId == "" {
		return nil, nil
	}
	var id string
	if _, _, err := util.GetOwnerAndNameFromIdWithError(nameOrId); err == nil {
		id = nameOrId
	} else {
		id = util.GetIdFromOwnerAndName(owner, nameOrId)
	}
	s, err := GetSkill(id)
	if err != nil {
		return nil, err
	}
	if s != nil {
		return s, nil
	}
	if owner != "admin" && !strings.Contains(nameOrId, "/") {
		return GetSkill(util.GetIdFromOwnerAndName("admin", nameOrId))
	}
	return nil, nil
}

func GetSkillCount(owner, field, value string) (int64, error) {
	session := GetDbSession(owner, -1, -1, field, value, "", "")
	return session.Count(&Skill{})
}

func GetPaginationSkills(owner string, offset, limit int, field, value, sortField, sortOrder string) ([]*Skill, error) {
	skills := []*Skill{}
	session := GetDbSession(owner, offset, limit, field, value, sortField, sortOrder)
	err := session.Find(&skills)
	return skills, err
}

func UpdateSkill(id string, s *Skill) (bool, error) {
	owner, name, err := util.GetOwnerAndNameFromIdWithError(id)
	if err != nil {
		return false, err
	}
	skillDb, err := getSkill(owner, name)
	if err != nil {
		return false, err
	}
	if s == nil || skillDb == nil {
		return false, nil
	}

	_, err = adapter.engine.ID(core.PK{owner, name}).AllCols().Update(s)
	if err != nil {
		return false, err
	}
	return true, nil
}

func AddSkill(s *Skill) (bool, error) {
	affected, err := adapter.engine.Insert(s)
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func DeleteSkill(s *Skill) (bool, error) {
	affected, err := adapter.engine.ID(core.PK{s.Owner, s.Name}).Delete(&Skill{})
	if err != nil {
		return false, err
	}
	return affected != 0, nil
}

func resolveEnabledSkills(owner string, skillNames []string) ([]*Skill, error) {
	if len(skillNames) == 0 {
		return nil, nil
	}

	hasAll := false
	var names []string
	for _, name := range skillNames {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if name == "All" {
			hasAll = true
			continue
		}
		names = append(names, name)
	}
	if hasAll {
		return GetSkills(owner)
	}

	var skills []*Skill
	seen := map[string]bool{}
	for _, name := range names {
		s, err := GetSkillByOwnerAndName(owner, name)
		if err != nil {
			return nil, err
		}
		if s == nil {
			continue
		}

		id := s.GetId()
		if seen[id] {
			continue
		}
		seen[id] = true
		skills = append(skills, s)
	}

	return skills, nil
}

func skillNameMatches(s *Skill, skillName string) bool {
	if s == nil {
		return false
	}

	skillName = strings.TrimSpace(skillName)
	if skillName == "" {
		return false
	}

	if skillName == s.Name || skillName == s.GetId() {
		return true
	}

	owner, name, err := util.GetOwnerAndNameFromIdWithError(skillName)
	return err == nil && owner == s.Owner && name == s.Name
}

func GetSkillsCatalog(owner string, skillNames []string) (string, error) {
	if len(skillNames) == 0 {
		return "", nil
	}

	skills, err := resolveEnabledSkills(owner, skillNames)
	if err != nil {
		return "", err
	}

	var items []string
	var websiteItems []string
	for _, s := range skills {
		if s == nil || s.State != "Active" {
			continue
		}

		parts := []string{fmt.Sprintf("- %s", s.Name)}
		if strings.TrimSpace(s.Description) != "" {
			parts = append(parts, fmt.Sprintf("description: %s", strings.TrimSpace(s.Description)))
		}
		if strings.TrimSpace(s.Type) != "" {
			parts = append(parts, fmt.Sprintf("type: %s", strings.TrimSpace(s.Type)))
		}

		refNames := make([]string, 0, len(s.References))
		for _, ref := range s.References {
			if strings.TrimSpace(ref.Name) != "" {
				refNames = append(refNames, ref.Name)
			}
		}
		sort.Strings(refNames)
		if len(refNames) > 0 {
			parts = append(parts, fmt.Sprintf("references: %s", strings.Join(refNames, ", ")))
		}

		items = append(items, strings.Join(parts, " | "))
		if s.Type == "website" {
			if websiteSummary := formatWebsiteCatalogSummary(s); websiteSummary != "" {
				websiteItems = append(websiteItems, websiteSummary)
			}
		}
	}

	if len(items) == 0 {
		return "", nil
	}

	catalog := "## Skills Usage Rules\n" +
		"- If the user explicitly mentions a skill by name, you MUST call load_skill for that skill before answering.\n" +
		"- If the user's request is clearly about a listed skill's domain, you MUST load that skill before giving procedural, policy, workflow, or step-by-step guidance.\n" +
		"- For website-type skills, match by site/domain/homepage/URL, even when the user does not mention the skill name. Before operating on a matching site, load the website skill automatically.\n" +
		"- After loading a website skill, reuse stored element docX/docY/selectors from the Elements section when a similar control appears on the current page. Fall back to normal browser_use_open/snapshot/click/type when memory is missing, stale, or the click fails.\n" +
		"- Do not answer from general memory when a relevant listed skill exists but has not been loaded.\n" +
		"- If the user asks what skills are available, answer from the catalog below instead of giving a generic summary of your broad abilities.\n\n" +
		"## Skills Catalog\n" +
		"You have access to the following skills. Do not assume all details are already loaded. If a skill looks relevant, call the load_skill tool to load its full instructions before relying on it.\n\n" +
		strings.Join(items, "\n")

	if len(websiteItems) > 0 {
		catalog += "\n\n## Website Knowledge Reuse\nAuto-load matching website skills and reuse stored element positions before taking a fresh snapshot.\n\n" + strings.Join(websiteItems, "\n\n")
	}

	return catalog, nil
}

func formatWebsiteCatalogSummary(s *Skill) string {
	if s == nil || strings.TrimSpace(s.Metadata) == "" {
		return ""
	}
	playbook, err := ParseWebsitePlaybook(s.Metadata)
	if err != nil || playbook.SiteId == "" || len(playbook.Elements) == 0 {
		return ""
	}
	lines := []string{
		fmt.Sprintf("### Website site memory: %s", playbook.SiteId),
		fmt.Sprintf("- Match: `%s` / `%s`", playbook.SiteId, playbook.BaseUrl),
		fmt.Sprintf("- Stored elements: %d; known pages: %d", len(playbook.Elements), len(playbook.Pages)),
	}
	pageElements := map[string][]string{}
	for _, elementName := range sortedWebsiteElementNames(playbook.Elements) {
		element := playbook.Elements[elementName]
		page := strings.TrimSpace(element.Page)
		if page == "" {
			page = "unknown_page"
		}
		summary := "`" + elementName + "`"
		if len(element.Selectors) > 0 {
			summary += " selectors: " + strings.Join(element.Selectors, ", ")
		}
		if element.Position != nil {
			summary += fmt.Sprintf(" position: x=%.0f y=%.0f", element.Position.X, element.Position.Y)
			if element.Position.DocumentX != 0 || element.Position.DocumentY != 0 {
				summary += fmt.Sprintf(" docX=%.0f docY=%.0f", element.Position.DocumentX, element.Position.DocumentY)
			}
		}
		pageElements[page] = append(pageElements[page], summary)
	}
	pages := make([]string, 0, len(pageElements))
	for page := range pageElements {
		pages = append(pages, page)
	}
	sort.Strings(pages)
	for _, page := range pages {
		lines = append(lines, "- Page `"+page+"`:")
		for _, item := range pageElements[page] {
			lines = append(lines, "  - "+item)
		}
	}
	lines = append(lines, "- Usage: reuse docX/docY for matching elements; fall back to normal browser steps when stale.")
	return strings.Join(lines, "\n")
}

func LoadSkillPromptContent(owner string, skillName string, referenceName string) (string, error) {
	s, err := GetSkillByOwnerAndName(owner, skillName)
	if err != nil {
		return "", err
	}
	if s == nil {
		return "", fmt.Errorf("skill not found: %s", skillName)
	}
	if s.State != "Active" {
		return "", fmt.Errorf("skill is not active: %s", skillName)
	}

	buf := strings.TrimSpace(s.Content)
	if referenceName == "" {
		if s.Type == "website" {
			execGuide := buildWebsiteSkillExecutionGuide(s)
			if execGuide != "" {
				if buf != "" {
					buf += "\n\n"
				}
				buf += execGuide
			}
		}

		if len(s.References) > 0 {
			refNames := make([]string, 0, len(s.References))
			for _, ref := range s.References {
				if strings.TrimSpace(ref.Name) != "" {
					refNames = append(refNames, ref.Name)
				}
			}
			sort.Strings(refNames)
			if len(refNames) > 0 {
				buf += "\n\n## Available References\n"
				for _, name := range refNames {
					buf += "- " + name + "\n"
				}
			}
		}
		return strings.TrimSpace(buf), nil
	}

	for _, ref := range s.References {
		if ref.Name == referenceName {
			if strings.TrimSpace(ref.Content) == "" {
				return "", fmt.Errorf("reference is empty: %s", referenceName)
			}
			if buf != "" {
				buf += "\n\n"
			}
			buf += "## Reference: " + ref.Name + "\n\n" + strings.TrimSpace(ref.Content)
			return strings.TrimSpace(buf), nil
		}
	}

	return "", fmt.Errorf("reference not found: %s", referenceName)
}

func buildWebsiteSkillExecutionGuide(s *Skill) string {
	if s == nil || strings.TrimSpace(s.Metadata) == "" {
		return ""
	}

	playbook, err := ParseWebsitePlaybook(s.Metadata)
	if err != nil {
		return ""
	}
	if len(playbook.Elements) == 0 {
		return ""
	}

	return "## Execution\n" +
		"1. Match the current URL to Pages/Elements and reuse stored docX/docY or selectors for similar controls.\n" +
		"2. Do not replay a fixed workflow; pick only elements that fit the current request.\n" +
		"3. Fall back to browser_use_open/snapshot/click/type when memory is stale, then save a fresh trace to refresh this memory.\n"
}

type skillLoader struct{}

func (skillLoader) Load(owner string, allowedSkillNames []string, skillName string, referenceName string) (string, error) {
	if len(allowedSkillNames) > 0 {
		skills, err := resolveEnabledSkills(owner, allowedSkillNames)
		if err != nil {
			return "", err
		}

		allowed := false
		for _, s := range skills {
			if skillNameMatches(s, skillName) {
				allowed = true
				break
			}
		}
		if !allowed {
			return "", fmt.Errorf("skill is not enabled for this store: %s", skillName)
		}
	}
	return LoadSkillPromptContent(owner, skillName, referenceName)
}
