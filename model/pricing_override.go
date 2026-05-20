// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

package model

// pickCurrency returns currency if non-empty, else defaultCur.
func pickCurrency(currency, defaultCur string) string {
	if currency != "" {
		return currency
	}
	return defaultCur
}

// applyConfiguredPerThousandTokenPrices fills modelResult from admin-configured per-1k token prices when set.
// Returns true if pricing was applied (caller should skip built-in tables).
func applyConfiguredPerThousandTokenPrices(inputPricePerThousand, outputPricePerThousand float64, currency string, modelResult *ModelResult) bool {
	if inputPricePerThousand <= 0 && outputPricePerThousand <= 0 {
		return false
	}
	inputPrice := getPrice(modelResult.PromptTokenCount, inputPricePerThousand)
	outputPrice := getPrice(modelResult.ResponseTokenCount, outputPricePerThousand)
	modelResult.TotalPrice = AddPrices(inputPrice, outputPrice)
	if currency != "" {
		modelResult.Currency = currency
	} else {
		modelResult.Currency = "USD"
	}
	return true
}
