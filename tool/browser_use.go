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

package tool

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/ThinkInAIXYZ/go-mcp/protocol"
	"github.com/chromedp/cdproto/cdp"
	cdpinput "github.com/chromedp/cdproto/input"
	"github.com/chromedp/cdproto/target"
	"github.com/chromedp/chromedp"
	"github.com/chromedp/chromedp/kb"
	"github.com/the-open-agent/openagent/agent/builtin_tool"
	"github.com/the-open-agent/openagent/proxy"
)

const (
	browserUseDefaultTimeout       = 30 * time.Second
	browserUseDownloadAttempts     = 3
	browserUseMaxElements          = 120
	chromeForTestingEndpoint       = "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json"
	chromeForTestingDefaultChannel = "Stable"
)

// BrowserUseTool is the Tool Type "browser_use".
// It opens a visible, persistent Chromium browser for human-observable web tasks.
type BrowserUseTool struct {
	sessionKey  string
	userDataDir string
	enableProxy bool
}

func NewBrowserUseTool(config Config) (*BrowserUseTool, error) {
	userDataDir := defaultBrowserUseDataDir()
	sessionKey := strings.Join([]string{userDataDir, strconv.FormatBool(config.EnableProxy)}, "|")
	return &BrowserUseTool{
		sessionKey:  sessionKey,
		userDataDir: userDataDir,
		enableProxy: config.EnableProxy,
	}, nil
}

func (p *BrowserUseTool) BuiltinTools() []builtin_tool.BuiltinTool {
	return []builtin_tool.BuiltinTool{
		&browserUseOpenBuiltin{provider: p},
		&browserUseSnapshotBuiltin{provider: p},
		&browserUseClickBuiltin{provider: p},
		&browserUseTypeBuiltin{provider: p},
		&browserUsePressBuiltin{provider: p},
		&browserUsePlayMediaBuiltin{provider: p},
		&browserUseTabsBuiltin{provider: p},
		&browserUseSwitchTabBuiltin{provider: p},
		&browserUseCloseBuiltin{provider: p},
	}
}

type browserUseManager struct {
	mu       sync.Mutex
	sessions map[string]*browserUseSession
}

type browserUseSession struct {
	mu             sync.Mutex
	executablePath string
	userDataDir    string
	enableProxy    bool
	allocCancel    context.CancelFunc
	browserCancel  context.CancelFunc
	targetCancel   context.CancelFunc
	browserCtx     context.Context
	ctx            context.Context
	activeTargetID target.ID
}

var globalBrowserUseManager = &browserUseManager{sessions: map[string]*browserUseSession{}}

func (m *browserUseManager) get(provider *BrowserUseTool) *browserUseSession {
	m.mu.Lock()
	defer m.mu.Unlock()

	session, ok := m.sessions[provider.sessionKey]
	if ok {
		return session
	}

	session = &browserUseSession{
		userDataDir: provider.userDataDir,
		enableProxy: provider.enableProxy,
	}
	m.sessions[provider.sessionKey] = session
	return session
}

func (m *browserUseManager) close(provider *BrowserUseTool) *browserUseSession {
	m.mu.Lock()
	defer m.mu.Unlock()

	session, ok := m.sessions[provider.sessionKey]
	if !ok {
		return &browserUseSession{}
	}
	delete(m.sessions, provider.sessionKey)
	return session
}

func (p *BrowserUseTool) run(actions ...chromedp.Action) error {
	session := globalBrowserUseManager.get(p)
	session.mu.Lock()
	defer session.mu.Unlock()

	if err := session.ensureLocked(); err != nil {
		return err
	}

	timeoutCtx, cancel := context.WithTimeout(session.ctx, browserUseDefaultTimeout)
	defer cancel()
	return chromedp.Run(timeoutCtx, actions...)
}

func (p *BrowserUseTool) runSession(fn func(session *browserUseSession) error) error {
	session := globalBrowserUseManager.get(p)
	session.mu.Lock()
	defer session.mu.Unlock()

	if err := session.ensureLocked(); err != nil {
		return err
	}
	return fn(session)
}

func (p *BrowserUseTool) close() {
	session := globalBrowserUseManager.close(p)
	session.mu.Lock()
	defer session.mu.Unlock()
	session.closeLocked()
}

func (s *browserUseSession) ensureLocked() error {
	if s.browserCtx != nil {
		probeCtx, cancel := context.WithTimeout(s.browserCtx, 2*time.Second)
		defer cancel()
		if _, err := chromedp.Targets(probeCtx); err == nil {
			if s.ctx == nil {
				s.ctx = s.browserCtx
			}
			return nil
		}
		s.closeLocked()
	}

	var allocCtx context.Context
	var allocCancel context.CancelFunc
	var err error

	if err = os.MkdirAll(s.userDataDir, 0o755); err != nil {
		return fmt.Errorf("failed to create browser profile directory %s: %w", s.userDataDir, err)
	}
	if s.executablePath == "" || !fileExists(s.executablePath) {
		s.executablePath, err = ensureBrowserUseChromeForTesting()
		if err != nil {
			return err
		}
	}

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", false),
		chromedp.Flag("mute-audio", false),
		chromedp.Flag("hide-scrollbars", false),
		chromedp.Flag("disable-gpu", false),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("restore-on-startup", false),
		chromedp.Flag("autoplay-policy", "no-user-gesture-required"),
		chromedp.NoFirstRun,
		chromedp.NoDefaultBrowserCheck,
		chromedp.UserDataDir(s.userDataDir),
		chromedp.WindowSize(1280, 900),
		chromedp.ExecPath(s.executablePath),
	)
	if s.enableProxy {
		if socks5Addr := proxy.GetSocks5ProxyAddress(); socks5Addr != "" {
			opts = append(opts, chromedp.Flag("proxy-server", "socks5://"+socks5Addr))
		}
	}
	allocCtx, allocCancel = chromedp.NewExecAllocator(context.Background(), opts...)

	browserCtx, browserCancel := chromedp.NewContext(
		allocCtx,
		chromedp.WithLogf(func(string, ...interface{}) {}),
		chromedp.WithErrorf(func(string, ...interface{}) {}),
	)
	if err = chromedp.Run(browserCtx); err != nil {
		browserCancel()
		allocCancel()
		return fmt.Errorf("failed to start browser use session: %w", err)
	}

	s.allocCancel = allocCancel
	s.browserCancel = browserCancel
	s.browserCtx = browserCtx
	s.ctx = browserCtx
	if chromeContext := chromedp.FromContext(browserCtx); chromeContext != nil && chromeContext.Target != nil {
		s.activeTargetID = chromeContext.Target.TargetID
	}
	return nil
}

