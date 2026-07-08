// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
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

package embedding

import (
	"bufio"
	"context"
	"encoding/binary"
	"fmt"
	"os"
	"strings"

)

type Word2VecEmbeddingProvider struct {
	subType   string
	modelPath string
	dict      map[string][]float32
	dim       int
}

func NewWord2VecEmbeddingProvider(typ string, subType string, lang string) (*Word2VecEmbeddingProvider, error) {
	p := &Word2VecEmbeddingProvider{
		subType:   subType,
		modelPath: "./data/GoogleNews-vectors-negative300.bin", // can be changed to another model
	}

	// Initialize the dictionary
	err := p.loadModel(lang)
	if err != nil {
		return nil, newI18nError(lang, "embedding:failed to load word2vec model: %v", err)
	}

	return p, nil
}

func (p *Word2VecEmbeddingProvider) loadModel(lang string) error {
	file, err := os.Open(p.modelPath)
	if err != nil {
		return newI18nError(lang, "embedding:failed to open model file: %v", err)
	}
	defer file.Close()

	br := bufio.NewReader(file)

	var wordCount int
	_, err = fmt.Fscanf(br, "%d %d\n", &wordCount, &p.dim)
	if err != nil {
		return newI18nError(lang, "embedding:failed to read header: %v", err)
	}

	p.dict = make(map[string][]float32, wordCount)

	for i := 0; i < wordCount; i++ {
		word, err := br.ReadString(' ')
		if err != nil {
			return newI18nError(lang, "embedding:failed to read word: %v", err)
		}
		word = word[:len(word)-1] // Remove trailing space

		vector := make([]float32, p.dim)
		err = binary.Read(br, binary.LittleEndian, &vector)
		if err != nil {
			return newI18nError(lang, "embedding:failed to read vector: %v", err)
		}

		p.dict[word] = vector

		// Skip the newline character after each vector
		_, _ = br.ReadByte()
	}

	return nil
}

func (p *Word2VecEmbeddingProvider) GetPricing() string {
	return `Local model, no charge required.`
}

func (p *Word2VecEmbeddingProvider) QueryVector(text string, ctx context.Context, lang string) ([]float32, *EmbeddingResult, error) {
	tokens := strings.Fields(text) // Split words by spaces
	if len(tokens) == 0 {
		return nil, nil, newI18nError(lang, "embedding:input text is empty")
	}

	vectors := make([][]float32, 0, len(tokens))
	foundCount := 0
	for _, token := range tokens {
		if vec, exists := p.dict[token]; exists {
			vectors = append(vectors, vec)
			foundCount++
		}
		// Ignore non-existent words.
	}

	if foundCount == 0 {
		return nil, nil, newI18nError(lang, "embedding:none of the tokens were found in the vocabulary")
	}

	// Calculate the average vector
	avgVector := make([]float32, p.dim)
	for _, vec := range vectors {
		for i := 0; i < p.dim; i++ {
			avgVector[i] += vec[i]
		}
	}

	// normalization
	for i := 0; i < p.dim; i++ {
		avgVector[i] /= float32(foundCount)
	}

	result := &EmbeddingResult{
		TokenCount: foundCount,
		Price:      0,
		Currency:   "CNY",
	}

	return avgVector, result, nil
}
