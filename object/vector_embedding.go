// Copyright 2023 The OpenAgent Authors. All Rights Reserved.
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
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/beego/beego/logs"
	"github.com/cenkalti/backoff/v4"
	"github.com/the-open-agent/openagent/embedding"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/split"
	"github.com/the-open-agent/openagent/storage"
	"github.com/the-open-agent/openagent/txt"
	"github.com/the-open-agent/openagent/util"
)

func filterTextFiles(files []*storage.Object) []*storage.Object {
	fileTypeMap := map[string]bool{}
	for _, fileType := range txt.GetSupportedFileTypes() {
		fileTypeMap[fileType] = true
	}
	for _, fileType := range txt.GetSupportedImageTypes() {
		fileTypeMap[fileType] = true
	}

	res := []*storage.Object{}
	for _, file := range files {
		ext := filepath.Ext(file.Key)
		if fileTypeMap[ext] {
			res = append(res, file)
		}
	}
	return res
}

func addEmbeddedVector(embeddingProviderObj embedding.EmbeddingProvider, text string, imageUrl string, storeName string, fileName string, index int, embeddingProviderName string, modelSubType string, lang string) (bool, int, error) {
	data, embeddingResult, err := queryVectorSafe(embeddingProviderObj, text, embeddingProviderName, lang)
	if err != nil {
		return false, 0, err
	}

	displayName := text
	if len(text) > 25 {
		displayName = string([]rune(text)[:25])
	}

	tokenCount := 0
	price := 0.0
	currency := ""
	if embeddingResult != nil {
		tokenCount = embeddingResult.TokenCount
		price = embeddingResult.Price
		currency = embeddingResult.Currency
	}

	defaultEmbeddingResult, err := embedding.GetDefaultEmbeddingResult(modelSubType, text)
	if err != nil {
		return false, 0, err
	}

	if tokenCount == 0 {
		tokenCount = defaultEmbeddingResult.TokenCount
	}
	if price == 0 {
		price = defaultEmbeddingResult.Price
	}
	if currency == "" {
		currency = defaultEmbeddingResult.Currency
	}

	vector := &Vector{
		Owner:       "admin",
		Name:        fmt.Sprintf("vector_%s", util.GetRandomName()),
		CreatedTime: util.GetCurrentTime(),
		DisplayName: displayName,
		Store:       storeName,
		Provider:    embeddingProviderName,
		File:        fileName,
		Index:       index,
		Text:        text,
		ImageUrl:    imageUrl,
		TokenCount:  tokenCount,
		Price:       price,
		Currency:    currency,
		Data:        data,
		Dimension:   len(data),
	}
	affected, err := AddVector(vector)
	return affected, tokenCount, err
}

func addVectorsForFile(embeddingProviderObj embedding.EmbeddingProvider, modelProviderObj model.ModelProvider, storeName string, fileKey string, fileUrl string, splitProviderName string, embeddingProviderName string, modelSubType string, lang string) (bool, int, error) {
	fileExt := filepath.Ext(fileKey)

	if isImageExtension(fileExt) {
		return addVectorForImageFile(embeddingProviderObj, modelProviderObj, storeName, fileKey, fileUrl, fileExt, embeddingProviderName, modelSubType, lang)
	}

	var (
		affected        bool
		totalTokenCount int
	)

	text, err := txt.GetParsedTextFromUrl(fileUrl, fileExt, lang)
	if err != nil {
		return false, 0, err
	}

	splitProviderType := splitProviderName
	if splitProviderType == "" {
		splitProviderType = "Default"
	}

	if strings.HasPrefix(fileKey, "QA") && fileExt == ".docx" {
		splitProviderType = "QA"
	}

	if fileExt == ".md" {
		splitProviderType = "Markdown"
	}

	splitProvider, err := split.GetSplitProvider(splitProviderType)
	if err != nil {
		return false, 0, err
	}

	textSections, err := splitProvider.SplitText(text)
	if err != nil {
		return false, 0, err
	}

	for i, textSection := range textSections {
		logs.Info("[%d/%d] Generating embedding for store: [%s], file: [%s], index: [%d]: %s", i+1, len(textSections), storeName, fileKey, i, textSection)

		var (
			sectionAffected   bool
			sectionTokenCount int
		)
		operation := func() error {
			var opErr error
			sectionAffected, sectionTokenCount, opErr = addEmbeddedVector(embeddingProviderObj, textSection, "", storeName, fileKey, i, embeddingProviderName, modelSubType, lang)
			if opErr != nil {
				if isRetryableError(opErr) {
					return opErr
				}
				return backoff.Permanent(opErr)
			}
			return nil
		}
		err = backoff.Retry(operation, backoff.NewExponentialBackOff())
		if err != nil {
			logs.Error("Failed to generate embedding after retries: %v", err)
			return affected, totalTokenCount, err
		}

		affected = affected || sectionAffected
		totalTokenCount += sectionTokenCount
	}

	return affected, totalTokenCount, nil
}

