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

//go:build embed

// This file is only compiled when building with -tags embed.
// It embeds conf/, web/build/ (without source-map files), skills/, the OCR
// service and the PPTX worker into the binary, and wires them up via
// embedsupport.Setup so that the server can run from a single executable
// without any on-disk assets.
// On-disk files always take priority over the embedded versions at runtime.

package main

import (
	"embed"
	"io/fs"

	"github.com/the-open-agent/openagent/embedsupport"
)

//go:embed conf
var _embeddedConf embed.FS

// web/build is embedded file by file so that *.map (source-map) files are
// excluded — they are only needed for debugging and can be tens of MB.
//
//go:embed web/build/index.html web/build/manifest.json web/build/asset-manifest.json
//go:embed web/build/static/css/*.css
//go:embed web/build/static/js/*.js web/build/static/js/*.txt
//go:embed web/build/static/media
//go:embed web/build/img web/build/icon web/build/flag-icons
var _embeddedWeb embed.FS

//go:embed skills
var _embeddedSkills embed.FS

//go:embed deploy/ocr-service
var _embeddedOcrService embed.FS

//go:embed tool/pptx-worker/worker.bundle.mjs
var _embeddedPptxWorker embed.FS

func init() {
	confFS, _ := fs.Sub(_embeddedConf, "conf")
	webFS, _ := fs.Sub(_embeddedWeb, "web/build")
	skillsFS, _ := fs.Sub(_embeddedSkills, "skills")
	ocrServiceFS, _ := fs.Sub(_embeddedOcrService, "deploy/ocr-service")
	pptxWorkerFS, _ := fs.Sub(_embeddedPptxWorker, "tool/pptx-worker")
	embedsupport.Setup(confFS, webFS, skillsFS, ocrServiceFS, pptxWorkerFS)
}
