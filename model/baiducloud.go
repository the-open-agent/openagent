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

package model

import (
	"io"
	"strings"
)

type BaiduCloudModelProvider struct {
	subType                      string
	apiKey                       string
	temperature                  float32
	topP                         float32
	inputPricePerThousandTokens  float64
	outputPricePerThousandTokens float64
	currency                     string
}

func NewBaiduCloudModelProvider(subType string, apiKey string, temperature float32, topP float32, inputPricePerThousandTokens float64, outputPricePerThousandTokens float64, currency string) (*BaiduCloudModelProvider, error) {
	return &BaiduCloudModelProvider{
		subType:                      subType,
		apiKey:                       apiKey,
		temperature:                  temperature,
		topP:                         topP,
		inputPricePerThousandTokens:  inputPricePerThousandTokens,
		outputPricePerThousandTokens: outputPricePerThousandTokens,
		currency:                     currency,
	}, nil
}

func (p *BaiduCloudModelProvider) GetPricing() string {
	return `URL:
https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya

| Model                               | Input Price per 1K tokens (CNY) | Output Price per 1K tokens (CNY) |
|-------------------------------------|---------------------------------|----------------------------------|
| ernie-5.0                           | 0.006                           | 0.024                            |
| ernie-5.0-thinking-preview          | 0.006                           | 0.024                            |
| ernie-5.0-thinking-latest           | 0.006                           | 0.024                            |
| ernie-5.0-thinking-exp              | 0.006                           | 0.024                            |
| ernie-4.5-turbo-128k-preview        | 0.0008                          | 0.0032                           |
| ernie-4.5-turbo-128k                | 0.0008                          | 0.0032                           |
| ernie-4.5-turbo-32k                 | 0.0008                          | 0.0032                           |
| ernie-4.5-turbo-20260402            | 0.0008                          | 0.0032                           |
| ernie-4.5-turbo-latest              | 0.0008                          | 0.0032                           |
| ernie-4.5-turbo-vl-preview          | 0.003                           | 0.009                            |
| ernie-4.5-turbo-vl                  | 0.003                           | 0.009                            |
| ernie-4.5-turbo-vl-32k              | 0.003                           | 0.009                            |
| ernie-4.5-turbo-vl-32k-preview      | 0.003                           | 0.009                            |
| ernie-4.5-turbo-vl-latest           | 0.003                           | 0.009                            |
| ernie-4.5-8k-preview                | 0.004                           | 0.016                            |
| ernie-4.5-vl-28b-a3b                | 0.001                           | 0.004                            |
| ernie-4.5-0.3b                      | 0.0001                          | 0.0004                           |
| ernie-4.5-21b-a3b-thinking          | 0.0005                          | 0.002                            |
| ernie-4.5-21b-a3b                   | 0.0005                          | 0.002                            |
| ernie-x1.1                          | 0.001                           | 0.004                            |
| ernie-x1.1-preview                  | 0.001                           | 0.004                            |
| ernie-x1-turbo-32k                  | 0.001                           | 0.004                            |
| ernie-x1-turbo-32k-preview          | 0.001                           | 0.004                            |
| ernie-x1-turbo-latest               | 0.001                           | 0.004                            |
| ernie-x1-32k                        | 0.001                           | 0.004                            |
| ernie-x1-32k-preview                | 0.001                           | 0.004                            |
| ernie-speed-pro-128k                | 0.0003                          | 0.0006                           |
| ernie-lite-pro-128k                 | 0.0002                          | 0.0004                           |
| ernie-char-8k                       | 0.0003                          | 0.0006                           |
| ernie-char-fiction-8k               | 0.0003                          | 0.0006                           |
| ernie-char-fiction-8k-preview       | 0.0003                          | 0.0006                           |
| ernie-novel-8k                      | 0.04                            | 0.12                             |
| ernie-4.0-8k                        | 0.03                            | 0.09                             |
| ernie-4.0-8k-latest                 | 0.03                            | 0.09                             |
| ernie-4.0-8k-preview                | 0.03                            | 0.09                             |
| ernie-4.0-turbo-8k                  | 0.02                            | 0.06                             |
| ernie-4.0-turbo-128k                | 0.02                            | 0.06                             |
| ernie-4.0-turbo-8k-preview          | 0.02                            | 0.06                             |
| ernie-4.0-turbo-8k-latest           | 0.02                            | 0.06                             |
| ernie-3.5-8k                        | 0.0008                          | 0.002                            |
| ernie-3.5-128k                      | 0.0008                          | 0.002                            |
| ernie-3.5-8k-preview                | 0.0008                          | 0.002                            |
| ernie-3.5-128k-preview              | 0.0008                          | 0.002                            |
| deepseek-v3.2                       | 0.002                           | 0.003                            |
| deepseek-v3.2-think                 | 0.002                           | 0.003                            |
| deepseek-v3.1-250821                | 0.004                           | 0.012                            |
| deepseek-v3.1-think-250821          | 0.004                           | 0.012                            |
| deepseek-v3                         | 0.002                           | 0.008                            |
| deepseek-r1-250528                  | 0.004                           | 0.016                            |
| deepseek-r1                         | 0.004                           | 0.016                            |
| deepseek-r1-distill-qwen-32b        | 0.0015                          | 0.006                            |
| deepseek-r1-distill-qwen-14b        | 0.0006                          | 0.0024                           |
| glm-5.1                             | 0.006                           | 0.024                            |
| glm-5                               | 0.004                           | 0.018                            |
| kimi-k2.5                           | 0.004                           | 0.021                            |
| kimi-k2-instruct                    | 0.004                           | 0.021                            |
| minimax-m2.5                        | 0.0021                          | 0.0084                           |
| minimax-m2.1                        | 0.0021                          | 0.0084                           |
| qwen3-coder-480b-a35b-instruct      | 0.006                           | 0.024                            |
| qwen3-coder-30b-a3b-instruct        | 0.0015                          | 0.006                            |
| qwen3-next-80b-a3b-instruct         | 0.001                           | 0.004                            |
| qwen3-next-80b-a3b-thinking         | 0.001                           | 0.01                             |
| qwen3-235b-a22b-instruct-2507       | 0.002                           | 0.008                            |
| qwen3-235b-a22b-thinking-2507       | 0.002                           | 0.02                             |
| qwen3-30b-a3b-instruct-2507         | 0.00075                         | 0.003                            |
| qwen3-30b-a3b-thinking-2507         | 0.00075                         | 0.0075                           |
| qwen3-30b-a3b                       | 0.00075                         | 0.003                            |
| qwen3-32b                           | 0.002                           | 0.008                            |
| qwen3-14b                           | 0.001                           | 0.004                            |
| qwen3-8b                            | 0.0005                          | 0.002                            |
| qwen3-4b                            | 0.0003                          | 0.0012                           |
| qwen3-1.7b                          | 0.0003                          | 0.0012                           |
| qwen3-0.6b                          | 0.0003                          | 0.0012                           |
| qwen3-vl-235b-a22b-instruct         | 0.002                           | 0.008                            |
| qwen3-vl-235b-a22b-thinking         | 0.002                           | 0.02                             |
| qwen3-vl-30b-a3b-instruct           | 0.00075                         | 0.003                            |
| qwen3-vl-30b-a3b-thinking           | 0.00075                         | 0.0075                           |
| qwen3-vl-32b-instruct               | 0.002                           | 0.008                            |
| qwen3-vl-32b-thinking               | 0.002                           | 0.02                             |
| qwen3-vl-8b-instruct                | 0.0005                          | 0.002                            |
| qwen3-vl-8b-thinking                | 0.0005                          | 0.005                            |
| qwen3.5-397b-a17b                   | 0.0012                          | 0.0072                           |
| qwen3.5-122b-a10b                   | 0.0008                          | 0.0064                           |
| qwen3.5-27b                         | 0.0006                          | 0.0048                           |
| qwen3.5-35b-a3b                     | 0.0004                          | 0.0032                           |
| qwen2.5-7b-instruct                 | 0.0005                          | 0.001                            |
| qwen2.5-vl-7b-instruct              | 0.002                           | 0.005                            |
| qwen2.5-vl-32b-instruct             | 0.008                           | 0.024                            |
| qwq-32b                             | 0.002                           | 0.006                            |
| qianfan-check-vl                    | 0.00125                         | 0.00375                          |
| qianfan-vl-70b                      | 0.008                           | 0.024                            |
| qianfan-vl-8b                       | 0.002                           | 0.006                            |
| qianfan-vl-1.5-flash                | 0.00075                         | 0.003                            |
| qianfan-funccaller                  | 0.0008                          | 0.0032                           |
| qianfan-toytalk                     | 0.0001                          | 0.0002                           |
| qianfan-llama-vl-8b                 | 0.002                           | 0.005                            |
| qianfan-composition                 | 0.0025                          | 0.0075                           |
| internvl3-38b                       | 0.008                           | 0.024                            |
| internvl2.5-38b-mpo                 | 0.008                           | 0.024                            |
`
}