func (s *browserUseSession) closeLocked() {
	if s.targetCancel != nil {
		s.targetCancel()
	}
	if s.browserCancel != nil {
		s.browserCancel()
	}
	if s.allocCancel != nil {
		s.allocCancel()
	}
	s.ctx = nil
	s.browserCtx = nil
	s.targetCancel = nil
	s.browserCancel = nil
	s.allocCancel = nil
	s.activeTargetID = ""
}

func defaultBrowserUseDataDir() string {
	if configDir, err := os.UserConfigDir(); err == nil && configDir != "" {
		return filepath.Join(configDir, "openagent", "browser-use")
	}
	return filepath.Join(os.TempDir(), "openagent-browser-use")
}

var browserUseDownloadMu sync.Mutex

type chromeForTestingMetadata struct {
	Channels map[string]chromeForTestingChannel `json:"channels"`
}

type chromeForTestingChannel struct {
	Channel   string                    `json:"channel"`
	Version   string                    `json:"version"`
	Downloads chromeForTestingDownloads `json:"downloads"`
}

type chromeForTestingDownloads struct {
	Chrome []chromeForTestingDownload `json:"chrome"`
}

type chromeForTestingDownload struct {
	Platform string `json:"platform"`
	URL      string `json:"url"`
}

func ensureBrowserUseChromeForTesting() (string, error) {
	browserUseDownloadMu.Lock()
	defer browserUseDownloadMu.Unlock()

	platform, err := chromeForTestingPlatform()
	if err != nil {
		return "", err
	}

	metadata, err := fetchChromeForTestingMetadata()
	if err != nil {
		return "", err
	}

	channelMeta, ok := metadata.Channels[chromeForTestingDefaultChannel]
	if !ok {
		return "", fmt.Errorf("Chrome for Testing channel %q is not available", chromeForTestingDefaultChannel)
	}

	var downloadURL string
	for _, item := range channelMeta.Downloads.Chrome {
		if item.Platform == platform {
			downloadURL = item.URL
			break
		}
	}
	if downloadURL == "" {
		return "", fmt.Errorf("Chrome for Testing channel %q does not provide a chrome download for platform %q", chromeForTestingDefaultChannel, platform)
	}

	cacheDir := browserUseCacheDir()
	installDir := filepath.Join(cacheDir, strings.ToLower(chromeForTestingDefaultChannel), channelMeta.Version, platform)
	executablePath := browserUseChromeExecutablePath(installDir, platform)
	if fileExists(executablePath) {
		return executablePath, nil
	}

	if err = os.RemoveAll(installDir); err != nil {
		return "", fmt.Errorf("failed to reset Chrome for Testing install directory %s: %w", installDir, err)
	}
	if err = os.MkdirAll(installDir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create Chrome for Testing install directory %s: %w", installDir, err)
	}

	archivePath := filepath.Join(cacheDir, "downloads", fmt.Sprintf("chrome-%s-%s.zip", channelMeta.Version, platform))
	if err = downloadBrowserUseArchive(downloadURL, archivePath); err != nil {
		return "", err
	}
	if err = unzipBrowserUseArchive(archivePath, installDir); err != nil {
		return "", err
	}
	if !fileExists(executablePath) {
		return "", fmt.Errorf("Chrome for Testing executable was not found after install: %s", executablePath)
	}
	if err = os.Chmod(executablePath, 0o755); err != nil {
		return "", fmt.Errorf("failed to mark Chrome for Testing executable as runnable: %w", err)
	}
	return executablePath, nil
}

func chromeForTestingPlatform() (string, error) {
	platforms := map[string]string{
		"darwin/amd64":  "mac-x64",
		"darwin/arm64":  "mac-arm64",
		"linux/amd64":   "linux64",
		"windows/386":   "win32",
		"windows/amd64": "win64",
		"windows/arm64": "win64",
	}
	key := runtime.GOOS + "/" + runtime.GOARCH
	if platform, ok := platforms[key]; ok {
		return platform, nil
	}
	return "", fmt.Errorf("Chrome for Testing does not provide a managed browser for %s/%s", runtime.GOOS, runtime.GOARCH)
}

func browserUseCacheDir() string {
	if cacheDir, err := os.UserCacheDir(); err == nil && cacheDir != "" {
		return filepath.Join(cacheDir, "openagent", "browser-use")
	}
	return filepath.Join(os.TempDir(), "openagent-browser-use")
}

func fetchChromeForTestingMetadata() (*chromeForTestingMetadata, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(chromeForTestingEndpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Chrome for Testing metadata: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("failed to fetch Chrome for Testing metadata: HTTP %d", resp.StatusCode)
	}
	var metadata chromeForTestingMetadata
	if err = json.NewDecoder(resp.Body).Decode(&metadata); err != nil {
		return nil, fmt.Errorf("failed to parse Chrome for Testing metadata: %w", err)
	}
	return &metadata, nil
}

func downloadBrowserUseArchive(downloadURL, archivePath string) error {
	if fileExists(archivePath) {
		if err := verifyBrowserUseArchive(archivePath); err == nil {
			return nil
		}
		_ = os.Remove(archivePath)
	}
	var lastErr error
	for attempt := 1; attempt <= browserUseDownloadAttempts; attempt++ {
		lastErr = downloadBrowserUseArchiveOnce(downloadURL, archivePath)
		if lastErr == nil {
			return nil
		}
		if attempt < browserUseDownloadAttempts {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
	}
	return lastErr
}

func downloadBrowserUseArchiveOnce(downloadURL, archivePath string) error {
	if err := os.MkdirAll(filepath.Dir(archivePath), 0o755); err != nil {
		return fmt.Errorf("failed to create browser download directory: %w", err)
	}

	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Get(downloadURL)
	if err != nil {
		return fmt.Errorf("failed to download Chrome for Testing from %s: %w", downloadURL, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("failed to download Chrome for Testing from %s: HTTP %d", downloadURL, resp.StatusCode)
	}

	tmpPath := archivePath + ".tmp"
	_ = os.Remove(tmpPath)
	out, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to create browser archive %s: %w", tmpPath, err)
	}
	written, copyErr := io.Copy(out, resp.Body)
	closeErr := out.Close()
	if copyErr != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to write browser archive %s: %w", tmpPath, copyErr)
	}
	if closeErr != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to close browser archive %s: %w", tmpPath, closeErr)
	}
	if resp.ContentLength > 0 && written != resp.ContentLength {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("browser archive download was incomplete: got %d bytes, expected %d", written, resp.ContentLength)
	}
	if err = verifyBrowserUseArchive(tmpPath); err != nil {
		_ = os.Remove(tmpPath)
		return err
	}
	if err = os.Rename(tmpPath, archivePath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to move browser archive to %s: %w", archivePath, err)
	}
	return nil
}

