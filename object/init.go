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

package object

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/embedsupport"
	"github.com/the-open-agent/openagent/util"
)

func InitDb() {
	// Load the built-in site first so that site.ParentDbName overrides
	// app.conf before any other initialization reads conf or uses providerAdapter.
	initBuiltInSite()
	if site, err := GetBuiltInSiteWithSecret(); err == nil && site != nil {
		SyncSiteToConf(site)
		RefreshProviderAdapter()
	}
	modelProviderName, embeddingProviderName, ttsProviderName, sttProviderName, imageProviderName := initBuiltInProviders()
	initBuiltInStore(modelProviderName, embeddingProviderName, ttsProviderName, sttProviderName, imageProviderName)
	initSkillsFromFolder()
	initBuiltInTools()
	initBuiltInServers()
	InitUsers()
	go printStartupStats()
}

func newBrowserUseCloudServer() *Server {
	return &Server{
		Owner:       "admin",
		Name:        "browser_use_cloud",
		CreatedTime: util.GetCurrentTime(),
		DisplayName: "Browser Use Cloud",
		Url:         "https://api.browser-use.com/v3/mcp",
		Transport:   "streamablehttp",
		Env: map[string]string{
			"x-browser-use-api-key": "",
		},
		TestContent: `{"tool":"list_sessions","arguments":{}}`,
		IsDefault:   false,
	}
}

func initBuiltInServers() {
	server := newBrowserUseCloudServer()
	existing, err := getServer(server.Owner, server.Name)
	if err != nil {
		panic(err)
	}
	if existing != nil {
		return
	}
	if _, err = AddServer(server); err != nil {
		panic(err)
	}
}

func printStartupStats() {
	providers, err := GetGlobalProviders()
	if err == nil {
		var modelNames, storageNames []string
		for _, p := range providers {
			switch p.Category {
			case "Model":
				modelNames = append(modelNames, p.Name)
			case "Storage":
				storageNames = append(storageNames, p.Name)
			}
		}
		fmt.Printf("AI models: %d: %s\n", len(modelNames), joinNames(modelNames))
		fmt.Printf("storage providers: %d: %s\n", len(storageNames), joinNames(storageNames))
	}

	tools, err := GetGlobalTools()
	if err == nil {
		var names []string
		for _, t := range tools {
			names = append(names, t.Name)
		}
		fmt.Printf("tools: %d: %s\n", len(names), joinNames(names))
	}

	servers, err := GetServers("")
	if err == nil {
		var names []string
		for _, s := range servers {
			names = append(names, s.Name)
		}
		fmt.Printf("MCP servers: %d: %s\n", len(names), joinNames(names))
	}
}

func joinNames(names []string) string {
	if len(names) == 0 {
		return "(none)"
	}
	return strings.Join(names, ", ")
}

func initBuiltInStore(modelProviderName string, embeddingProviderName string, ttsProviderName string, sttProviderName string, imageProviderName string) {
	stores, err := GetGlobalStores()
	if err != nil {
		panic(err)
	}

	if len(stores) > 0 {
		return
	}

	store := &Store{
		Owner:                "admin",
		Name:                 "store-built-in",
		CreatedTime:          util.GetCurrentTime(),
		DisplayName:          "Built-in Store",
		Title:                "AI Assistant",
		Avatar:               "https://cdn.openagentai.org/img/openagent.png",
		StorageProvider:      "provider-storage-built-in",
		StorageSubpath:       "store-built-in",
		ImageProvider:        imageProviderName,
		SplitProvider:        "Default",
		ModelProvider:        modelProviderName,
		EmbeddingProvider:    embeddingProviderName,
		McpServer:            "",
		TextToSpeechProvider: ttsProviderName,
		SpeechToTextProvider: sttProviderName,
		Frequency:            10000,
		MemoryLimit:          10,
		LimitMinutes:         15,
		Welcome:              "Hello",
		WelcomeTitle:         "Hello, this is the OpenAgent AI Assistant",
		WelcomeText:          "I'm here to help answer your questions",
		FigureEnabled:        true,
		FigureUrl:            "https://cdn.openagentai.org/img/openagent-figure.png",
		FigureMode:           "Expanded",
		Prompt:               "You are an expert in your field and you specialize in using your knowledge to answer or solve people's problems.",
		ExampleQuestions:     []ExampleQuestion{},
		KnowledgeCount:       5,
		SuggestionCount:      3,
		ChildStores:          []string{},
		ChildModelProviders:  []string{},
		Skills:               []string{"All"},
		Tools:                []string{"All"},
		IsDefault:            true,
		State:                "Active",
		EnableExtraOptions:   false,
		PropertiesMap:        map[string]*Properties{},
	}

	if conf.GetConfigString("parentDbName") != "" {
		store.ShowAutoRead = true
		store.DisableFileUpload = true

		tokens := conf.ReadGlobalConfigTokens()
		if len(tokens) > 0 {
			store.Title = tokens[0]
			store.Avatar = tokens[1]
			store.Welcome = tokens[2]
			store.WelcomeTitle = tokens[3]
			store.WelcomeText = tokens[4]
			store.Prompt = tokens[5]
		}
	}

	_, err = AddStore(store)
	if err != nil {
		panic(err)
	}
}

