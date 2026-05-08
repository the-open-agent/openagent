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

package routers

import (
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/beego/beego/context"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/internal/cli"
	"github.com/the-open-agent/openagent/util"
)

var frontendBaseDir = conf.GetConfigString("frontendBaseDir")
var cdnFrontendManifestHTTPClient = &http.Client{Timeout: 10 * time.Second}

type frontendManifest struct {
	Entrypoints []string `json:"entrypoints"`
}

type frontendManifestCache struct {
	mutex      sync.Mutex
	expireTime time.Time
	manifest   frontendManifest
}

var cdnFrontendManifestCache frontendManifestCache

func getCdnFrontendBase() string {
	base := strings.TrimRight(cli.FrontendCdnRepoBase, "/")
	version := cli.Version
	if version == "" || version == "dev" {
		return base
	}
	if strings.Contains(base, "@") {
		return base
	}
	return fmt.Sprintf("%s@%s", base, version)
}

func getCdnFrontendManifest() (frontendManifest, error) {
	cdnFrontendManifestCache.mutex.Lock()
	now := time.Now()
	if len(cdnFrontendManifestCache.manifest.Entrypoints) > 0 && now.Before(cdnFrontendManifestCache.expireTime) {
		manifest := cdnFrontendManifestCache.manifest
		cdnFrontendManifestCache.mutex.Unlock()
		return manifest, nil
	}
	cdnFrontendManifestCache.mutex.Unlock()

	manifestURL := getCdnFrontendBase() + "/asset-manifest.json"
	resp, err := cdnFrontendManifestHTTPClient.Get(manifestURL)
	if err != nil {
		return frontendManifest{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return frontendManifest{}, fmt.Errorf("failed to fetch frontend manifest: %s", resp.Status)
	}

	var manifest frontendManifest
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return frontendManifest{}, err
	}
	if len(manifest.Entrypoints) == 0 {
		return frontendManifest{}, fmt.Errorf("frontend manifest has no entrypoints")
	}

	cdnFrontendManifestCache.mutex.Lock()
	cdnFrontendManifestCache.manifest = manifest
	cdnFrontendManifestCache.expireTime = now.Add(10 * time.Minute)
	cdnFrontendManifestCache.mutex.Unlock()
	return manifest, nil
}