func (p *BaiduCloudModelProvider) calculatePrice(modelResult *ModelResult, lang string) error {
	if applyConfiguredPerThousandTokenPrices(p.inputPricePerThousandTokens, p.outputPricePerThousandTokens, pickCurrency(p.currency, "CNY"), modelResult) {
		return nil
	}

	price := 0.0
	priceTable := map[string][2]float64{
		"ernie-5.0":                      {0.006, 0.024},
		"ernie-5.0-thinking-preview":     {0.006, 0.024},
		"ernie-5.0-thinking-latest":      {0.006, 0.024},
		"ernie-5.0-thinking-exp":         {0.006, 0.024},
		"ernie-4.5-turbo-128k-preview":   {0.0008, 0.0032},
		"ernie-4.5-turbo-128k":           {0.0008, 0.0032},
		"ernie-4.5-turbo-32k":            {0.0008, 0.0032},
		"ernie-4.5-turbo-20260402":       {0.0008, 0.0032},
		"ernie-4.5-turbo-latest":         {0.0008, 0.0032},
		"ernie-4.5-turbo-vl-preview":     {0.003, 0.009},
		"ernie-4.5-turbo-vl":             {0.003, 0.009},
		"ernie-4.5-turbo-vl-32k":         {0.003, 0.009},
		"ernie-4.5-turbo-vl-32k-preview": {0.003, 0.009},
		"ernie-4.5-turbo-vl-latest":      {0.003, 0.009},
		"ernie-4.5-8k-preview":           {0.004, 0.016},
		"ernie-4.5-vl-28b-a3b":           {0.001, 0.004},
		"ernie-4.5-0.3b":                 {0.0001, 0.0004},
		"ernie-4.5-21b-a3b-thinking":     {0.0005, 0.002},
		"ernie-4.5-21b-a3b":              {0.0005, 0.002},
		"ernie-x1.1":                     {0.001, 0.004},
		"ernie-x1.1-preview":             {0.001, 0.004},
		"ernie-x1-turbo-32k":             {0.001, 0.004},
		"ernie-x1-turbo-32k-preview":     {0.001, 0.004},
		"ernie-x1-turbo-latest":          {0.001, 0.004},
		"ernie-x1-32k":                   {0.001, 0.004},
		"ernie-x1-32k-preview":           {0.001, 0.004},
		"ernie-speed-pro-128k":           {0.0003, 0.0006},
		"ernie-lite-pro-128k":            {0.0002, 0.0004},
		"ernie-char-8k":                  {0.0003, 0.0006},
		"ernie-char-fiction-8k":          {0.0003, 0.0006},
		"ernie-char-fiction-8k-preview":  {0.0003, 0.0006},
		"ernie-novel-8k":                 {0.04, 0.12},
		"ernie-4.0-8k":                   {0.03, 0.09},
		"ernie-4.0-8k-latest":            {0.03, 0.09},
		"ernie-4.0-8k-preview":           {0.03, 0.09},
		"ernie-4.0-turbo-8k":             {0.02, 0.06},
		"ernie-4.0-turbo-128k":           {0.02, 0.06},
		"ernie-4.0-turbo-8k-preview":     {0.02, 0.06},
		"ernie-4.0-turbo-8k-latest":      {0.02, 0.06},
		"ernie-3.5-8k":                   {0.0008, 0.002},
		"ernie-3.5-128k":                 {0.0008, 0.002},
		"ernie-3.5-8k-preview":           {0.0008, 0.002},
		"ernie-3.5-128k-preview":         {0.0008, 0.002},
		"deepseek-v3.2":                  {0.002, 0.003},
		"deepseek-v3.2-think":            {0.002, 0.003},
		"deepseek-v3.1-250821":           {0.004, 0.012},
		"deepseek-v3.1-think-250821":     {0.004, 0.012},
		"deepseek-v3":                    {0.002, 0.008},
		"deepseek-r1-250528":             {0.004, 0.016},
		"deepseek-r1":                    {0.004, 0.016},
		"deepseek-r1-distill-qwen-32b":   {0.0015, 0.006},
		"deepseek-r1-distill-qwen-14b":   {0.0006, 0.0024},
		"glm-5.1":                        {0.006, 0.024},
		"glm-5":                          {0.004, 0.018},
		"kimi-k2.5":                      {0.004, 0.021},
		"kimi-k2-instruct":               {0.004, 0.021},
		"minimax-m2.5":                   {0.0021, 0.0084},
		"minimax-m2.1":                   {0.0021, 0.0084},
		"qwen3-coder-480b-a35b-instruct": {0.006, 0.024},
		"qwen3-coder-30b-a3b-instruct":   {0.0015, 0.006},
		"qwen3-next-80b-a3b-instruct":    {0.001, 0.004},
		"qwen3-next-80b-a3b-thinking":    {0.001, 0.01},
		"qwen3-235b-a22b-instruct-2507":  {0.002, 0.008},
		"qwen3-235b-a22b-thinking-2507":  {0.002, 0.02},
		"qwen3-30b-a3b-instruct-2507":    {0.00075, 0.003},
		"qwen3-30b-a3b-thinking-2507":    {0.00075, 0.0075},
		"qwen3-30b-a3b":                  {0.00075, 0.003},
		"qwen3-32b":                      {0.002, 0.008},
		"qwen3-14b":                      {0.001, 0.004},
		"qwen3-8b":                       {0.0005, 0.002},
		"qwen3-4b":                       {0.0003, 0.0012},
		"qwen3-1.7b":                     {0.0003, 0.0012},
		"qwen3-0.6b":                     {0.0003, 0.0012},
		"qwen3-vl-235b-a22b-instruct":    {0.002, 0.008},
		"qwen3-vl-235b-a22b-thinking":    {0.002, 0.02},
		"qwen3-vl-30b-a3b-instruct":      {0.00075, 0.003},
		"qwen3-vl-30b-a3b-thinking":      {0.00075, 0.0075},
		"qwen3-vl-32b-instruct":          {0.002, 0.008},
		"qwen3-vl-32b-thinking":          {0.002, 0.02},
		"qwen3-vl-8b-instruct":           {0.0005, 0.002},
		"qwen3-vl-8b-thinking":           {0.0005, 0.005},
		"qwen3.5-397b-a17b":              {0.0012, 0.0072},
		"qwen3.5-122b-a10b":              {0.0008, 0.0064},
		"qwen3.5-27b":                    {0.0006, 0.0048},
		"qwen3.5-35b-a3b":                {0.0004, 0.0032},
		"qwen2.5-7b-instruct":            {0.0005, 0.001},
		"qwen2.5-vl-7b-instruct":         {0.002, 0.005},
		"qwen2.5-vl-32b-instruct":        {0.008, 0.024},
		"qwq-32b":                        {0.002, 0.006},
		"qianfan-check-vl":               {0.00125, 0.00375},
		"qianfan-vl-70b":                 {0.008, 0.024},
		"qianfan-vl-8b":                  {0.002, 0.006},
		"qianfan-vl-1.5-flash":           {0.00075, 0.003},
		"qianfan-funccaller":             {0.0008, 0.0032},
		"qianfan-toytalk":                {0.0001, 0.0002},
		"qianfan-llama-vl-8b":            {0.002, 0.005},
		"qianfan-composition":            {0.0025, 0.0075},
		"internvl3-38b":                  {0.008, 0.024},
		"internvl2.5-38b-mpo":            {0.008, 0.024},
	}

	if priceItem, ok := priceTable[p.subType]; ok {
		inputPrice := getPrice(modelResult.PromptTokenCount, priceItem[0])
		outputPrice := getPrice(modelResult.ResponseTokenCount, priceItem[1])
		price = inputPrice + outputPrice
	} else {
		lower := strings.ToLower(p.subType)
		var item [2]float64
		var hit bool
		switch {
		case strings.Contains(lower, "ernie-5"):
			item = [2]float64{0.006, 0.024}
			hit = true
		case strings.Contains(lower, "ernie-4.5-turbo"):
			item = [2]float64{0.0008, 0.0032}
			hit = true
		case strings.Contains(lower, "ernie-x1"):
			item = [2]float64{0.001, 0.004}
			hit = true
		case strings.Contains(lower, "deepseek-r1"):
			item = [2]float64{0.004, 0.016}
			hit = true
		case strings.Contains(lower, "deepseek"):
			item = [2]float64{0.002, 0.008}
			hit = true
		case strings.Contains(lower, "qwen3"):
			item = [2]float64{0.002, 0.008}
			hit = true
		case strings.Contains(lower, "glm"):
			item = [2]float64{0.004, 0.018}
			hit = true
		case strings.Contains(lower, "kimi"):
			item = [2]float64{0.004, 0.021}
			hit = true
		case strings.HasPrefix(lower, "ernie-"):
			item = [2]float64{0.0008, 0.0032}
			hit = true
		}
		if !hit {
			modelResult.TotalPrice = 0
			modelResult.Currency = "CNY"
			return nil
		}
		inputPrice := getPrice(modelResult.PromptTokenCount, item[0])
		outputPrice := getPrice(modelResult.ResponseTokenCount, item[1])
		price = inputPrice + outputPrice
	}

	modelResult.TotalPrice = price
	modelResult.Currency = "CNY"
	return nil
}

func (p *BaiduCloudModelProvider) QueryText(question string, writer io.Writer, history []*RawMessage, prompt string, knowledgeMessages []*RawMessage, toolSession *ToolSession, lang string) (*ModelResult, error) {
	const BaseUrl = "https://qianfan.baidubce.com/v2"
	// Create a new LocalModelProvider to handle the request
	localProvider, err := NewLocalModelProvider("Custom-think", "custom-model", p.apiKey, p.temperature, p.topP, 0, 0, BaseUrl, p.subType, 0, 0, "CNY")
	if err != nil {
		return nil, err
	}

	modelResult, err := localProvider.QueryText(question, writer, history, prompt, knowledgeMessages, toolSession, lang)
	if err != nil {
		return nil, err
	}

	err = p.calculatePrice(modelResult, lang)
	if err != nil {
		return nil, err
	}
	return modelResult, nil
}
