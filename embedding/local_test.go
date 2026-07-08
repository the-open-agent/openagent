package embedding

import "testing"

func TestNormalizeOllamaBaseURL(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", ""},
		{"http://localhost:11434", "http://localhost:11434/v1"},
		{"http://localhost:11434/", "http://localhost:11434/v1"},
		{"http://localhost:11434/v1", "http://localhost:11434/v1"},
		{"http://localhost:11434/v1/", "http://localhost:11434/v1"},
	}

	for _, tt := range tests {
		if got := normalizeOllamaBaseURL(tt.in); got != tt.want {
			t.Fatalf("normalizeOllamaBaseURL(%q)=%q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestLocalEmbeddingProviderCalculatePrice_OllamaCustomEmbedding(t *testing.T) {
	p, err := NewLocalEmbeddingProvider("Ollama", "custom-embedding", "k", "http://localhost:11434/v1", "nomic-embed-text", 0.00042, "INR")
	if err != nil {
		t.Fatal(err)
	}

	res := &EmbeddingResult{TokenCount: 1000}
	if err := p.calculatePrice(res, "en"); err != nil {
		t.Fatalf("calculatePrice() error: %v", err)
	}
	if res.Currency != "INR" {
		t.Fatalf("Currency=%q, want %q", res.Currency, "INR")
	}
	if res.Price != 0.00042 {
		t.Fatalf("Price=%v, want %v", res.Price, 0.00042)
	}
}