func verifyBrowserUseArchive(archivePath string) error {
	reader, err := zip.OpenReader(archivePath)
	if err != nil {
		return fmt.Errorf("downloaded browser archive is invalid: %w", err)
	}
	return reader.Close()
}

func unzipBrowserUseArchive(archivePath, destDir string) error {
	reader, err := zip.OpenReader(archivePath)
	if err != nil {
		return fmt.Errorf("failed to open browser archive %s: %w", archivePath, err)
	}
	defer reader.Close()

	cleanDest := filepath.Clean(destDir)
	for _, file := range reader.File {
		targetPath := filepath.Join(cleanDest, file.Name)
		if targetPath != cleanDest && !strings.HasPrefix(targetPath, cleanDest+string(os.PathSeparator)) {
			return fmt.Errorf("browser archive contains unsafe path: %s", file.Name)
		}

		if file.FileInfo().IsDir() {
			if err = os.MkdirAll(targetPath, file.Mode()); err != nil {
				return fmt.Errorf("failed to create browser directory %s: %w", targetPath, err)
			}
			continue
		}

		if err = os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
			return fmt.Errorf("failed to create browser file directory %s: %w", filepath.Dir(targetPath), err)
		}
		src, err := file.Open()
		if err != nil {
			return fmt.Errorf("failed to open browser archive entry %s: %w", file.Name, err)
		}
		dst, err := os.OpenFile(targetPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			_ = src.Close()
			return fmt.Errorf("failed to create browser file %s: %w", targetPath, err)
		}
		_, copyErr := io.Copy(dst, src)
		closeSrcErr := src.Close()
		closeDstErr := dst.Close()
		if copyErr != nil {
			return fmt.Errorf("failed to extract browser file %s: %w", targetPath, copyErr)
		}
		if closeSrcErr != nil {
			return fmt.Errorf("failed to close browser archive entry %s: %w", file.Name, closeSrcErr)
		}
		if closeDstErr != nil {
			return fmt.Errorf("failed to close browser file %s: %w", targetPath, closeDstErr)
		}
	}
	return nil
}

