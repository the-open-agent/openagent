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

package txt

import (
	"fmt"
	"os"
	"strings"

	"github.com/beego/beego/logs"
	"github.com/the-open-agent/openagent/i18n"
)

func GetSupportedFileTypes() []string {
	return []string{".txt", ".md", ".yaml", ".csv", ".pdf", ".docx", ".xlsx", ".pptx"}
}

func GetSupportedImageTypes() []string {
	return []string{".jpg", ".jpeg", ".png", ".webp", ".gif"}
}

func GetParsedTextFromUrl(url string, ext string, lang string) (string, error) {
	var path string
	var err error
	if !strings.HasPrefix(url, "http") {
		path = url
	} else {
		path, err = getTempFilePathFromUrl(url)
		if err != nil {
			return "", err
		}
		defer func() {
			err = os.Remove(path)
			if err != nil {
				logs.Error("%v", err.Error())
			}
		}()
	}

	var res string
	if ext == "" || ext == ".txt" || ext == ".md" || ext == ".yaml" {
		res, err = getTextFromPlain(path)
	} else if ext == ".csv" {
		res, err = getTextFromCsv(path)
	} else if ext == ".pdf" {
		res, err = getTextFromPdf(path)
	} else if ext == ".docx" {
		res, err = GetTextFromDocx(path, lang)
	} else if ext == ".xlsx" {
		res, err = getTextFromXlsx(path)
	} else if ext == ".pptx" {
		res, err = getTextFromPptx(path)
	} else {
		return "", fmt.Errorf(i18n.Translate(lang, "txt:unsupported file type: %s"), ext)
	}
	if err != nil {
		return "", err
	}

	return res, nil
}