func addVectorForImageFile(embeddingProviderObj embedding.EmbeddingProvider, modelProviderObj model.ModelProvider, storeName string, fileKey string, fileUrl string, fileExt string, embeddingProviderName string, modelSubType string, lang string) (bool, int, error) {
	logs.Info("Generating caption for image, store: [%s], file: [%s]", storeName, fileKey)

	caption, err := generateImageCaption(modelProviderObj, fileUrl, fileExt, lang)
	if err != nil {
		return false, 0, err
	}

	logs.Info("Embedding caption for store: [%s], file: [%s]: %s", storeName, fileKey, caption)

	var (
		affected   bool
		tokenCount int
	)
	operation := func() error {
		var opErr error
		affected, tokenCount, opErr = addEmbeddedVector(embeddingProviderObj, caption, fileUrl, storeName, fileKey, 0, embeddingProviderName, modelSubType, lang)
		if opErr != nil {
			if isRetryableError(opErr) {
				return opErr
			}
			return backoff.Permanent(opErr)
		}
		return nil
	}
	err = backoff.Retry(operation, backoff.NewExponentialBackOff())
	if err != nil {
		logs.Error("Failed to embed image caption after retries: %v", err)
		return affected, tokenCount, err
	}

	return affected, tokenCount, nil
}

func withFileStatus(owner string, storeName string, fileKey string, op func() (bool, int, error)) (bool, error) {
	err := updateFileStatus(owner, storeName, fileKey, FileStatusProcessing, "", 0)
	if err != nil {
		logs.Error("Failed to update file status for store: [%s], file: [%s]: %v", storeName, fileKey, err)
		return false, err
	}

	affected, tokenCount, opErr := op()

	fileStatus := FileStatusFinished
	errorText := ""
	if opErr != nil {
		fileStatus = FileStatusError
		errorText = opErr.Error()
	}

	err = updateFileStatus(owner, storeName, fileKey, fileStatus, errorText, tokenCount)
	if err != nil {
		logs.Error("Failed to update file status for store: [%s], file: [%s]: %v", storeName, fileKey, err)
		return affected, errors.Join(opErr, err)
	}

	return affected, opErr
}

func addVectorsForStore(storageProviderObj storage.StorageProvider, embeddingProviderObj embedding.EmbeddingProvider, modelProviderObj model.ModelProvider, prefix string, owner string, storeName string, splitProviderName string, embeddingProviderName string, modelSubType string, lang string) (bool, error) {
	var (
		affected bool
		fileErr  error
	)

	files, err := storageProviderObj.ListObjects(prefix)
	if err != nil {
		return false, err
	}

	files = filterTextFiles(files)

	for _, file := range files {
		fileAffected, err := withFileStatus(owner, storeName, file.Key, func() (bool, int, error) {
			return addVectorsForFile(embeddingProviderObj, modelProviderObj, storeName, file.Key, file.Url, splitProviderName, embeddingProviderName, modelSubType, lang)
		})
		if err != nil {
			logs.Error("Failed to add vectors for store: [%s], file: [%s]: %v", storeName, file.Key, err)
			fileErr = errors.Join(fileErr, err)
			continue
		}

		affected = affected || fileAffected
	}

	return affected, fileErr
}