func getDefaultStoragePath() (string, error) {
	parentDbName := conf.GetConfigString("parentDbName")
	if parentDbName != "" {
		dbName := conf.GetConfigString("dbName")
		return fmt.Sprintf("C:/openagent_data/%s", dbName), nil
	}

	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	res := filepath.Join(cwd, "files")
	return res, nil
}

func getDefaultImageStoragePath() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	return filepath.Join(cwd, "images"), nil
}

func initBuiltInProviders() (string, string, string, string, string) {
	storageProvider, err := GetDefaultStorageProvider()
	if err != nil {
		panic(err)
	}

	modelProvider, err := GetDefaultModelProvider()
	if err != nil {
		panic(err)
	}

	embeddingProvider, err := GetDefaultEmbeddingProvider()
	if err != nil {
		panic(err)
	}

	ttsProvider, err := GetDefaultTextToSpeechProvider()
	if err != nil {
		panic(err)
	}

	if storageProvider == nil {
		var path string
		path, err = getDefaultStoragePath()
		if err != nil {
			panic(err)
		}

		util.EnsureFileFolderExists(path)

		storageProvider = &Provider{
			Owner:       "admin",
			Name:        "provider-storage-built-in",
			CreatedTime: util.GetCurrentTime(),
			DisplayName: "Built-in Storage Provider",
			Category:    "Storage",
			Type:        "Local File System",
			ClientId:    path,
			IsDefault:   true,
			State:       "Active",
		}
		_, err = AddProvider(storageProvider)
		if err != nil && !isUniqueConstraintError(err) {
			panic(err)
		}
	}

	imageProviderName := ""
	parentDbName := conf.GetConfigString("parentDbName")
	if parentDbName != "" {
		imageProviderName = "provider_storage_casibase_default"
	} else {
		imageProvider, err := getProvider("admin", "provider-image-built-in")
		if err != nil {
			panic(err)
		}
		if imageProvider == nil {
			var imagePath string
			imagePath, err = getDefaultImageStoragePath()
			if err != nil {
				panic(err)
			}

			util.EnsureFileFolderExists(imagePath)

			imageProvider = &Provider{
				Owner:       "admin",
				Name:        "provider-image-built-in",
				CreatedTime: util.GetCurrentTime(),
				DisplayName: "Built-in Image Storage Provider",
				Category:    "Storage",
				Type:        "Local File System",
				ClientId:    imagePath,
				State:       "Inactive",
			}
			_, err = AddProvider(imageProvider)
			if err != nil && !isUniqueConstraintError(err) {
				panic(err)
			}
		}
		imageProviderName = "provider-image-built-in"
	}

	ttsProviderName := "Browser Built-In"
	if ttsProvider != nil {
		ttsProviderName = ttsProvider.Name
	}

	sttProviderName := "Browser Built-In"

	modelProviderName := ""
	if modelProvider != nil {
		modelProviderName = modelProvider.Name
	}
	embeddingProviderName := ""
	if embeddingProvider != nil {
		embeddingProviderName = embeddingProvider.Name
	}
	return modelProviderName, embeddingProviderName, ttsProviderName, sttProviderName, imageProviderName
}

