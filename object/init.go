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
	"os"
	"path/filepath"

	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/util"
)

func InitDb() {
	modelProviderName, embeddingProviderName, ttsProviderName, sttProviderName := initBuiltInProviders()
	initBuiltInStore(modelProviderName, embeddingProviderName, ttsProviderName, sttProviderName)
	initBuiltInTools()
	initBuiltInSite()
	InitUsers()
}

func initBuiltInStore(modelProviderName string, embeddingProviderName string, ttsProviderName string, sttProviderName string) {
	stores, err := GetGlobalStores()
	if err != nil {
		panic(err)
	}

	if len(stores) > 0 {
		return
	}

	imageProviderName := ""
	providerDbName := conf.GetConfigString("providerDbName")
	if providerDbName != "" {
		imageProviderName = "provider_storage_casibase_default"
	}

	store := &Store{
		Owner:                "admin",
		Name:                 "store-built-in",
		CreatedTime:          util.GetCurrentTime(),
		DisplayName:          "Built-in Store",
		Title:                "AI Assistant",
		Avatar:               "https://cdn.casibase.com/static/favicon.png",
		StorageProvider:      "provider-storage-built-in",
		StorageSubpath:       "store-built-in",
		ImageProvider:        imageProviderName,
		SplitProvider:        "Default",
		ModelProvider:        modelProviderName,
		EmbeddingProvider:    embeddingProviderName,
		AgentProvider:        "",
		TextToSpeechProvider: ttsProviderName,
		SpeechToTextProvider: sttProviderName,
		Frequency:            10000,
		MemoryLimit:          10,
		LimitMinutes:         15,
		Welcome:              "Hello",
		WelcomeTitle:         "Hello, this is the OpenAgent AI Assistant",
		WelcomeText:          "I'm here to help answer your questions",
		Prompt:               "You are an expert in your field and you specialize in using your knowledge to answer or solve people's problems.",
		ExampleQuestions:     []ExampleQuestion{},
		KnowledgeCount:       5,
		SuggestionCount:      3,
		ChildStores:          []string{},
		ChildModelProviders:  []string{},
		Tools:                []string{},
		IsDefault:            true,
		State:                "Active",
		EnableExtraOptions:   conf.GetConfigBool("showGithubCorner"),
		PropertiesMap:        map[string]*Properties{},
	}

	if providerDbName != "" {
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
	providerDbName := conf.GetConfigString("providerDbName")
	if providerDbName != "" {
		dbName := conf.GetConfigString("dbName")
		return fmt.Sprintf("C:/casibase_data/%s", dbName), nil
	}

	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	res := filepath.Join(cwd, "files")
	return res, nil
}

func initBuiltInProviders() (string, string, string, string) {
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
		}
		_, err = AddProvider(storageProvider)
		if err != nil && !isUniqueConstraintError(err) {
			panic(err)
		}
	}

	if modelProvider == nil {
		modelProvider = &Provider{
			Owner:       "admin",
			Name:        "dummy-model-provider",
			CreatedTime: util.GetCurrentTime(),
			DisplayName: "Dummy Model Provider",
			Category:    "Model",
			Type:        "Dummy",
			SubType:     "Dummy",
			IsDefault:   true,
		}
		_, err = AddProvider(modelProvider)
		if err != nil && !isUniqueConstraintError(err) {
			panic(err)
		}
	}

	if embeddingProvider == nil {
		embeddingProvider = &Provider{
			Owner:       "admin",
			Name:        "dummy-embedding-provider",
			CreatedTime: util.GetCurrentTime(),
			DisplayName: "Dummy Embedding Provider",
			Category:    "Embedding",
			Type:        "Dummy",
			SubType:     "Dummy",
			IsDefault:   true,
		}
		_, err = AddProvider(embeddingProvider)
		if err != nil && !isUniqueConstraintError(err) {
			panic(err)
		}
	}

	ttsProviderName := "Browser Built-In"
	if ttsProvider != nil {
		ttsProviderName = ttsProvider.Name
	}

	sttProviderName := "Browser Built-In"

	return modelProvider.Name, embeddingProvider.Name, ttsProviderName, sttProviderName
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
			TestContent: `{"tool":"web_fetch","arguments":{"url":"https://example.com"}}`,
			State:       "Active",
			PromptExamples: []string{
				"Fetch and summarize the content of https://casibase.org.",
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
			State:       "Active",
			PromptExamples: []string{
				"Get the title and duration of this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
				"Download a YouTube video to /tmp/videos in the best available quality.",
				"Extract the audio from a video and save it as an MP3 file.",
				"Download a video and tell me its resolution and file size.",
			},
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

	// Navbar leaves enabled by default: all groups except Cloud (/cloud/*) and Multimedia (/multimedia/*).
	// Keys must match ManagementPage.getMenuItems admin-branch child keys (filterMenuItems).
	builtInNavItems := []string{
		"/chat",
		"/stores", "/chats", "/messages",
		"/files", "/vectors", "/resources",
		"/providers", "/tools",
		"/records", "/sessions",
		"/users", "/casdoor-resources", "/permissions",
		"/sites", "/usages", "/activities", "/sysinfo", "/swagger",
	}

	site := &Site{
		Owner:       "admin",
		Name:        "site-built-in",
		CreatedTime: util.GetCurrentTime(),
		DisplayName: "Built-in Site",
		ThemeColor:  "#262626",
		HtmlTitle:   "",
		FaviconUrl:  "https://cdn.casibase.com/img/casibase.png",
		LogoUrl:     "https://cdn.casibase.org/img/casibase-logo_1200x256.png",
		FooterHtml:  "",
		NavItems:    builtInNavItems,
	}

	_, err = AddSite(site)
	if err != nil {
		panic(err)
	}
}
