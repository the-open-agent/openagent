// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
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
	"errors"
	"testing"

	"github.com/the-open-agent/openagent/conf"
)

// TestCasdoorProviderReturnsErrorWhenUnavailable is a regression test for a
// crash: with Casdoor unreachable, auth.* delegates straight into a nil
// casdoorsdk client (see auth/auth.go), and calling any CasdoorProvider
// method used to reach that nil-dereference instead of returning an error -
// tryStoreRemoteImage's answer-generation path took the whole process down
// with it. These methods must return early instead of ever reaching auth.*
// while conf.IsCasdoorAvailable() is false.
func TestCasdoorProviderReturnsErrorWhenUnavailable(t *testing.T) {
	original := conf.IsCasdoorAvailable()
	conf.SetCasdoorAvailable(false)
	defer conf.SetCasdoorAvailable(original)

	provider, err := NewCasdoorProvider("provider_storage_test", "en")
	if err != nil {
		t.Fatalf("NewCasdoorProvider failed: %v", err)
	}

	if _, err := provider.ListObjects(""); !errors.Is(err, errCasdoorUnavailable) {
		t.Errorf("ListObjects: expected errCasdoorUnavailable, got %v", err)
	}
	if _, err := provider.PutObject("user", "parent", "key", bytes.NewBufferString("data")); !errors.Is(err, errCasdoorUnavailable) {
		t.Errorf("PutObject: expected errCasdoorUnavailable, got %v", err)
	}
	if err := provider.DeleteObject("key"); !errors.Is(err, errCasdoorUnavailable) {
		t.Errorf("DeleteObject: expected errCasdoorUnavailable, got %v", err)
	}
}
