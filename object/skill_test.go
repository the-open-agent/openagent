package object

import "testing"

func TestParseSkillMd_AllowsLeadingWhitespaceBeforeFrontMatter(t *testing.T) {
	raw := `

    ---
name: test-skill
description: "hello"
homepage: https://example.com
metadata:
  { "openclaw": { "emoji": "🧪" } }
---
# Body
Some content
`

	name, description, homepage, metadata, emoji, body := parseSkillMd(raw)
	if name != "test-skill" {
		t.Fatalf("name=%q, want %q", name, "test-skill")
	}
	if description != "hello" {
		t.Fatalf("description=%q, want %q", description, "hello")
	}
	if homepage != "https://example.com" {
		t.Fatalf("homepage=%q, want %q", homepage, "https://example.com")
	}
	if emoji != "🧪" {
		t.Fatalf("emoji=%q, want %q", emoji, "🧪")
	}
	if metadata == "" {
		t.Fatalf("metadata is empty, want non-empty")
	}
	if body == "" || body[0] != '#' {
		t.Fatalf("body=%q, want markdown body starting with #", body)
	}
}

func TestParseSkillMd_NoFrontMatterReturnsBodyUnchanged(t *testing.T) {
	raw := "Hello\nWorld\n"
	_, _, _, _, _, body := parseSkillMd(raw)
	if body != raw {
		t.Fatalf("body=%q, want %q", body, raw)
	}
}