// initSkillsFromFolder scans the skills/ directory and auto-loads any skill
// subfolder that is not yet in the database. It searches for the skills/
// directory in the following order:
//  1. Next to the running executable (production layout)
//  2. Current working directory (development: go run .)
//
// Errors are logged but never fatal so a malformed skill folder cannot prevent
// the server from starting.
func initSkillsFromFolder() {
	skillsDir := findSkillsDir()
	if skillsDir == "" {
		// No on-disk skills directory — try the embedded one.
		if fsys := embedsupport.SkillsFS(); fsys != nil {
			loadSkillsFromFS(fsys)
		}
		return
	}

	entries, err := os.ReadDir(skillsDir)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Printf("skills: cannot read %s: %v\n", skillsDir, err)
		}
		return
	}

	now := util.GetCurrentTime()
	var skills []*Skill
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		dir := filepath.Join(skillsDir, entry.Name())
		skill, err := LoadSkill(dir)
		if err != nil {
			fmt.Printf("skills: skipping %s: %v\n", dir, err)
			continue
		}
		if skill.Owner == "" {
			skill.Owner = "admin"
		}
		skill.CreatedTime = now
		skills = append(skills, skill)
	}

	syncBuiltinSkills(skills, "admin", skillsDir)
}

// findSkillsDir returns the first existing skills/ directory found next to the
// executable or in the current working directory. Returns "" if neither exists.
func findSkillsDir() string {
	// 1. Next to the executable (production)
	if exePath, err := os.Executable(); err == nil {
		candidate := filepath.Join(filepath.Dir(exePath), "skills")
		if _, err2 := os.Stat(candidate); err2 == nil {
			return candidate
		}
	}

	// 2. Current working directory (development: go run .)
	if cwd, err := os.Getwd(); err == nil {
		candidate := filepath.Join(cwd, "skills")
		if _, err2 := os.Stat(candidate); err2 == nil {
			return candidate
		}
	}

	return ""
}

// loadSkillsFromFS loads skills from an fs.FS (typically the embedded skills
// filesystem). Each top-level directory in fsys is treated as a skill folder
// containing SKILL.md and an optional references/ subdirectory.
func loadSkillsFromFS(fsys fs.FS) {
	entries, err := fs.ReadDir(fsys, ".")
	if err != nil {
		fmt.Printf("skills(embedded): cannot list skills: %v\n", err)
		return
	}

	now := util.GetCurrentTime()
	var skills []*Skill
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		skillFS, err := fs.Sub(fsys, entry.Name())
		if err != nil {
			fmt.Printf("skills(embedded): cannot sub %s: %v\n", entry.Name(), err)
			continue
		}

		skill, err := loadSkillFromFS(skillFS, entry.Name())
		if err != nil {
			fmt.Printf("skills(embedded): skipping %s: %v\n", entry.Name(), err)
			continue
		}

		if skill.Owner == "" {
			skill.Owner = "admin"
		}
		skill.CreatedTime = now
		skills = append(skills, skill)
	}

	syncBuiltinSkills(skills, "admin", "(embedded)")
}

// syncBuiltinSkills replaces all built-in skills for owner with skills in one
// delete + batch-insert round-trip. source is used only for log messages.
func syncBuiltinSkills(skills []*Skill, owner, source string) {
	if len(skills) == 0 {
		return
	}

	names := make([]string, len(skills))
	for i, s := range skills {
		names[i] = s.Name
	}

	// Delete by name so old records with type='custom' are also cleaned up.
	if _, err := adapter.engine.Where("owner = ?", owner).In("name", names).Delete(&Skill{}); err != nil {
		fmt.Printf("skills: failed to delete existing skills: %v\n", err)
		return
	}

	affected, err := addSkills(skills)
	if err != nil {
		fmt.Printf("skills: failed to batch-insert skills: %v\n", err)
		return
	}

	fmt.Printf("skills: %d loaded from %s: %s\n", affected, source, strings.Join(names, ", "))
}

