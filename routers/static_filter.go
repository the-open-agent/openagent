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
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"github.com/beego/beego/context"
	"github.com/beego/beego/logs"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/embedsupport"
	"github.com/the-open-agent/openagent/util"
)

func getWebBuildFolder() string {
	path := "web/build"
	if util.FileExist(filepath.Join(path, "index.html")) {
		return path
	}

	frontendBaseDir := conf.FrontendBaseDir
	if util.FileExist(filepath.Join(frontendBaseDir, "index.html")) {
		return frontendBaseDir
	}

	path = filepath.Join(frontendBaseDir, "web/build")
	if util.FileExist(filepath.Join(path, "index.html")) {
		return path
	}

	// Fallback: try "../casibase" for backward compatibility.
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

	if strings.HasPrefix(urlPath, "/swagger") {
		if !util.FileExist(filepath.Join("swagger", "index.html")) {
			target := urlPath
			if target == "/swagger" || target == "/swagger/" {
				target = "/swagger/index.html"
			}
			http.Redirect(ctx.ResponseWriter, ctx.Request, "https://try.openagentai.org"+target, http.StatusFound)
			return
		}
	}

	if strings.HasPrefix(urlPath, "/storage") {
		// Echo the request Origin instead of "*": browsers reject a wildcard
		// Allow-Origin when the request carries credentials, which the file
		// preview fetch does (credentials: "include"). Same-origin / non-CORS
		// requests have no Origin header and fall back to "*".
		if origin := ctx.Input.Header(headerOrigin); origin != "" && origin != "null" {
			ctx.Output.Header(headerAllowOrigin, origin)
		} else {
			ctx.Output.Header(headerAllowOrigin, "*")
		}
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
				logs.Error("AppendWebConfigCookie() error: %s", err.Error())
			}
			makeGzipResponse(ctx.ResponseWriter, ctx.Request, fallback)
		} else if embedsupport.WebFS() != nil {
			err := util.AppendWebConfigCookie(ctx)
			if err != nil {
				logs.Error("AppendWebConfigCookie() error: %s", err.Error())
			}
			embedsupport.ServeEmbedded(ctx.ResponseWriter, ctx.Request, urlPath)
		} else {
			ctx.ResponseWriter.Header().Set("Content-Type", "text/html; charset=utf-8")
			ctx.ResponseWriter.WriteHeader(http.StatusNotFound)
			_, _ = fmt.Fprint(ctx.ResponseWriter, `<!DOCTYPE html><html><head><title>Frontend Not Built</title></head><body><h2>Frontend not built</h2><p>Please run <code>cd web &amp;&amp; yarn install &amp;&amp; yarn build</code> to build the frontend.</p></body></html>`)
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

	issuer := conf.GetConfigString("issuer")
	if issuer == "" {
		issuer = conf.GetConfigString("casdoorEndpoint") // backward compat
	}
	clientId := conf.GetConfigString("clientId")
	appName := conf.GetConfigString("casdoorApplication")           // casdoor backward compat
	organizationName := conf.GetConfigString("casdoorOrganization") // casdoor backward compat

	newContent = regexp.MustCompile(`issuer:"[^"]*"`).ReplaceAllString(newContent, fmt.Sprintf(`issuer:"%s"`, issuer))
	newContent = regexp.MustCompile(`clientId:"[^"]*"`).ReplaceAllString(newContent, fmt.Sprintf(`clientId:"%s"`, clientId))
	newContent = regexp.MustCompile(`appName:"[^"]*"`).ReplaceAllString(newContent, fmt.Sprintf(`appName:"%s"`, appName))
	newContent = regexp.MustCompile(`organizationName:"[^"]*"`).ReplaceAllString(newContent, fmt.Sprintf(`organizationName:"%s"`, organizationName))

	http.ServeContent(w, r, d.Name(), d.ModTime(), strings.NewReader(newContent))
}
