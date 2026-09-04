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

package audit

import (
	"path"
	"regexp"
	"strings"
)

var (
	credentialPattern = regexp.MustCompile(`(?i)\b(?:sk-(?:ant-|proj-)?[a-z0-9_-]{12,}|gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9a-z_-]{30,}|xox[baprs]-[0-9a-z-]{12,}|eyJ[a-z0-9_-]{10,}\.[a-z0-9_-]{10,}\.[a-z0-9_-]{10,})\b`)
	bearerPattern     = regexp.MustCompile(`(?i)(bearer\s+)[a-z0-9._~+/=-]{12,}`)
	privateKeyPattern = regexp.MustCompile(`(?s)-----BEGIN [^-\n]*PRIVATE KEY-----.*?-----END [^-\n]*PRIVATE KEY-----`)
)

func sanitizeToolInput(toolName string, input map[string]interface{}) map[string]interface{} {
	if input == nil {
		return nil
	}
	sanitized := sanitizeMap(input)
	if !isSensitiveWrite(toolName) || !hasSensitivePath(input) {
		return sanitized
	}
	for key := range sanitized {
		normalized := strings.ToLower(strings.NewReplacer("_", "", "-", "").Replace(key))
		switch normalized {
		case "content", "oldstring", "newstring":
			sanitized[key] = "[REDACTED: sensitive file content]"
		}
	}
	return sanitized
}

func sanitizeMap(input map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{}, len(input))
	for key, value := range input {
		result[key] = sanitizeValue(key, value)
	}
	return result
}

func sanitizeValue(key string, value interface{}) interface{} {
	if sensitiveKey(key) {
		return "[REDACTED]"
	}
	switch typed := value.(type) {
	case map[string]interface{}:
		return sanitizeMap(typed)
	case []interface{}:
		result := make([]interface{}, len(typed))
		for i, child := range typed {
			result[i] = sanitizeValue("", child)
		}
		return result
	case string:
		return sanitizeString(typed)
	default:
		return value
	}
}

func sensitiveKey(key string) bool {
	normalized := strings.ToLower(key)
	normalized = strings.NewReplacer("_", "", "-", "", ".", "").Replace(normalized)
	if normalized == "token" || normalized == "accesstoken" || normalized == "refreshtoken" || normalized == "idtoken" {
		return true
	}
	for _, marker := range []string{"secret", "token", "password", "passwd", "credential", "privatekey", "apikey", "accesskey", "authorization", "cookie"} {
		if strings.Contains(normalized, marker) {
			return true
		}
	}
	return false
}

func sanitizeString(value string) string {
	value = privateKeyPattern.ReplaceAllString(value, "[REDACTED PRIVATE KEY]")
	value = bearerPattern.ReplaceAllString(value, "${1}[REDACTED]")
	return credentialPattern.ReplaceAllString(value, "[REDACTED]")
}

func isSensitiveWrite(toolName string) bool {
	normalized := strings.ToLower(toolName)
	return normalized == "write" || normalized == "edit" || normalized == "write_file" || normalized == "edit_file" ||
		strings.HasSuffix(normalized, "__write_file") || strings.HasSuffix(normalized, "__edit_file")
}

func hasSensitivePath(input map[string]interface{}) bool {
	filePath, _ := input["file_path"].(string)
	if filePath == "" {
		filePath, _ = input["path"].(string)
	}
	return isSensitivePath(filePath)
}

func isSensitivePath(filePath string) bool {
	if filePath == "" {
		return false
	}
	normalized := strings.ToLower(strings.ReplaceAll(filePath, `\`, "/"))
	base := path.Base(normalized)
	if strings.HasPrefix(base, ".env") && base != ".env.example" && base != ".env.sample" && base != ".env.template" {
		return true
	}
	if strings.HasPrefix(normalized, ".ssh/") || strings.Contains(normalized, "/.ssh/") || normalized == ".aws/credentials" || strings.HasSuffix(normalized, "/.aws/credentials") {
		return true
	}
	if base == ".npmrc" || base == ".pypirc" || base == "credentials" || base == "id_rsa" || base == "id_ed25519" {
		return true
	}
	return strings.HasSuffix(base, ".pem") || strings.HasSuffix(base, ".key")
}