func browserUseChromeExecutablePath(installDir, platform string) string {
	switch platform {
	case "mac-arm64", "mac-x64":
		return filepath.Join(installDir, "chrome-"+platform, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing")
	case "linux64":
		return filepath.Join(installDir, "chrome-linux64", "chrome")
	case "win32", "win64":
		return filepath.Join(installDir, "chrome-"+platform, "chrome.exe")
	default:
		return ""
	}
}

func fileExists(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func browserUseSelector(arguments map[string]interface{}) (string, error) {
	if rawIndex, ok := arguments["index"]; ok {
		index, err := browserUsePositiveInt(rawIndex, "index")
		if err != nil {
			return "", err
		}
		return fmt.Sprintf(`[data-openagent-browser-use-ref="%d"]`, index), nil
	}
	if selector, ok := arguments["selector"].(string); ok && strings.TrimSpace(selector) != "" {
		return strings.TrimSpace(selector), nil
	}
	return "", fmt.Errorf("missing required parameter: index or selector")
}

func browserUsePositiveInt(raw interface{}, name string) (int, error) {
	switch value := raw.(type) {
	case float64:
		index := int(value)
		if value != float64(index) {
			return 0, fmt.Errorf("%s must be an integer", name)
		}
		if index <= 0 {
			return 0, fmt.Errorf("%s must be greater than 0", name)
		}
		return index, nil
	case int:
		if value <= 0 {
			return 0, fmt.Errorf("%s must be greater than 0", name)
		}
		return value, nil
	default:
		return 0, fmt.Errorf("%s must be an integer", name)
	}
}

func browserUseSelectAllModifier() cdpinput.Modifier {
	if runtime.GOOS == "darwin" {
		return cdpinput.ModifierMeta
	}
	return cdpinput.ModifierCtrl
}

func browserUseJSONLiteral(value string) string {
	data, err := json.Marshal(value)
	if err != nil {
		return `""`
	}
	return string(data)
}

type browserUseElement struct {
	Index       int      `json:"index"`
	Tag         string   `json:"tag"`
	Text        string   `json:"text"`
	AriaLabel   string   `json:"ariaLabel"`
	Placeholder string   `json:"placeholder"`
	Value       string   `json:"value"`
	Options     []string `json:"options"`
	Href        string   `json:"href"`
	Role        string   `json:"role"`
	X           float64  `json:"x"`
	Y           float64  `json:"y"`
	Width       float64  `json:"width"`
	Height      float64  `json:"height"`
}

type browserUseTab struct {
	Index  int
	ID     target.ID
	Title  string
	URL    string
	Active bool
}

func (s *browserUseSession) pageTargetsLocked() ([]*target.Info, error) {
	timeoutCtx, cancel := context.WithTimeout(s.browserCtx, browserUseDefaultTimeout)
	defer cancel()

	infos, err := chromedp.Targets(timeoutCtx)
	if err != nil {
		return nil, err
	}
	tabs := make([]*target.Info, 0)
	for _, info := range infos {
		if info.Type != "page" {
			continue
		}
		if strings.HasPrefix(info.URL, "devtools://") {
			continue
		}
		tabs = append(tabs, info)
	}
	return tabs, nil
}

func (s *browserUseSession) currentTargetIDLocked() target.ID {
	if s.activeTargetID != "" {
		return s.activeTargetID
	}
	if chromeContext := chromedp.FromContext(s.ctx); chromeContext != nil && chromeContext.Target != nil {
		return chromeContext.Target.TargetID
	}
	return ""
}

func (s *browserUseSession) switchToTargetLocked(targetID target.ID) error {
	if targetID == "" {
		return fmt.Errorf("missing tab target id")
	}

	found := false
	tabs, err := s.pageTargetsLocked()
	if err != nil {
		return err
	}
	for _, tab := range tabs {
		if tab.TargetID == targetID {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("tab target %s was not found", targetID)
	}

	targetCtx, cancel := chromedp.NewContext(s.browserCtx, chromedp.WithTargetID(targetID))
	err = chromedp.Run(targetCtx, chromedp.ActionFunc(func(ctx context.Context) error {
		chromeContext := chromedp.FromContext(ctx)
		if chromeContext == nil || chromeContext.Browser == nil {
			return fmt.Errorf("browser context is not ready")
		}
		return target.ActivateTarget(targetID).Do(cdp.WithExecutor(ctx, chromeContext.Browser))
	}))
	if err != nil {
		cancel()
		return err
	}

	if s.targetCancel != nil {
		s.targetCancel()
	}
	s.ctx = targetCtx
	s.targetCancel = cancel
	s.activeTargetID = targetID
	return nil
}

func (s *browserUseSession) switchToNewTargetLocked(before map[target.ID]bool, previousURL string) (bool, error) {
	var fallback target.ID
	for attempt := 0; attempt < 20; attempt++ {
		tabs, err := s.pageTargetsLocked()
		if err != nil {
			return false, err
		}
		for _, tab := range tabs {
			if before[tab.TargetID] {
				continue
			}
			if fallback == "" {
				fallback = tab.TargetID
			}
			if strings.TrimSpace(tab.URL) == "" || tab.URL == "about:blank" {
				continue
			}
			if previousURL != "" && tab.URL == previousURL && attempt < 19 {
				continue
			}
			if err = s.switchToTargetLocked(tab.TargetID); err != nil {
				return false, err
			}
			return true, nil
		}
		if fallback != "" {
			time.Sleep(250 * time.Millisecond)
		}
	}
	if fallback != "" {
		if err := s.switchToTargetLocked(fallback); err != nil {
			return false, err
		}
		return true, nil
	}
	return false, nil
}

func browserUseListTabs(provider *BrowserUseTool) ([]browserUseTab, error) {
	var tabs []browserUseTab
	err := provider.runSession(func(session *browserUseSession) error {
		activeTargetID := session.currentTargetIDLocked()
		targets, err := session.pageTargetsLocked()
		if err != nil {
			return err
		}
		for index, info := range targets {
			tabs = append(tabs, browserUseTab{
				Index:  index + 1,
				ID:     info.TargetID,
				Title:  info.Title,
				URL:    info.URL,
				Active: info.TargetID == activeTargetID,
			})
		}
		return nil
	})
	return tabs, err
}

func browserUseFormatTabs(tabs []browserUseTab) string {
	if len(tabs) == 0 {
		return "No browser tabs found."
	}
	var builder strings.Builder
	builder.WriteString("Browser tabs:\n")
	for _, tab := range tabs {
		active := ""
		if tab.Active {
			active = " active"
		}
		builder.WriteString(fmt.Sprintf("[%d]%s %s\n", tab.Index, active, strings.TrimSpace(tab.Title)))
		if strings.TrimSpace(tab.URL) != "" {
			builder.WriteString(fmt.Sprintf("    %s\n", tab.URL))
		}
	}
	return builder.String()
}

func browserUseMediaStateScript() string {
	return `(() => {
  const media = Array.from(document.querySelectorAll('video,audio'));
  if (media.length === 0) {
    return 'none';
  }
  return media.slice(0, 8).map((item, index) => {
    const tag = item.tagName.toLowerCase();
    const state = item.paused ? 'paused' : 'playing';
    const currentTime = Number.isFinite(item.currentTime) ? Math.round(item.currentTime) : 0;
    const duration = Number.isFinite(item.duration) ? Math.round(item.duration) : 0;
    return tag + '[' + (index + 1) + ']: ' + state + ', muted=' + item.muted + ', volume=' + item.volume + ', time=' + currentTime + 's/' + duration + 's';
  }).join('\n');
})()`
}

func browserUsePlayMediaScript() string {
	return `(() => {
  const media = Array.from(document.querySelectorAll('video,audio'));
  if (media.length === 0) {
    return 'No audio or video elements found on the current tab.';
  }

  const visibleMedia = media.filter((item) => {
    const rect = item.getBoundingClientRect();
    const style = window.getComputedStyle(item);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
  const candidates = visibleMedia.length ? visibleMedia : media;
  const reports = [];
  for (const item of candidates) {
    item.muted = false;
    item.volume = 1;
    try {
      const promise = item.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {});
      }
      reports.push(item.tagName.toLowerCase() + ': playing=' + (!item.paused) + ' muted=' + item.muted + ' volume=' + item.volume + ' currentTime=' + Math.round(item.currentTime || 0));
    } catch (error) {
      reports.push(item.tagName.toLowerCase() + ': play failed: ' + (error && error.message ? error.message : String(error)));
    }
  }
  return reports.join('\n');
})()`
}

func browserUseCurrentState(provider *BrowserUseTool) (string, error) {
	var title, rawURL, mediaState string
	var activeTargetID target.ID
	var tabs []*target.Info
	err := provider.runSession(func(session *browserUseSession) error {
		timeoutCtx, cancel := context.WithTimeout(session.ctx, browserUseDefaultTimeout)
		defer cancel()
		if runErr := chromedp.Run(timeoutCtx,
			chromedp.Title(&title),
			chromedp.Location(&rawURL),
			chromedp.Evaluate(browserUseMediaStateScript(), &mediaState),
		); runErr != nil {
			return runErr
		}

		var tabsErr error
		tabs, tabsErr = session.pageTargetsLocked()
		if tabsErr != nil {
			return tabsErr
		}
		activeTargetID = session.currentTargetIDLocked()
		return nil
	})
	if err != nil {
		return "", err
	}

	activeIndex := 0
	for index, tab := range tabs {
		if tab.TargetID == activeTargetID {
			activeIndex = index + 1
			break
		}
	}
	if strings.TrimSpace(mediaState) == "" {
		mediaState = "none"
	}

	var builder strings.Builder
	builder.WriteString("Current browser state:\n")
	if activeIndex > 0 {
		builder.WriteString(fmt.Sprintf("- Active tab: %d/%d\n", activeIndex, len(tabs)))
	} else {
		builder.WriteString(fmt.Sprintf("- Active tab: unknown/%d\n", len(tabs)))
	}
	builder.WriteString(fmt.Sprintf("- Title: %s\n", strings.TrimSpace(title)))
	builder.WriteString(fmt.Sprintf("- URL: %s\n", strings.TrimSpace(rawURL)))
	builder.WriteString("- Media:\n")
	for _, line := range strings.Split(strings.TrimSpace(mediaState), "\n") {
		builder.WriteString(fmt.Sprintf("  %s\n", strings.TrimSpace(line)))
	}
	return builder.String(), nil
}

func browserUseTextWithState(provider *BrowserUseTool, text string) *protocol.CallToolResult {
	state, err := browserUseCurrentState(provider)
	if err != nil {
		return browserToolText(fmt.Sprintf("%s\n\nCurrent browser state: unavailable: %s", text, err.Error()))
	}
	return browserToolText(fmt.Sprintf("%s\n\n%s", text, state))
}

func browserUseErrorWithState(provider *BrowserUseTool, text string) *protocol.CallToolResult {
	state, err := browserUseCurrentState(provider)
	if err != nil {
		return browserToolError(fmt.Sprintf("%s\n\nCurrent browser state: unavailable: %s", text, err.Error()))
	}
	return browserToolError(fmt.Sprintf("%s\n\n%s", text, state))
}

func browserUseSnapshotScript() string {
	return fmt.Sprintf(`(() => {
  const maxElements = %d;
  const isVisible = (el) => {
    if (el === document.documentElement || el === document.body) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (!style || style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const isInteractive = (el) => {
    const tag = el.tagName.toLowerCase();
    if (['a', 'button', 'input', 'textarea', 'select', 'summary', 'audio', 'video', 'label'].includes(tag)) {
      return true;
    }
    const role = el.getAttribute('role') || '';
    if (['button', 'link', 'menuitem', 'option', 'tab', 'checkbox', 'radio', 'switch'].includes(role)) {
      return true;
    }
    if (el.hasAttribute('onclick') || el.hasAttribute('contenteditable')) {
      return true;
    }
    if (el.tabIndex >= 0) {
      return true;
    }
    const style = window.getComputedStyle(el);
    return style && style.cursor === 'pointer';
  };
  const priorityOf = (el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select') {
      return 0;
    }
    const role = el.getAttribute('role') || '';
    if (role === 'button' || role === 'menuitem') {
      return 1;
    }
    if (tag === 'audio' || tag === 'video') {
      return 2;
    }
    return 3;
  };
  const textOf = (el) => {
    const parts = [
      el.innerText,
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.getAttribute('placeholder'),
      el.value
    ].filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 180);
  };
  const nodes = Array.from(document.querySelectorAll('*'))
    .filter(isVisible)
    .filter(isInteractive)
    .filter((el) => {
      const tag = el.tagName.toLowerCase();
      return textOf(el) || tag === 'input' || tag === 'textarea' || tag === 'audio' || tag === 'video';
    })
    .map((el, order) => ({el, order}))
    .sort((a, b) => priorityOf(a.el) - priorityOf(b.el) || a.order - b.order)
    .map((item) => item.el)
    .slice(0, maxElements);
  document.querySelectorAll('[data-openagent-browser-use-ref]').forEach((el) => {
    el.removeAttribute('data-openagent-browser-use-ref');
  });
  return nodes.map((el, index) => {
    const ref = String(index + 1);
    el.setAttribute('data-openagent-browser-use-ref', ref);
    const rect = el.getBoundingClientRect();
    return {
      index: index + 1,
      tag: el.tagName.toLowerCase(),
      text: textOf(el),
      ariaLabel: el.getAttribute('aria-label') || '',
      placeholder: el.getAttribute('placeholder') || '',
      value: el.value || '',
      options: el.tagName.toLowerCase() === 'select'
        ? Array.from(el.options).map((option) => (option.text || option.value || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 20)
        : [],
      href: (el.href || '').slice(0, 240),
      role: el.getAttribute('role') || '',
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });
})()`, browserUseMaxElements)
}

func browserUseVisibleTextScript() string {
	return `(() => {
  const text = (document.body && document.body.innerText) || '';
  return text.replace(/\s+/g, ' ').trim().slice(0, 4000);
})()`
}

func browserUseElementTagScript(selector string) string {
	return fmt.Sprintf(`(() => {
  const el = document.querySelector(%s);
  return el ? el.tagName.toLowerCase() : '';
})()`, browserUseJSONLiteral(selector))
}

func browserUseSelectOptionScript(selector, text string) string {
	return fmt.Sprintf(`(() => {
  const el = document.querySelector(%s);
  if (!el) {
    return 'select element not found';
  }
  if (el.tagName.toLowerCase() !== 'select') {
    return 'target is not a select element';
  }
  const expected = %s;
  const normalizedExpected = expected.trim().toLowerCase();
  const options = Array.from(el.options);
  const option = options.find((item) => item.value === expected || (item.text || '').trim() === expected) ||
    options.find((item) => item.value.toLowerCase() === normalizedExpected || (item.text || '').trim().toLowerCase() === normalizedExpected);
  if (!option) {
    return 'select option not found: ' + expected + '. Options: ' + options.map((item) => item.text || item.value).join(', ');
  }
  el.value = option.value;
  option.selected = true;
  el.dispatchEvent(new Event('input', {bubbles: true}));
  el.dispatchEvent(new Event('change', {bubbles: true}));
  return 'Selected option: ' + (option.text || option.value);
})()`, browserUseJSONLiteral(selector), browserUseJSONLiteral(text))
}

func browserUseSetTextValueScript(selector, text string, clear bool) string {
	return fmt.Sprintf(`(() => {
  const el = document.querySelector(%s);
  if (!el) {
    return 'element not found';
  }
  if (!%t) {
    return 'fallback';
  }
  const tag = el.tagName.toLowerCase();
  if (tag !== 'input' && tag !== 'textarea') {
    return 'fallback';
  }
  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(type)) {
      return 'fallback';
    }
  }
  const value = %s;
  const proto = tag === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  if (descriptor && descriptor.set) {
    descriptor.set.call(el, value);
  } else {
    el.value = value;
  }
  try {
    el.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText', data: value}));
  } catch (e) {
    el.dispatchEvent(new Event('input', {bubbles: true}));
  }
  el.dispatchEvent(new Event('change', {bubbles: true}));
  return 'set text value';
})()`, browserUseJSONLiteral(selector), clear, browserUseJSONLiteral(text))
}

func browserUseFormatSnapshot(rawURL, title, visibleText string, elements []browserUseElement) string {
	var builder strings.Builder
	builder.WriteString(fmt.Sprintf("URL: %s\nTitle: %s\n\n", rawURL, title))
	if strings.TrimSpace(visibleText) != "" {
		builder.WriteString("Visible text:\n")
		builder.WriteString(visibleText)
		builder.WriteString("\n\n")
	}
	builder.WriteString("Interactive elements:\n")
	if len(elements) == 0 {
		builder.WriteString("No visible interactive elements found.\n")
		return builder.String()
	}
	for _, element := range elements {
		label := strings.TrimSpace(element.Text)
		if label == "" {
			label = strings.TrimSpace(element.AriaLabel)
		}
		if label == "" {
			label = strings.TrimSpace(element.Placeholder)
		}
		if label == "" {
			label = strings.TrimSpace(element.Value)
		}
		line := fmt.Sprintf("[%d] <%s", element.Index, element.Tag)
		if element.Role != "" {
			line += fmt.Sprintf(` role=%q`, element.Role)
		}
		if element.Href != "" {
			line += fmt.Sprintf(` href=%q`, element.Href)
		}
		line += fmt.Sprintf("> %s", label)
		if len(element.Options) > 0 {
			line += fmt.Sprintf(" options=%q", element.Options)
		}
		line += fmt.Sprintf(" (x=%.0f y=%.0f w=%.0f h=%.0f)", element.X, element.Y, element.Width, element.Height)
		builder.WriteString(line)
		builder.WriteString("\n")
	}
	return builder.String()
}

func browserUseSnapshot(provider *BrowserUseTool) (string, error) {
	var elements []browserUseElement
	var title, rawURL, visibleText string
	err := provider.run(
		chromedp.Title(&title),
		chromedp.Location(&rawURL),
		chromedp.Evaluate(browserUseVisibleTextScript(), &visibleText),
		chromedp.Evaluate(browserUseSnapshotScript(), &elements),
	)
	if err != nil {
		return "", err
	}
	return browserUseFormatSnapshot(rawURL, title, visibleText, elements), nil
}

// ---------------------------------------------------------------------------
// browser_use_open
// ---------------------------------------------------------------------------

type browserUseOpenBuiltin struct{ provider *BrowserUseTool }

func (b *browserUseOpenBuiltin) GetName() string { return "browser_use_open" }

func (b *browserUseOpenBuiltin) GetDescription() string {
	return "Open or reuse the managed visible browser and navigate the active tab to a URL. Use this for real browser tasks only; do not claim a page was opened unless this tool succeeds. The browser keeps tabs, cookies, and media state across related user requests. This tool returns a fresh snapshot plus current browser state; use the returned element indexes only until the next page-changing action."
}

func (b *browserUseOpenBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"url": map[string]interface{}{
				"type":        "string",
				"description": "The URL to open in the visible browser.",
			},
		},
		"required": []string{"url"},
	}
}

func (b *browserUseOpenBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawURL, ok := arguments["url"].(string)
	if !ok || strings.TrimSpace(rawURL) == "" {
		return browserToolError("missing required parameter: url"), nil
	}
	rawURL = strings.TrimSpace(rawURL)

	if err := b.provider.run(chromedp.Navigate(rawURL), chromedp.WaitReady("body", chromedp.ByQuery)); err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use open failed for %s: %s", rawURL, err.Error())), nil
	}
	snapshot, err := browserUseSnapshot(b.provider)
	if err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use snapshot failed after opening %s: %s", rawURL, err.Error())), nil
	}
	return browserUseTextWithState(b.provider, snapshot), nil
}

