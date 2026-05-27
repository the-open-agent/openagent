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

//go:build !skipCi
// +build !skipCi

package txt

import (
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestProcessFiles(t *testing.T) {
	inputDir := "inputdir"   // Specify input file directory
	outputDir := "outputdir" // Specify output directory

	if _, err := os.Stat(outputDir); os.IsNotExist(err) {
		err := os.Mkdir(outputDir, 0o755)
		if err != nil {
			t.Fatalf("Failed to create output directory: %v\n", err)
		}
	}

	supportedExts := []string{".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"}

	files, err := ioutil.ReadDir(inputDir)
	if err != nil {
		t.Fatalf("Failed to read input directory: %v\n", err)
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	totalFiles := len(files)
	processedFiles := 0

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		fileName := file.Name()
		fileExt := strings.ToLower(filepath.Ext(fileName))

		if contains(supportedExts, fileExt) {
			wg.Add(1)
			go func(fileName string, fileExt string) {
				defer wg.Done()

				inputFilePath := filepath.Join(inputDir, fileName)
				outputFileName := strings.TrimSuffix(fileName, fileExt) + ".md"
				outputFilePath := filepath.Join(outputDir, outputFileName)

				parsedText, err := GetParsedTextFromUrl(inputFilePath, fileExt, "en")
				if err != nil {
					mu.Lock()
					t.Logf("Failed to process file %s: %v\n", inputFilePath, err)
					mu.Unlock()
					return
				}

				err = ioutil.WriteFile(outputFilePath, []byte(parsedText), 0o644)
				if err != nil {
					mu.Lock()
					t.Logf("Failed to write file %s: %v\n", outputFilePath, err)
					mu.Unlock()
					return
				}

				mu.Lock()
				processedFiles++
				t.Logf("Successfully processed file: %s (%d/%d)\n", inputFilePath, processedFiles, totalFiles)
				mu.Unlock()
			}(fileName, fileExt)
		}
	}

	wg.Wait()
	t.Log("All files processed")
}

func TestGetParsedTextFromUrl_UnsupportedType(t *testing.T) {
	_, err := GetParsedTextFromUrl("dummy.txt", ".exe", "en")
	if err == nil {
		t.Fatal("expected error for unsupported file type, got nil")
	}
	expected := "unsupported file type: .exe"
	if err.Error() != expected {
		t.Fatalf("expected error %q, got %q", expected, err.Error())
	}
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
