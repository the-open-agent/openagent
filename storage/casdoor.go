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
	"fmt"

	"github.com/the-open-agent/openagent/auth"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/i18n"
)

type CasdoorProvider struct {
	providerName string
}

func NewCasdoorProvider(providerName string, lang string) (*CasdoorProvider, error) {
	if providerName == "" {
		return nil, fmt.Errorf(i18n.Translate(lang, "storage:storage provider name: [%s] doesn't exist"), providerName)
	}

	return &CasdoorProvider{providerName: providerName}, nil
}

// errCasdoorUnavailable is returned by every CasdoorProvider method instead of
// reaching the SDK while Casdoor is not configured or not reachable: the SDK
// client behind auth.* is never initialized in that state, and calling into
// it nil-dereferences and crashes the process (auth/auth.go is a thin pass-
// through with no guard of its own - see its package doc). conf.IsCasdoorAvailable
// is the same flag every other Casdoor-backed feature already checks before a
// call, e.g. object/message_email.go's SendEmail.
var errCasdoorUnavailable = fmt.Errorf("casdoor storage provider is unavailable: casdoor is not configured or not reachable")

func (p *CasdoorProvider) ListObjects(prefix string) ([]*Object, error) {
	if !conf.IsCasdoorAvailable() {
		return nil, errCasdoorUnavailable
	}

	casdoorOrganization := conf.GetConfigString("casdoorOrganization")
	casdoorApplication := conf.GetConfigString("casdoorApplication")
	resources, err := auth.GetResources(casdoorOrganization, casdoorApplication, "provider", p.providerName, "Direct", prefix)
	if err != nil {
		return nil, err
	}

	res := []*Object{}
	for _, resource := range resources {
		res = append(res, &Object{
			Key:          resource.Name,
			LastModified: resource.CreatedTime,
			Size:         int64(resource.FileSize),
			Url:          resource.Url,
		})
	}
	return res, nil
}

func (p *CasdoorProvider) PutObject(user string, parent string, key string, fileBuffer *bytes.Buffer) (string, error) {
	if !conf.IsCasdoorAvailable() {
		return "", errCasdoorUnavailable
	}

	fileUrl, _, err := auth.UploadResource(user, "OpenAgent", parent, fmt.Sprintf("Direct/%s/%s", p.providerName, key), fileBuffer.Bytes())
	if err != nil {
		return "", err
	}
	return fileUrl, nil
}

func (p *CasdoorProvider) DeleteObject(key string) error {
	if !conf.IsCasdoorAvailable() {
		return errCasdoorUnavailable
	}

	resource := auth.Resource{
		Name: key,
	}

	_, err := auth.DeleteResourceWithTag(&resource, "Direct")
	if err != nil {
		return err
	}
	return nil
}