func getCdnFrontendIndexHtml() (string, error) {
	manifest, err := getCdnFrontendManifest()
	if err != nil {
		return "", err
	}

	cdnBase := getCdnFrontendBase()
	var cssTags []string
	var scriptTags []string
	for _, entrypoint := range manifest.Entrypoints {
		entrypoint = "/" + strings.TrimLeft(entrypoint, "/")
		switch {
		case strings.HasSuffix(entrypoint, ".css"):
			cssTags = append(cssTags, fmt.Sprintf(`<link href="%s%s" rel="stylesheet">`, cdnBase, entrypoint))
		case strings.HasSuffix(entrypoint, ".js"):
			scriptTags = append(scriptTags, fmt.Sprintf(`<script defer="defer" src="%s%s"></script>`, cdnBase, entrypoint))
		}
	}

	if len(scriptTags) == 0 {
		return "", fmt.Errorf("frontend manifest has no javascript entrypoint")
	}

	return fmt.Sprintf(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#000000"/><meta name="description" content="Web site created using create-react-app"/><link rel="apple-touch-icon" href="https://cdn.openagentai.org/img/openagent.png"/><link rel="manifest" href="https://cdn.openagentai.org/site/openagent/manifest.json"/><title>OpenAgent</title>%s%s</head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>`, strings.Join(cssTags, ""), strings.Join(scriptTags, "")), nil
}

func getWebBuildFolder() string {
	path := "web/build"
	if util.FileExist(filepath.Join(path, "index.html")) || frontendBaseDir == "" {
		return path
	}

	if util.FileExist(filepath.Join(frontendBaseDir, "index.html")) {
		return frontendBaseDir
	}

	path = filepath.Join(frontendBaseDir, "web/build")
	if util.FileExist(filepath.Join(path, "index.html")) {
		return path
	}

	// Fallback: if frontendBaseDir points to "../openagent" but the directory
	// doesn't exist, try "../casibase" for backward compatibility.
	casibaseDir := filepath.Join(filepath.Dir(frontendBaseDir), "casibase")
	if util.FileExist(filepath.Join(casibaseDir, "index.html")) {
		return casibaseDir
	}
	if util.FileExist(filepath.Join(casibaseDir, "web/build", "index.html")) {
		return filepath.Join(casibaseDir, "web/build")
	}

	return path
}

func StaticFilter(ctx *context.Context) {
	urlPath := ctx.Request.URL.Path
	if strings.HasPrefix(urlPath, "/api/") {
		return
	}

	landingFolder := conf.GetConfigString("landingFolder")
	if landingFolder != "" {
		if urlPath == "" || urlPath == "/" || urlPath == "/about" {
			makeGzipResponse(ctx.ResponseWriter, ctx.Request, fmt.Sprintf("../%s/web/build/index.html", landingFolder))
			return
		}

		landingPath := fmt.Sprintf("../%s/web/build%s", landingFolder, urlPath)
		if util.FileExist(landingPath) {
			makeGzipResponse(ctx.ResponseWriter, ctx.Request, landingPath)
			return
		}
	}

	if strings.HasPrefix(urlPath, "/storage") {
		// Check if user is authenticated
		user := GetSessionUser(ctx)
		if user == nil {
			responseError(ctx, "auth:Unauthorized operation")
			return
		}

		ctx.Output.Header(headerAllowOrigin, "*")
		ctx.Output.Header(headerAllowMethods, "POST, GET, OPTIONS, DELETE")
		ctx.Output.Header(headerAllowHeaders, "Content-Type, Authorization")
		ctx.Output.Header(headerAllowCredentials, "true")

		if runtime.GOOS == "windows" {
			urlPath = strings.TrimPrefix(urlPath, "/storage/")
		} else {
			urlPath = strings.TrimPrefix(urlPath, "/storage")
		}

		urlPath = strings.Replace(urlPath, "|", ":", 1)
		makeGzipResponse(ctx.ResponseWriter, ctx.Request, urlPath)
		return
	}

	webBuildFolder := getWebBuildFolder()
	path := webBuildFolder
	if urlPath == "/" {
		path += "/index.html"
	} else {
		path += urlPath
	}

	if strings.Contains(path, "/../") || !util.FileExist(path) {
		path = webBuildFolder + "/index.html"
	}
	if util.FileExist(path) {
		makeGzipResponse(ctx.ResponseWriter, ctx.Request, path)
	} else {
		fallback := "web/build/index.html"
		if util.FileExist(fallback) {
			err := util.AppendWebConfigCookie(ctx)
			if err != nil {
				fmt.Println(err)
			}
			makeGzipResponse(ctx.ResponseWriter, ctx.Request, fallback)
		} else {
			html, err := getCdnFrontendIndexHtml()
			if err != nil {
				ctx.ResponseWriter.WriteHeader(http.StatusInternalServerError)
				_, _ = fmt.Fprintf(ctx.ResponseWriter, "Failed to load frontend manifest from CDN: %v", err)
				return
			}
			ctx.ResponseWriter.Header().Set("Content-Type", "text/html; charset=utf-8")
			ctx.ResponseWriter.WriteHeader(http.StatusOK)
			_, _ = fmt.Fprint(ctx.ResponseWriter, html)
		}
	}
}

type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

func makeGzipResponse(w http.ResponseWriter, r *http.Request, path string) {
	if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		serveFileWithReplace(w, r, path)
		return
	}
	w.Header().Set("Content-Encoding", "gzip")
	gz := gzip.NewWriter(w)
	defer gz.Close()
	gzw := gzipResponseWriter{Writer: gz, ResponseWriter: w}
	serveFileWithReplace(gzw, r, path)
}

func serveFileWithReplace(w http.ResponseWriter, r *http.Request, path string) {
	if !regexp.MustCompile(`/static/js/main\.[a-f0-9]+\.js$`).MatchString(path) {
		http.ServeFile(w, r, path)
		return
	}

	f, err := os.Open(filepath.Clean(path))
	if err != nil {
		panic(err)
	}
	defer f.Close()

	d, err := f.Stat()
	if err != nil {
		panic(err)
	}

	oldContent := util.ReadStringFromPath(path)
	newContent := oldContent

	serverUrl := conf.GetConfigString("casdoorEndpoint")
	clientId := conf.GetConfigString("clientId")
	appName := conf.GetConfigString("casdoorApplication")
	organizationName := conf.GetConfigString("casdoorOrganization")

	newContent = regexp.MustCompile(`serverUrl:"[^"]*"`).ReplaceAllString(newContent, fmt.Sprintf(`serverUrl:"%s"`, serverUrl))
	newContent = regexp.MustCompile(`clientId:"[^"]*"`).ReplaceAllString(newContent, fmt.Sprintf(`clientId:"%s"`, clientId))
	newContent = regexp.MustCompile(`appName:"[^"]*"`).ReplaceAllString(newContent, fmt.Sprintf(`appName:"%s"`, appName))
	newContent = regexp.MustCompile(`organizationName:"[^"]*"`).ReplaceAllString(newContent, fmt.Sprintf(`organizationName:"%s"`, organizationName))

	http.ServeContent(w, r, d.Name(), d.ModTime(), strings.NewReader(newContent))
}
