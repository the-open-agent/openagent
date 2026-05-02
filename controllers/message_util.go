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

package controllers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/beego/beego"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/txt"
)

func (c *ApiController) ResponseErrorStream(message *object.Message, errorText string) {
	var err error
	if message != nil {
		if !message.IsAlerted {
			err = message.SendErrorEmail(errorText, c.GetAcceptLanguage())
			if err != nil {
				errorText = fmt.Sprintf("%s\n%s", errorText, err.Error())
			}
		}

		if message.ErrorText != errorText || !message.IsAlerted || err != nil {
			message.ErrorText = errorText
			message.IsAlerted = true
			_, err = object.UpdateMessage(message.GetId(), message, false)
			if err != nil {
				errorText = fmt.Sprintf("%s\n%s", errorText, err.Error())
			}
		}
	}

	event := fmt.Sprintf("event: myerror\ndata: %s\n\n", errorText)
	_, err = c.Ctx.ResponseWriter.Write([]byte(event))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
}

func refineQuestionTextViaParsingUrlContent(question string, lang string) (string, error) {
	re := regexp.MustCompile(`href="([^"]+)"`)
	urls := re.FindStringSubmatch(question)
	if len(urls) == 0 {
		return question, nil
	}

	href := urls[1]
	ext := filepath.Ext(href)
	content, err := txt.GetParsedTextFromUrl(href, ext, lang)
	if err != nil {
		return "", err
	}

	aTag := regexp.MustCompile(`<a\s+[^>]*href=["']([^"']+)["'][^>]*>.*?</a>`)
	res := aTag.ReplaceAllString(question, content)
	return res, nil
}

func ConvertMessageDataToJSON(data string) ([]byte, error) {
	jsonData := map[string]string{"text": data}
	jsonBytes, err := json.Marshal(jsonData)
	if err != nil {
		return nil, err
	}
	return jsonBytes, nil
}

func RefineMessageImage(message *object.Message, lang string) error {
	imgRegex := regexp.MustCompile(`<img[^>]*src="([^"]*)"[^>]*>`)
	srcMatches := imgRegex.FindStringSubmatch(message.Text)
	if len(srcMatches) <= 1 {
		return fmt.Errorf(i18n.Translate(lang, "no image url found"))
	}
	imageUrl := srcMatches[1]

	extRegex := regexp.MustCompile(`\.([a-zA-Z]+)\?`)
	extMatches := extRegex.FindStringSubmatch(imageUrl)
	if len(extMatches) <= 1 {
		return fmt.Errorf(i18n.Translate(lang, "no extension found"))
	}
	ext := extMatches[1]

	resp, err := http.Get(imageUrl)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	base64Data := base64.StdEncoding.EncodeToString(data)
	res := fmt.Sprintf("data:image/%s;base64,%s", ext, base64Data)
	message.Text = fmt.Sprintf("<img src=\"%s\" width=\"100%%\" height=\"auto\">", res)
	message.FileName = message.Name + "." + ext
	return nil
}

func tryStoreRemoteImage(message *object.Message, host string, lang string) {
	origin := getOriginFromHost(host)
	// DALL·E etc.: remote image URL in <img src="http...">
	if strings.Contains(message.Text, "<img src=\"http") {
		if err := storeImage(message, origin, lang); err != nil {
			beego.Info(fmt.Sprintf("tryStoreRemoteImage(): failed to upload image to CDN for message %s: %s", message.GetId(), err.Error()))
		}
		return
	}
	// gpt-image and similar: inline data URL (tryStoreRemoteImage previously skipped these)
	if strings.Contains(message.Text, ";base64,") && strings.Contains(message.Text, "data:") {
		if err := storeInlineBase64Images(message, origin, lang); err != nil {
			beego.Info(fmt.Sprintf("tryStoreRemoteImage(): failed to upload inline base64 image to CDN for message %s: %s", message.GetId(), err.Error()))
		}
	}
}

func storeImage(message *object.Message, origin string, lang string) error {
	err := RefineMessageImage(message, lang)
	if err != nil {
		return err
	}
	err = object.RefineMessageFiles(message, origin, lang)
	if err != nil {
		return err
	}
	_, err = object.UpdateMessage(message.GetId(), message, false)
	if err != nil {
		return err
	}
	return nil
}

func storeInlineBase64Images(message *object.Message, origin string, lang string) error {
	err := object.RefineMessageFiles(message, origin, lang)
	if err != nil {
		return err
	}
	_, err = object.UpdateMessage(message.GetId(), message, false)
	return err
}
