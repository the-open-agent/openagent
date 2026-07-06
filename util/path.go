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

package util

import (
	"io/ioutil"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func FileExist(path string) bool {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return false
	}
	return true
}

func GetPath(path string) string {
	return filepath.Dir(path)
}

func EnsureFileFolderExists(path string) {
	p := GetPath(path)
	if !FileExist(p) {
		err := os.MkdirAll(p, os.ModePerm)
		if err != nil {
			panic(err)
		}
	}
}

func EnsureFolderExists(path string) error {
	if !FileExist(path) {
		return os.MkdirAll(path, os.ModePerm)
	}
	return nil
}

func RemoveExt(filename string) string {
	return filename[:len(filename)-len(filepath.Ext(filename))]
}

func ListFiles(path string) []string {
	res := []string{}

	files, err := ioutil.ReadDir(path)
	if err != nil {
		panic(err)
	}

	for _, f := range files {
		if !f.IsDir() {
			res = append(res, f.Name())
		}
	}

	return res
}

// joinQueryValuesForDisplay builds a query string from decoded url.Values without
// re-applying percent-encoding, so non-ASCII characters remain readable in logs.
func joinQueryValuesForDisplay(v url.Values) string {
	keys := make([]string, 0, len(v))
	for k := range v {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(keys)*2)
	for _, k := range keys {
		for _, val := range v[k] {
			parts = append(parts, k+"="+val)
		}
	}
	return strings.Join(parts, "&")
}

func FilterQuery(urlString string, blackList []string) string {
	urlData, err := url.Parse(urlString)
	if err != nil {
		return urlString
	}

	queries := urlData.Query()
	retQuery := make(url.Values)
	for key, value := range queries {
		inBlackList := false
		for _, blackListItem := range blackList {
			if blackListItem == key {
				inBlackList = true
				break
			}
		}
		if !inBlackList {
			retQuery[key] = value
		}
	}
	path := urlData.Path
	if p, err := url.PathUnescape(path); err == nil {
		path = p
	}
	if len(retQuery) > 0 {
		return path + "?" + joinQueryValuesForDisplay(retQuery)
	}
	return path
}

func CopyFile(dest string, src string) {
	bs, err := os.ReadFile(src)
	if err != nil {
		panic(err)
	}

	err = os.WriteFile(dest, bs, 0o644)
	if err != nil {
		panic(err)
	}
}
