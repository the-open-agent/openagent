// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

package model

import (
	"math"
	"testing"
)

func TestResolveClaudeUSDPerThousand(t *testing.T) {
	t.Parallel()
	cases := []struct {
		id    string
		ok    bool
		in, o float64
	}{
		{"claude-sonnet-4-7", true, 0.003, 0.015},
		{"claude-unknown-xyz-model", false, 0, 0},
		{"claude-sonnet-4-999-test", true, 0.003, 0.015},
	}
	for _, tc := range cases {
		in, o, ok := ResolveClaudeUSDPerThousand(tc.id)
		if ok != tc.ok || math.Abs(in-tc.in) > 1e-9 || math.Abs(o-tc.o) > 1e-9 {
			t.Fatalf("%q: got ok=%v in=%g out=%g want ok=%v in=%g out=%g", tc.id, ok, in, o, tc.ok, tc.in, tc.o)
		}
	}
}

func TestCalculateOpenAIModelPrice_GPT55(t *testing.T) {
	t.Parallel()
	mr := &ModelResult{PromptTokenCount: 2000, ResponseTokenCount: 1000}
	if err := CalculateOpenAIModelPrice("gpt-5.5-pro", mr, "en"); err != nil {
		t.Fatal(err)
	}
	// Standard tier per OpenAI pricing docs ($30/M in, $180/M out → per 1k)
	want := 2*0.03 + 1*0.18
	if math.Abs(mr.TotalPrice-want) > 1e-6 {
		t.Fatalf("TotalPrice=%g want %g", mr.TotalPrice, want)
	}
	if mr.Currency != "USD" {
		t.Fatalf("currency: %s", mr.Currency)
	}
}

func TestCalculateOpenAIModelPrice_GPT55Main(t *testing.T) {
	t.Parallel()
	mr := &ModelResult{PromptTokenCount: 1000, ResponseTokenCount: 1000}
	if err := CalculateOpenAIModelPrice("gpt-5.5", mr, "en"); err != nil {
		t.Fatal(err)
	}
	want := 0.005 + 0.03
	if math.Abs(mr.TotalPrice-want) > 1e-6 {
		t.Fatalf("TotalPrice=%g want %g", mr.TotalPrice, want)
	}
}

func TestApplyConfiguredPerThousandTokenPrices(t *testing.T) {
	t.Parallel()
	mr := &ModelResult{PromptTokenCount: 1000, ResponseTokenCount: 500}
	if !applyConfiguredPerThousandTokenPrices(0.01, 0.02, "EUR", mr) {
		t.Fatal("expected true")
	}
	if math.Abs(mr.TotalPrice-(0.01+0.5*0.02)) > 1e-9 {
		t.Fatalf("TotalPrice=%g", mr.TotalPrice)
	}
	if mr.Currency != "EUR" {
		t.Fatalf("currency: %s", mr.Currency)
	}
}

func TestOpenRouterHeuristicOpenAI(t *testing.T) {
	t.Parallel()
	in, out, ok := openRouterHeuristicUSDPerK("openai/gpt-4o", "en")
	if !ok || in <= 0 || out <= 0 {
		t.Fatalf("got %g %g ok=%v", in, out, ok)
	}
}