// ---------------------------------------------------------------------------
// browser_use_snapshot
// ---------------------------------------------------------------------------

type browserUseSnapshotBuiltin struct{ provider *BrowserUseTool }

func (b *browserUseSnapshotBuiltin) GetName() string { return "browser_use_snapshot" }

func (b *browserUseSnapshotBuiltin) GetDescription() string {
	return "Read the active tab in the existing managed browser and return visible text, indexed interactive elements, URL, title, active tab index, tab count, and media state. Treat this as the source of truth before acting. Use it at the start of a follow-up request and after every navigation, click, type, or key press before reusing element indexes. Do not invent page contents or completed browser actions that are not visible in this tool result."
}

func (b *browserUseSnapshotBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties":           map[string]interface{}{},
	}
}

func (b *browserUseSnapshotBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	snapshot, err := browserUseSnapshot(b.provider)
	if err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use snapshot failed: %s", err.Error())), nil
	}
	return browserUseTextWithState(b.provider, snapshot), nil
}

// ---------------------------------------------------------------------------
// browser_use_click
// ---------------------------------------------------------------------------

type browserUseClickBuiltin struct{ provider *BrowserUseTool }

func (b *browserUseClickBuiltin) GetName() string { return "browser_use_click" }

func (b *browserUseClickBuiltin) GetDescription() string {
	return "Click an indexed element from the latest browser_use_snapshot, or a CSS selector when no index is available. The click may navigate, open a new tab, or change the DOM, so old indexes must be considered stale afterward. This tool reports the current browser state after the click; call browser_use_snapshot before the next indexed action."
}

