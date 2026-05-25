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
	"strings"
)

const WebsitePlaybookVersionV4 = 4

type WebsitePlaybook struct {
	SiteId     string                    `json:"siteId"`
	BaseUrl    string                    `json:"baseUrl"`
	Version    int                       `json:"version"`
	UpdatedAt  string                    `json:"updatedAt,omitempty"`
	Source     PlaybookSource            `json:"source,omitempty"`
	Sources    []PlaybookSource          `json:"sources,omitempty"`
	Pages      map[string]WebsitePage    `json:"pages,omitempty"`
	Elements   map[string]WebsiteElement `json:"elements,omitempty"`
}

type PlaybookSource struct {
	MessageOwner string `json:"messageOwner"`
	MessageName  string `json:"messageName"`
	LearnedAt    string `json:"learnedAt"`
}

type WebsitePage struct {
	Name         string   `json:"name"`
	Description  string   `json:"description,omitempty"`
	UrlPatterns  []string `json:"urlPatterns,omitempty"`
	ObservedUrls []string `json:"observedUrls,omitempty"`
	LastSeenAt   string   `json:"lastSeenAt,omitempty"`
}

type ElementPosition struct {
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Width     float64 `json:"width"`
	Height    float64 `json:"height"`
	DocumentX float64 `json:"documentX,omitempty"`
	DocumentY float64 `json:"documentY,omitempty"`
}

type WebsiteElement struct {
	Name        string           `json:"name"`
	Kind        string           `json:"kind,omitempty"`
	Role        string           `json:"role,omitempty"`
	Label       string           `json:"label,omitempty"`
	Text        string           `json:"text,omitempty"`
	Tag         string           `json:"tag,omitempty"`
	Selectors   []string         `json:"selectors,omitempty"`
	Position    *ElementPosition `json:"position,omitempty"`
	AriaLabel   string           `json:"ariaLabel,omitempty"`
	Placeholder string           `json:"placeholder,omitempty"`
	Href        string           `json:"href,omitempty"`
	ParamVar    string           `json:"paramVar,omitempty"`
	ParamHint   string           `json:"paramHint,omitempty"`
	Page        string           `json:"page,omitempty"`
	Description string           `json:"description,omitempty"`
	LastSeenAt  string           `json:"lastSeenAt,omitempty"`
}

type LearnDelta struct {
	SiteId          string               `json:"siteId"`
	PagesAdded      []string             `json:"pagesAdded,omitempty"`
	ElementsAdded   []string             `json:"elementsAdded,omitempty"`
	ElementsUpdated []string             `json:"elementsUpdated,omitempty"`
	ElementsMerged  []ElementMergeRecord `json:"elementsMerged,omitempty"`
	DetectedPages   []string             `json:"detectedPages,omitempty"`
	DetectedUrls    []string             `json:"detectedUrls,omitempty"`
}

type ElementMergeRecord struct {
	FromElement string `json:"fromElement"`
	IntoElement string `json:"intoElement"`
	Reason      string `json:"reason,omitempty"`
}

type LearnWebsiteResult struct {
	Skill    *Skill
	Playbook WebsitePlaybook
	Delta    LearnDelta
}

type LearnStep struct {
	Tool      string
	Arguments map[string]any
}

func ParseWebsitePlaybook(metadata string) (WebsitePlaybook, error) {
	metadata = strings.TrimSpace(metadata)
	if metadata == "" {
		return WebsitePlaybook{}, nil
	}
	var pb WebsitePlaybook
	if err := json.Unmarshal([]byte(metadata), &pb); err != nil {
		return WebsitePlaybook{}, err
	}
	return NormalizePlaybook(pb), nil
}

func NormalizePlaybook(pb WebsitePlaybook) WebsitePlaybook {
	pb.Version = WebsitePlaybookVersionV4
	if pb.Elements == nil {
		pb.Elements = map[string]WebsiteElement{}
	}
	if pb.Pages == nil {
		pb.Pages = map[string]WebsitePage{}
	}
	return pb
}

func DedupWebsiteElements(pb WebsitePlaybook) (WebsitePlaybook, []ElementMergeRecord) {
	pb = NormalizePlaybook(pb)
	records := []ElementMergeRecord{}
	if len(pb.Elements) == 0 {
		return pb, records
	}
	canonicalToName := map[string]string{}
	mergedAway := map[string]bool{}
	for _, name := range sortedWebsiteElementNames(pb.Elements) {
		if mergedAway[name] {
			continue
		}
		element := pb.Elements[name]
		key := elementCanonicalKey(element)
		if key == "" {
			continue
		}
		if existingName, ok := canonicalToName[key]; ok && existingName != name {
			pb.Elements[existingName] = mergeWebsiteElement(pb.Elements[existingName], element)
			delete(pb.Elements, name)
			mergedAway[name] = true
			records = append(records, ElementMergeRecord{FromElement: name, IntoElement: existingName, Reason: "same page/tag role"})
			continue
		}
		canonicalToName[key] = name
	}
	return pb, records
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
