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
	"bytes"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/txt"
)

var (
	imageCaptionPromptEn = "Describe the image in detail for retrieval indexing. Cover the main subject, scene, any visible text, colors, and distinctive features. Reply with the description only, no preamble."
	imageCaptionPromptZh = "请详细描述这张图片，用于检索索引。覆盖主体、场景、画面中可见的文字、颜色和独特特征。仅输出描述本身，不要前缀或寒暄。"
)

func getImageCaptionPrompt(lang string) string {
	if strings.HasPrefix(strings.ToLower(lang), "zh") {
		return imageCaptionPromptZh
	}
	return imageCaptionPromptEn
}

// sseCaptureWriter satisfies io.Writer + http.Flusher (every streaming model
// provider requires the latter) and decodes the `event: message\ndata: ...\n\n`
// SSE framing each chunk arrives in so the caller gets clean text. Falls back
// to the raw bytes for non-SSE writes.
type sseCaptureWriter struct {
	buf bytes.Buffer
}

func (w *sseCaptureWriter) Write(p []byte) (int, error) {
	if bytes.HasPrefix(p, []byte("event: message")) {
		prefix := []byte("event: message\ndata: ")
		suffix := []byte("\n\n")
		w.buf.Write(bytes.TrimSuffix(bytes.TrimPrefix(p, prefix), suffix))
	} else {
		w.buf.Write(p)
	}
	return len(p), nil
}

func (w *sseCaptureWriter) String() string { return w.buf.String() }
func (*sseCaptureWriter) Flush()           {}

func isImageExtension(ext string) bool {
	ext = strings.ToLower(ext)
	for _, imageExt := range txt.GetSupportedImageTypes() {
		if ext == imageExt {
			return true
		}
	}
	return false
}

func detectImageMimeType(data []byte, fallbackExt string) string {
	mimeType := http.DetectContentType(data)
	switch strings.ToLower(strings.TrimSpace(strings.Split(mimeType, ";")[0])) {
	case "image/jpeg", "image/png", "image/gif", "image/webp":
		return mimeType
	}
	switch strings.ToLower(fallbackExt) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	}
	return ""
}

func generateImageCaption(modelProviderObj model.ModelProvider, fileUrl string, fileExt string, lang string) (string, error) {
	if modelProviderObj == nil {
		return "", fmt.Errorf(i18n.Translate(lang, "object:image caption requires a model provider; configure a vision-capable ModelProvider on the store"))
	}

	resp, err := http.Get(fileUrl)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	mimeType := detectImageMimeType(data, fileExt)
	if mimeType == "" {
		return "", fmt.Errorf(i18n.Translate(lang, "object:unsupported image type for: %s"), fileUrl)
	}

	// The image rides on a synthetic user history turn; the question then asks
	// the vision model to caption it. RawMessage.Images is honored by the
	// vision-aware message converter (see model.OpenaiRawMessagesToGptVisionMessages).
	history := []*model.RawMessage{
		{
			Text:   "[image attached]",
			Author: "User",
			Images: []model.ImageAttachment{{Data: data, MimeType: mimeType}},
		},
	}

	buf := &sseCaptureWriter{}
	_, err = modelProviderObj.QueryText(getImageCaptionPrompt(lang), buf, history, "", nil, nil, lang)
	if err != nil {
		return "", err
	}

	caption := strings.TrimSpace(buf.String())
	if caption == "" {
		return "", fmt.Errorf(i18n.Translate(lang, "object:empty caption returned by vision model for image: %s"), fileUrl)
	}
	return caption, nil
}

func isSupportedImageFile(fileKey string) bool {
	return isImageExtension(filepath.Ext(fileKey))
}
