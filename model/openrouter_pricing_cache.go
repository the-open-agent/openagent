// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

package model

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/the-open-agent/openagent/proxy"
)

const openRouterModelsURL = "https://openrouter.ai/api/v1/models"

type openRouterPricingEntry struct {
	promptPerThousand     float64 // USD per 1k prompt tokens
	completionPerThousand float64 // USD per 1k completion tokens
}

var (
	openRouterPriceMu      sync.RWMutex
	openRouterPriceByID    map[string]openRouterPricingEntry
	openRouterPriceKey     string // api key slice for cache invalidation
	openRouterPriceExpires time.Time
)

func parseOpenRouterPriceString(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" || s == "0" {
		return 0, nil
	}
	var v float64
	_, err := fmt.Sscanf(s, "%f", &v)
	if err != nil {
		return 0, err
	}
	return v, nil
}

func refreshOpenRouterPricingCache(apiKey string) error {
	req, err := http.NewRequest(http.MethodGet, openRouterModelsURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiKey))
	req.Header.Set("Content-Type", "application/json")

	client := proxy.ProxyHttpClient
	if client == nil {
		client = &http.Client{Timeout: 25 * time.Second}
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("openrouter models %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload struct {
		Data []struct {
			ID      string `json:"id"`
			Pricing *struct {
				Prompt     json.RawMessage `json:"prompt"`
				Completion json.RawMessage `json:"completion"`
			} `json:"pricing"`
		} `json:"data"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 32<<20)).Decode(&payload); err != nil {
		return err
	}

	next := make(map[string]openRouterPricingEntry, len(payload.Data))
	for _, row := range payload.Data {
		id := strings.TrimSpace(row.ID)
		if id == "" || row.Pricing == nil {
			continue
		}
		var promptStr, completionStr string
		_ = json.Unmarshal(row.Pricing.Prompt, &promptStr)
		if promptStr == "" {
			var pNum float64
			if json.Unmarshal(row.Pricing.Prompt, &pNum) == nil {
				promptStr = fmt.Sprintf("%g", pNum)
			}
		}
		_ = json.Unmarshal(row.Pricing.Completion, &completionStr)
		if completionStr == "" {
			var cNum float64
			if json.Unmarshal(row.Pricing.Completion, &cNum) == nil {
				completionStr = fmt.Sprintf("%g", cNum)
			}
		}
		pPerTok, errP := parseOpenRouterPriceString(promptStr)
		cPerTok, errC := parseOpenRouterPriceString(completionStr)
		if errP != nil || errC != nil {
			continue
		}
		// OpenRouter documents pricing per token in USD
		next[id] = openRouterPricingEntry{
			promptPerThousand:     pPerTok * 1000,
			completionPerThousand: cPerTok * 1000,
		}
	}

	openRouterPriceMu.Lock()
	openRouterPriceByID = next
	openRouterPriceKey = strings.TrimSpace(apiKey)
	openRouterPriceExpires = time.Now().Add(10 * time.Minute)
	openRouterPriceMu.Unlock()
	return nil
}

// lookupOpenRouterPricePerThousand returns USD per-1k prompt/completion rates from cached OpenRouter catalog.
func lookupOpenRouterPricePerThousand(apiKey, modelID string) (promptPerK, completionPerK float64, ok bool) {
	key := strings.TrimSpace(apiKey)
	id := strings.TrimSpace(modelID)
	if key == "" || id == "" {
		return 0, 0, false
	}
	openRouterPriceMu.RLock()
	valid := openRouterPriceKey == key && time.Now().Before(openRouterPriceExpires) && openRouterPriceByID != nil
	var ent openRouterPricingEntry
	var found bool
	if valid {
		ent, found = openRouterPriceByID[id]
	}
	openRouterPriceMu.RUnlock()
	if !valid {
		_ = refreshOpenRouterPricingCache(key)
		openRouterPriceMu.RLock()
		ent, found = openRouterPriceByID[id]
		openRouterPriceMu.RUnlock()
	}
	if !found {
		return 0, 0, false
	}
	return ent.promptPerThousand, ent.completionPerThousand, true
}