func (b *browserUseClickBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"index": map[string]interface{}{
				"type":        "integer",
				"description": "Element index from the latest browser_use_snapshot.",
			},
			"selector": map[string]interface{}{
				"type":        "string",
				"description": "Optional CSS selector. Use only when an index is not available.",
			},
		},
	}
}

func (b *browserUseClickBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	selector, err := browserUseSelector(arguments)
	if err != nil {
		return browserToolError(err.Error()), nil
	}
	switchedTab := false
	err = b.provider.runSession(func(session *browserUseSession) error {
		var previousURL string
		beforeTargets, targetErr := session.pageTargetsLocked()
		if targetErr != nil {
			return targetErr
		}
		before := map[target.ID]bool{}
		for _, item := range beforeTargets {
			before[item.TargetID] = true
			if item.TargetID == session.currentTargetIDLocked() {
				previousURL = item.URL
			}
		}

		timeoutCtx, cancel := context.WithTimeout(session.ctx, browserUseDefaultTimeout)
		defer cancel()
		if runErr := chromedp.Run(timeoutCtx,
			chromedp.ScrollIntoView(selector, chromedp.ByQuery),
			chromedp.Click(selector, chromedp.ByQuery),
			chromedp.Sleep(800*time.Millisecond),
		); runErr != nil {
			return runErr
		}

		var switchErr error
		switchedTab, switchErr = session.switchToNewTargetLocked(before, previousURL)
		return switchErr
	})
	if err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use click failed for %s: %s", selector, err.Error())), nil
	}
	if switchedTab {
		return browserUseTextWithState(b.provider, "Clicked and switched to the new tab. Call browser_use_snapshot before the next indexed action."), nil
	}
	return browserUseTextWithState(b.provider, "Clicked. Call browser_use_snapshot before the next indexed action."), nil
}

