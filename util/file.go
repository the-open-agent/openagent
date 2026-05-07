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
	"bufio"
	"bytes"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/beego/beego"
	"github.com/beego/beego/logs"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/proxy"
)

func getRuntimeDataDir() string {
	frontendBaseDir := conf.GetConfigString("frontendBaseDir")
	if frontendBaseDir == "" {
		return "data"
	}
	return filepath.Join(frontendBaseDir, "data")
}

func ensureDataFile(filename string, urls ...string) error {
	targetPath := filepath.Join(getRuntimeDataDir(), filename)
	if FileExist(targetPath) {
		return nil
	}

	EnsureFileFolderExists(targetPath)

	var lastErr error
	for _, fileURL := range urls {
		buffer, err := DownloadFile(fileURL)
		if err != nil {
			lastErr = err
			continue
		}

		err = os.WriteFile(targetPath, buffer.Bytes(), 0o644)
		if err != nil {
			lastErr = err
			continue
		}

		return nil
	}

	if lastErr != nil {
		return fmt.Errorf("failed to initialize %s: %w", targetPath, lastErr)
	}

	return fmt.Errorf("failed to initialize %s: no download URLs configured", targetPath)
}

func EnsureRuntimeDataFiles() error {
	err := ensureDataFile("regexes.yaml",
		"https://cdn.jsdelivr.net/gh/the-open-agent/openagent@master/data/regexes.yaml",
	)
	if err != nil {
		return err
	}

	if beego.AppConfig.DefaultBool("isLocalIpDb", false) {
		err = ensureDataFile("17monipdb.dat",
			"https://cdn.jsdelivr.net/gh/the-open-agent/openagent@master/data/17monipdb.dat",
		)
		if err != nil {
			return err
		}
	}

	templateFiles := []string{
		"code-server.yaml",
		"kuboard.yaml",
		"pdf2zh.yaml",
	}

	for _, templateFile := range templateFiles {
		err = ensureDataFile(filepath.Join("template", templateFile),
			fmt.Sprintf("https://cdn.jsdelivr.net/gh/the-open-agent/openagent@master/data/template/%s", templateFile),
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func parseJsonToFloats(s string) []float64 {
	s = strings.TrimLeft(s, "[")
	s = strings.TrimRight(s, "]")
	s = strings.ReplaceAll(s, "\n", "")

	tokens := strings.Split(s, " ")
	res := []float64{}
	for _, token := range tokens {
		if token == "" {
			continue
		}

		f := ParseFloat(token)
		res = append(res, f)
	}
	return res
}

func LoadFactorFileByCsv(path string) ([]string, [][]float64) {
	nameArray := []string{}
	dataArray := [][]float64{}

	file, err := os.Open(path)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	rows := [][]string{}
	LoadCsvFile(path, &rows)

	for _, row := range rows {
		if row[0] == "" {
			continue
		}

		nameArray = append(nameArray, row[1])
		dataArray = append(dataArray, parseJsonToFloats(row[2]))
	}

	return nameArray, dataArray
}

func LoadFactorFileByCsv2(path string) ([]string, [][]float64) {
	nameArray := []string{}
	dataArray := [][]float64{}

	file, err := os.Open(path)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	rows := [][]string{}
	LoadCsvFile(path, &rows)

	for _, row := range rows {
		nameArray = append(nameArray, row[0])
		dataArray = append(dataArray, StringsToFloats(row[1:]))
	}

	return nameArray, dataArray
}

func LoadFactorFileBySpace(path string) ([]string, [][]float64) {
	nameArray := []string{}
	dataArray := [][]float64{}

	file, err := os.Open(path)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	const maxCapacity = 1024 * 1024 * 8
	buf := make([]byte, maxCapacity)
	scanner.Buffer(buf, maxCapacity)
	i := 0
	for scanner.Scan() {
		if i == 0 {
			i += 1
			continue
		}

		line := scanner.Text()

		line = strings.Trim(line, " ")
		tokens := strings.Split(line, " ")
		nameArray = append(nameArray, tokens[0])

		data := []float64{}
		for j := 1; j < len(tokens); j++ {
			data = append(data, ParseFloat(tokens[j]))
		}
		dataArray = append(dataArray, data)

		i += 1
	}

	if err = scanner.Err(); err != nil {
		panic(err)
	}

	return nameArray, dataArray
}

func DownloadFile(url string) (*bytes.Buffer, error) {
	httpClient := proxy.GetHttpClient(url)

	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, url)
	}

	fileBuffer := bytes.NewBuffer(nil)
	_, err = io.Copy(fileBuffer, resp.Body)
	if err != nil {
		return nil, err
	}

	return fileBuffer, nil
}

// downloadMaxmindFiles downloads MaxMind database files from GitHub
func downloadMaxmindFiles() {
	frontendBaseDir := conf.GetConfigString("frontendBaseDir")

	// GitHub repo for the data files
	repoURL := "https://github.com/the-open-agent/data"

	// Helper function to download and save a file
	downloadAndSave := func(filename string) error {
		filePath := filepath.Join(frontendBaseDir, "data", filename+".mmdb")
		fileUrl := repoURL + "/raw/master/" + filename + ".mmdb"

		EnsureFileFolderExists(filePath)

		logs.Info("Downloading %s database from %s", filename, fileUrl)
		buffer, err := DownloadFile(fileUrl)
		if err != nil {
			return err
		}

		// Write buffer to file
		file, err := os.Create(filePath)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(file, buffer)
		if err != nil {
			return err
		}

		return nil
	}

	downloadOk := true

	if err := downloadAndSave("GeoLite2-City"); err != nil {
		logs.Warn("Failed to download GeoLite2-City database: %v", err)
		downloadOk = false
	}

	if err := downloadAndSave("GeoLite2-ASN"); err != nil {
		logs.Warn("Failed to download GeoLite2-ASN database: %v", err)
		downloadOk = false
	}

	MaxmindDownloadInProgress = false

	if downloadOk {
		if err := InitMaxmindDb(); err != nil {
			logs.Warn("Failed to initialize MaxMind database: %v", err)
		}
	}
}

// InitMaxmindFiles checks if MaxMind database files are valid and downloads them if needed
func InitMaxmindFiles() {
	// If both databases load successfully, nothing to do
	if InitMaxmindDb() == nil {
		return
	}

	MaxmindDownloadInProgress = true

	go downloadMaxmindFiles()
}