func getRelatedVectors(relatedStores []string, provider string) ([]*Vector, error) {
	vectors, err := getVectorsByProvider(relatedStores, provider)
	if err != nil {
		return nil, err
	}
	if len(vectors) == 0 {
		return nil, fmt.Errorf("no knowledge vectors found")
	}

	return vectors, nil
}

func queryVectorWithContext(embeddingProvider embedding.EmbeddingProvider, text string, timeout int, lang string) ([]float32, *embedding.EmbeddingResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(30+timeout*2)*time.Second)
	defer cancel()
	vector, embeddingResult, err := embeddingProvider.QueryVector(text, ctx, lang)
	return vector, embeddingResult, err
}

func queryVectorSafe(embeddingProvider embedding.EmbeddingProvider, text string, providerName string, lang string) ([]float32, *embedding.EmbeddingResult, error) {
	var res []float32
	var embeddingResult *embedding.EmbeddingResult
	var err error
	for i := 0; i < 10; i++ {
		res, embeddingResult, err = queryVectorWithContext(embeddingProvider, text, i, lang)
		if err != nil {
			err = fmt.Errorf(i18n.Translate(lang, "object:queryVectorSafe() error, provider: %s, %s"), providerName, err.Error())
			if i > 0 {
				logs.Error("\tFailed (%d): %s", i+1, err.Error())
			}
		} else {
			break
		}
	}

	if err != nil {
		return nil, nil, err
	} else {
		return res, embeddingResult, nil
	}
}

func GetNearestKnowledge(storeName string, vectorStores []string, searchProviderType string, embeddingProvider *Provider, embeddingProviderObj embedding.EmbeddingProvider, modelProvider *Provider, owner string, text string, knowledgeCount int, lang string) ([]*model.RawMessage, []VectorScore, *embedding.EmbeddingResult, error) {
	searchProvider, err := GetSearchProvider(searchProviderType, owner)
	if err != nil {
		return nil, nil, nil, err
	}

	relatedStores := append(vectorStores, storeName)
	vectors, embeddingResult, err := searchProvider.Search(relatedStores, embeddingProvider.Name, embeddingProviderObj, modelProvider.Name, text, knowledgeCount, lang)
	if err != nil {
		if err.Error() == "no knowledge vectors found" {
			return nil, nil, embeddingResult, err
		} else {
			return nil, nil, nil, err
		}
	}

	vectorScores := []VectorScore{}
	knowledge := []*model.RawMessage{}
	for _, vector := range vectors {
		// if embeddingProvider.Name != vector.Provider {
		//	return "", nil, fmt.Errorf(i18n.Translate(lang, "object:The store's embedding provider: [%s] should equal to vector's embedding provider: [%s], vector = %v"), embeddingProvider.Name, vector.Provider, vector)
		// }

		vectorScores = append(vectorScores, VectorScore{
			Vector: vector.Name,
			Score:  vector.Score,
		})

		// Image vectors carry both a caption and the original URL. Surface the URL
		// in markdown so the model can echo it back into the answer and the chat
		// renderer displays the image to the user.
		knowledgeText := vector.Text
		if vector.ImageUrl != "" {
			knowledgeText = fmt.Sprintf("%s\n\n![](%s)", vector.Text, vector.ImageUrl)
		}

		knowledge = append(knowledge, &model.RawMessage{
			Text:           knowledgeText,
			Author:         "System",
			TextTokenCount: vector.TokenCount,
		})
	}

	return knowledge, vectorScores, embeddingResult, nil
}