// ---------------------------------------------------------------------------
// browser_use_type
// ---------------------------------------------------------------------------

type browserUseTypeBuiltin struct{ provider *BrowserUseTool }

func (b *browserUseTypeBuiltin) GetName() string { return "browser_use_type" }

func (b *browserUseTypeBuiltin) GetDescription() string {
	return "Type text into an indexed input-like element, select dropdown, or web code editor from the latest browser_use_snapshot, or a CSS selector when no index is available. For select elements, pass one of the option labels or values shown in the snapshot as text. Set clear=true to replace the focused field or editor content. This tool uses real focus, select-all, delete, and text insertion so it should be preferred over repeated key presses for multi-line text. Typing can open suggestions or change the DOM, so verify with browser_use_snapshot before relying on indexes or claiming the input was accepted."
}

func (b *browserUseTypeBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"index": map[string]interface{}{
				"type":        "integer",
				"description": "Element index from the latest browser_use_snapshot.",
			},
			"selector": map[string]interface{}{
				"type":        "string",
				"description": "Optional CSS selector. Use only when an index is not available.",
			},
			"text": map[string]interface{}{
				"type":        "string",
				"description": "Text to type.",
			},
			"clear": map[string]interface{}{
				"type":        "boolean",
				"description": "Whether to clear the current field value before typing.",
				"default":     true,
			},
		},
		"required": []string{"text"},
	}
}

func (b *browserUseTypeBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	selector, err := browserUseSelector(arguments)
	if err != nil {
		return browserToolError(err.Error()), nil
	}
	text, ok := arguments["text"].(string)
	if !ok {
		return browserToolError("missing required parameter: text"), nil
	}
	clear := true
	if value, ok := arguments["clear"].(bool); ok {
		clear = value
	}

	actions := []chromedp.Action{
		chromedp.ScrollIntoView(selector, chromedp.ByQuery),
		chromedp.Click(selector, chromedp.ByQuery),
		chromedp.Sleep(100 * time.Millisecond),
		chromedp.ActionFunc(func(ctx context.Context) error {
			var tag string
			if err := chromedp.Evaluate(browserUseElementTagScript(selector), &tag).Do(ctx); err != nil {
				return err
			}
			if tag == "select" {
				var result string
				if err := chromedp.Evaluate(browserUseSelectOptionScript(selector, text), &result).Do(ctx); err != nil {
					return err
				}
				if strings.HasPrefix(result, "select option not found") {
					return fmt.Errorf("%s", result)
				}
				return nil
			}
			var setValueResult string
			if err := chromedp.Evaluate(browserUseSetTextValueScript(selector, text, clear), &setValueResult).Do(ctx); err != nil {
				return err
			}
			if setValueResult != "fallback" {
				if strings.HasPrefix(setValueResult, "element not found") {
					return fmt.Errorf("%s", setValueResult)
				}
				return nil
			}
			if clear {
				if err := chromedp.KeyEvent("a", chromedp.KeyModifiers(browserUseSelectAllModifier())).Do(ctx); err != nil {
					return err
				}
				if err := chromedp.KeyEvent(kb.Backspace).Do(ctx); err != nil {
					return err
				}
			}
			return cdpinput.InsertText(text).Do(ctx)
		}),
		chromedp.Sleep(300 * time.Millisecond),
	}

	if err = b.provider.run(actions...); err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use type failed for %s: %s", selector, err.Error())), nil
	}
	return browserUseTextWithState(b.provider, "Typed. Call browser_use_snapshot before the next indexed action or before claiming the page accepted the input."), nil
}

// ---------------------------------------------------------------------------
// browser_use_press
// ---------------------------------------------------------------------------

type browserUsePressBuiltin struct{ provider *BrowserUseTool }

func (b *browserUsePressBuiltin) GetName() string { return "browser_use_press" }

func (b *browserUsePressBuiltin) GetDescription() string {
	return "Press a keyboard key in the visible browser, such as Enter, Tab, Escape, ArrowDown, or Space. A key press can submit a form, navigate, open a new tab, or change focus, so old indexes may be stale afterward. This tool reports the current browser state; call browser_use_snapshot before the next indexed action."
}

func (b *browserUsePressBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"key": map[string]interface{}{
				"type":        "string",
				"description": "Keyboard key to press, for example Enter, Tab, Escape, ArrowDown, or Space.",
			},
		},
		"required": []string{"key"},
	}
}

