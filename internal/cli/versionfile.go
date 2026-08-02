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

package cli

import (
	"os"
	"path/filepath"
)

// WriteVersionFile records this build's version in a plain "version" file next
// to the binary, so an external tool can read the version without starting or
// querying the server. The official release binaries are built with -trimpath
// and packed with UPX, which erases the version from the Go build metadata; a
// running binary still knows its own version, so writing it once on startup is
// what makes it recoverable offline.
//
// It is best-effort - a failure never affects startup - and only writes a real
// version, since a plain "dev" build has nothing worth recording. The location
// mirrors where the SQLite database lives (next to the executable).
func WriteVersionFile() {
	if Version == "" || Version == "dev" {
		return
	}
	exe, err := os.Executable()
	if err != nil {
		return
	}
	if resolved, err := filepath.EvalSymlinks(exe); err == nil {
		exe = resolved
	}
	_ = os.WriteFile(filepath.Join(filepath.Dir(exe), "version"), []byte(Version+"\n"), 0o644)
}