// loadSkillFromFS reads a skill from an fs.FS rooted at the skill's directory.
// dirName is used as the fallback skill name when SKILL.md has no name field.
func loadSkillFromFS(skillFS fs.FS, dirName string) (*Skill, error) {
	rawBytes, err := fs.ReadFile(skillFS, "SKILL.md")
	if err != nil {
		return nil, fmt.Errorf("cannot read SKILL.md in %s: %w", dirName, err)
	}
	raw := string(rawBytes)

	name, description, homepage, metadata, emoji, content := parseSkillMd(raw)
	if name == "" {
		name = dirName
	}

	var refs []SkillReference
	if refEntries, err2 := fs.ReadDir(skillFS, "references"); err2 == nil {
		for _, e := range refEntries {
			if e.IsDir() {
				continue
			}
			refBytes, err3 := fs.ReadFile(skillFS, "references/"+e.Name())
			if err3 != nil {
				continue
			}
			refs = append(refs, SkillReference{
				Name:    e.Name(),
				Content: string(refBytes),
			})
		}
	}

	return &Skill{
		Name:        name,
		DisplayName: name,
		Type:        "built-in",
		Description: description,
		Homepage:    homepage,
		Emoji:       emoji,
		Metadata:    metadata,
		Content:     content,
		SkillMd:     raw,
		References:  refs,
		State:       "Active",
	}, nil
}

func initBuiltInTools() {
	builtInTools := []*Tool{
		{
			Owner:       "admin",
			Name:        "time",
			Type:        "time",
			SubType:     "Default",
			TestContent: `{"tool":"time","arguments":{"operation":"current"}}`,
			State:       "Active",
			PromptExamples: []string{
				"What is the current date and time?",
				"What time is it right now in Tokyo?",
				"How many days are left until the end of the year?",
				"Convert Unix timestamp 1700000000 to a human-readable date.",
			},
		},
		{
			Owner:       "admin",
			Name:        "web_search",
			Type:        "web_search",
			SubType:     "DuckDuckGo",
			EnableProxy: true,
			TestContent: `{"tool":"web_search","arguments":{"query":"hello world"}}`,
			State:       "Active",
			PromptExamples: []string{
				"Search for the latest news about artificial intelligence.",
				"Find the best restaurants in New York City.",
				"What are the top programming languages in 2025?",
				"Search for tutorials on how to use OpenAgent.",
			},
		},
		{
			Owner:       "admin",
			Name:        "shell",
			Type:        "shell",
			SubType:     "Default",
			TestContent: `{"tool":"shell","arguments":{"command":"echo hello"}}`,
			State:       "Active",
			PromptExamples: []string{
				"List all files in the current directory.",
				"Check the available disk space on the system.",
				"Find all Python files in the project recursively.",
				"Show the running processes sorted by CPU usage.",
			},
		},
		{
			Owner:       "admin",
			Name:        "local_file",
			Type:        "local_file",
			SubType:     "Default",
			TestContent: `{"tool":"local_special_dirs","arguments":{}}`,
			State:       "Active",
			PromptExamples: []string{
				"Find my Desktop folder and list supported documents with previews.",
				"Read /Users/alice/Desktop/report.pdf and summarize its contents.",
				"Write a project summary to /home/alice/Desktop/Project Summaries/summary.md.",
				"Move confirmed files into project folders after I approve the plan.",
			},
		},
		{
			Owner:       "admin",
			Name:        "office",
			Type:        "office",
			SubType:     "Default",
			TestContent: `{"tool":"word_read","arguments":{"path":"test.docx"}}`,
			State:       "Active",
			PromptExamples: []string{
				"Read the content of a Word document at /path/to/report.docx.",
				"Create an Excel spreadsheet with sales data for Q1 2025.",
				"What slides are in my PowerPoint presentation?",
				"Write a meeting summary to a new Word file.",
			},
		},
		{
			Owner:       "admin",
			Name:        "web_fetch",
			Type:        "web_fetch",
			SubType:     "Default",
			EnableProxy: true,
			TestContent: `{"tool":"web_fetch","arguments":{"url":"https://example.com"}}`,
			State:       "Active",
			PromptExamples: []string{
				"Fetch and summarize the content of https://openagentai.org.",
				"Get the main text from https://en.wikipedia.org/wiki/Go_(programming_language).",
				"Retrieve the JSON response from a REST API endpoint.",
				"Download and read the release notes from a GitHub page.",
			},
		},
		{
			Owner:       "admin",
			Name:        "web_browser",
			Type:        "web_browser",
			SubType:     "Default",
			TestContent: `{"tool":"web_browser","arguments":{"url":"https://example.com"}}`,
			State:       "Active",
			PromptExamples: []string{
				"Open GitHub and find the trending repositories today.",
				"Navigate to a website and take a screenshot.",
				"Fill in the search box on a website and submit the form.",
				"Log into a website and retrieve my account information.",
			},
		},
		{
			Owner:       "admin",
			Name:        "gui",
			Type:        "gui",
			SubType:     "Windows UIA",
			TestContent: `{"tool":"win_open_application","arguments":{"target":"calc","method":"auto","wait_seconds":2}}`,
			State:       "Active",
			PromptExamples: []string{
				"Open the Calculator application and compute 123 * 456.",
				"Take a screenshot of the current desktop.",
				"Read the current CPU and memory usage from the system.",
				"Open Notepad and type a short message, then save the file.",
			},
		},
		{
			Owner:       "admin",
			Name:        "video_download",
			Type:        "video_download",
			SubType:     "Default",
			TestContent: `{"tool":"video_info","arguments":{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}`,
			PromptExamples: []string{
				"Get the title and duration of this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
				"Download a YouTube video to the videos folder in the best available quality.",
				"Extract the audio from a video and save it as an MP3 file.",
				"Download a video and tell me its resolution and file size.",
			},
			State: "Active",
		},
		{
			Owner:       "admin",
			Name:        "browser_use",
			Type:        "browser_use",
			SubType:     "Default",
			TestContent: `{"tool":"browser_use_open","arguments":{"url":"https://www.openagentai.org"}}`,
			State:       "Active",
			PromptExamples: []string{
				"Play a Michael Jackson song on YouTube.",
				"Create a paste with \"Hello from OpenAgent\" and give me the link.",
				"Start a 45-minute Pomofocus session for my Work task.",
				"Generate a QR code for https://www.openagentai.org.",
			},
		},
	}

	for _, t := range builtInTools {
		existing, err := getTool(t.Owner, t.Name)
		if err != nil {
			panic(err)
		}
		if existing != nil {
			if len(existing.PromptExamples) == 0 && len(t.PromptExamples) > 0 {
				existing.PromptExamples = t.PromptExamples
				_, err = UpdateTool(existing.GetId(), existing)
				if err != nil {
					panic(err)
				}
			}
			continue
		}
		t.CreatedTime = util.GetCurrentTime()
		_, err = AddTool(t)
		if err != nil {
			panic(err)
		}
	}
}