func (b *browserUsePressBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	key, ok := arguments["key"].(string)
	if !ok || strings.TrimSpace(key) == "" {
		return browserToolError("missing required parameter: key"), nil
	}
	key = browserUseKey(strings.TrimSpace(key))

	switchedTab := false
	err := b.provider.runSession(func(session *browserUseSession) error {
		var previousURL string
		beforeTargets, targetErr := session.pageTargetsLocked()
		if targetErr != nil {
			return targetErr
		}
		before := map[target.ID]bool{}
		for _, item := range beforeTargets {
			before[item.TargetID] = true
			if item.TargetID == session.currentTargetIDLocked() {
				previousURL = item.URL
			}
		}

		timeoutCtx, cancel := context.WithTimeout(session.ctx, browserUseDefaultTimeout)
		defer cancel()
		if runErr := chromedp.Run(timeoutCtx, chromedp.KeyEvent(key), chromedp.Sleep(800*time.Millisecond)); runErr != nil {
			return runErr
		}

		var switchErr error
		switchedTab, switchErr = session.switchToNewTargetLocked(before, previousURL)
		return switchErr
	})
	if err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use press failed for %s: %s", key, err.Error())), nil
	}
	if switchedTab {
		return browserUseTextWithState(b.provider, "Key pressed and switched to the new tab. Call browser_use_snapshot before the next indexed action."), nil
	}
	return browserUseTextWithState(b.provider, "Key pressed. Call browser_use_snapshot before the next indexed action."), nil
}

func browserUseKey(key string) string {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "enter", "return":
		return kb.Enter
	case "tab":
		return kb.Tab
	case "escape", "esc":
		return kb.Escape
	case "space", "spacebar":
		return " "
	case "backspace":
		return kb.Backspace
	case "delete", "del":
		return kb.Delete
	case "arrowup", "up":
		return kb.ArrowUp
	case "arrowdown", "down":
		return kb.ArrowDown
	case "arrowleft", "left":
		return kb.ArrowLeft
	case "arrowright", "right":
		return kb.ArrowRight
	case "home":
		return kb.Home
	case "end":
		return kb.End
	case "pageup":
		return kb.PageUp
	case "pagedown":
		return kb.PageDown
	default:
		return key
	}
}

// ---------------------------------------------------------------------------
// browser_use_play_media
// ---------------------------------------------------------------------------

type browserUsePlayMediaBuiltin struct{ provider *BrowserUseTool }

func (b *browserUsePlayMediaBuiltin) GetName() string { return "browser_use_play_media" }

func (b *browserUsePlayMediaBuiltin) GetDescription() string {
	return "Play and unmute visible audio or video elements on the current browser tab. Use this after opening a page with music or video if playback is paused, muted, or silent. The result includes media playback state; do not tell the user audio is playing unless the returned state says a media element is playing."
}

func (b *browserUsePlayMediaBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties":           map[string]interface{}{},
	}
}

func (b *browserUsePlayMediaBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	var result string
	err := b.provider.run(chromedp.Evaluate(browserUsePlayMediaScript(), &result))
	if err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use play media failed: %s", err.Error())), nil
	}
	return browserUseTextWithState(b.provider, result), nil
}

// ---------------------------------------------------------------------------
// browser_use_tabs
// ---------------------------------------------------------------------------

type browserUseTabsBuiltin struct{ provider *BrowserUseTool }

func (b *browserUseTabsBuiltin) GetName() string { return "browser_use_tabs" }

func (b *browserUseTabsBuiltin) GetDescription() string {
	return "List open browser tabs in the managed Browser Use window, including the active tab marker, titles, and URLs. Use this when a click opens a new tab, when the current page does not match what the user sees, or before switching tabs."
}

func (b *browserUseTabsBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties":           map[string]interface{}{},
	}
}

func (b *browserUseTabsBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	tabs, err := browserUseListTabs(b.provider)
	if err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use tabs failed: %s", err.Error())), nil
	}
	return browserUseTextWithState(b.provider, browserUseFormatTabs(tabs)), nil
}

// ---------------------------------------------------------------------------
// browser_use_switch_tab
// ---------------------------------------------------------------------------

type browserUseSwitchTabBuiltin struct{ provider *BrowserUseTool }

func (b *browserUseSwitchTabBuiltin) GetName() string { return "browser_use_switch_tab" }

func (b *browserUseSwitchTabBuiltin) GetDescription() string {
	return "Switch Browser Use to a tab returned by browser_use_tabs. The switch changes the active tab used by all Browser Use tools. This tool returns a fresh snapshot and browser state for the selected tab."
}

func (b *browserUseSwitchTabBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties": map[string]interface{}{
			"index": map[string]interface{}{
				"type":        "integer",
				"description": "Tab index returned by browser_use_tabs.",
			},
		},
		"required": []string{"index"},
	}
}

func (b *browserUseSwitchTabBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	rawIndex, ok := arguments["index"]
	if !ok {
		return browserToolError("missing required parameter: index"), nil
	}
	index, err := browserUsePositiveInt(rawIndex, "index")
	if err != nil {
		return browserToolError(err.Error()), nil
	}

	err = b.provider.runSession(func(session *browserUseSession) error {
		tabs, err := session.pageTargetsLocked()
		if err != nil {
			return err
		}
		if index > len(tabs) {
			return fmt.Errorf("tab index %d is out of range; there are %d tabs", index, len(tabs))
		}
		return session.switchToTargetLocked(tabs[index-1].TargetID)
	})
	if err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use switch tab failed: %s", err.Error())), nil
	}

	snapshot, err := browserUseSnapshot(b.provider)
	if err != nil {
		return browserUseErrorWithState(b.provider, fmt.Sprintf("browser use snapshot failed after switching tabs: %s", err.Error())), nil
	}
	return browserUseTextWithState(b.provider, snapshot), nil
}

// ---------------------------------------------------------------------------
// browser_use_close
// ---------------------------------------------------------------------------

type browserUseCloseBuiltin struct{ provider *BrowserUseTool }

func (b *browserUseCloseBuiltin) GetName() string { return "browser_use_close" }

func (b *browserUseCloseBuiltin) GetDescription() string {
	return "Close the visible browser session owned by Browser Use. Only use this when the user explicitly asks to close or stop the browser; do not use it between related follow-up tasks because the browser is intended to keep context. The profile directory remains on disk so cookies and local storage can be reused next time."
}

func (b *browserUseCloseBuiltin) GetInputSchema() interface{} {
	return map[string]interface{}{
		"type":                 "object",
		"additionalProperties": false,
		"properties":           map[string]interface{}{},
	}
}

func (b *browserUseCloseBuiltin) Execute(ctx context.Context, arguments map[string]interface{}) (*protocol.CallToolResult, error) {
	b.provider.close()
	return browserToolText("Browser Use session closed."), nil
}
