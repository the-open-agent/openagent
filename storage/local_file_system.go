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

package storage

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/the-open-agent/openagent/util"
)

type LocalFileSystemStorageProvider struct {
	path string
}

func NewLocalFileSystemStorageProvider(path string) (*LocalFileSystemStorageProvider, error) {
	path = strings.ReplaceAll(path, "\\", "/")
	return &LocalFileSystemStorageProvider{path: path}, nil
}

func (p *LocalFileSystemStorageProvider) ListObjects(prefix string) ([]*Object, error) {
	objects := []*Object{}
	fullPath := filepath.Join(p.path, prefix)
	fullPath = strings.ReplaceAll(fullPath, "\\", "/")
	if err := util.EnsureFolderExists(fullPath); err != nil {
		return nil, err
	}

	filepath.Walk(fullPath, func(path string, info os.FileInfo, err error) error {
		if path == fullPath {
			return nil
		}

		base := filepath.Base(path)
		if info.IsDir() && (strings.HasPrefix(base, ".") || base == "node_modules") {
			return filepath.SkipDir
		}

		if err == nil && !info.IsDir() {
			modTime := info.ModTime()
			path = strings.ReplaceAll(path, "\\", "/")
			relativePath := strings.TrimPrefix(path, p.path)
			relativePath = strings.TrimPrefix(relativePath, "/")

			objects = append(objects, &Object{
				Key:          relativePath,
				LastModified: modTime.Format(time.RFC3339),
				Size:         info.Size(),
				Url:          path,
			})
		}
		return nil
	})

	return objects, nil
}

func (p *LocalFileSystemStorageProvider) PutObject(user string, parent string, key string, fileBuffer *bytes.Buffer) (string, error) {
	fullPath := filepath.Join(p.path, key)
	err := os.MkdirAll(filepath.Dir(fullPath), os.ModePerm)
	if err != nil {
		return "", err
	}

	dst, err := os.Create(filepath.Clean(fullPath))
	if err != nil {
		return "", err
	}
	defer dst.Close()

	_, err = io.Copy(dst, fileBuffer)
	return fullPath, err
}

func (p *LocalFileSystemStorageProvider) DeleteObject(key string) error {
	fullPath := filepath.Join(p.path, key)
	if strings.HasSuffix(key, "_hidden.ini") {
		fullPath = filepath.Dir(fullPath)
	}
	return os.RemoveAll(fullPath)
}