func initBuiltInSite() {
	sites, err := GetGlobalSites()
	if err != nil {
		panic(err)
	}

	if len(sites) > 0 {
		return
	}

	// Navbar leaves enabled by default: all groups except Multimedia (/multimedia/*).
	// Keys must match ManagementPage.getMenuItems admin-branch child keys (filterMenuItems).
	builtInNavItems := []string{
		"/quick-setup", "/hub",
		"/chat",
		"/stores", "/chats", "/messages",
		"/files", "/vectors",
		"/providers", "/pipes", "/skills", "/tools", "/servers",
		"/records", "/sessions", "/snapshots",
		"/sites", "/resources", "/usages", "/visitors", "/sysinfo", "/swagger",
	}

	site := &Site{
		Owner:         "admin",
		Name:          "site-built-in",
		CreatedTime:   util.GetCurrentTime(),
		DisplayName:   "Built-in Site",
		ThemeColor:    "#404040",
		HtmlTitle:     "OpenAgent",
		FaviconUrl:    "https://cdn.openagentai.org/img/openagent.png",
		LogoUrl:       "https://cdn.openagentai.org/img/openagent-logo_1900x450.png",
		NavbarHtml:    "",
		FooterHtml:    `<a target="_blank" href="https://github.com/the-open-agent/openagent" rel="noreferrer"><img style="padding-bottom: 3px;" height="30" alt="OpenAgent" src="https://cdn.openagentai.org/img/openagent-logo_1900x450.png" /></a>`,
		StaticBaseUrl: "https://cdn.openagentai.org",
		NavItems:      builtInNavItems,

		CasdoorEndpoint:     conf.GetConfigString("casdoorEndpoint"),
		ClientId:            conf.GetConfigString("clientId"),
		ClientSecret:        conf.GetConfigString("clientSecret"),
		CasdoorOrganization: conf.GetConfigString("casdoorOrganization"),
		CasdoorApplication:  conf.GetConfigString("casdoorApplication"),
		IpParsingMode:       conf.GetConfigString("ipParsingMode"),
		ParentDbName:        conf.GetConfigString("parentDbName"),
		Socks5Proxy:         conf.GetConfigString("socks5Proxy"),
		LogConfig:           conf.GetConfigString("logConfig"),
	}

	_, err = AddSite(site)
	if err != nil {
		panic(err)
	}
}
