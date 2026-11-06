// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
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

package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/beego/beego/context"
	"github.com/the-open-agent/openagent/carrier"
	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/embedding"
	"github.com/the-open-agent/openagent/guardrail"
	"github.com/the-open-agent/openagent/i18n"
	"github.com/the-open-agent/openagent/mcp"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
	"github.com/the-open-agent/openagent/video"
)

// GetMessageAnswer
// @Title GetMessageAnswer
// @Tag Message API
// @Description get message answer
// @Param id query string true "The id of message"
// @Success 200 {stream} string "An event stream of message answers in JSON format"
// @router /get-message-answer [get]
func (c *ApiController) GetMessageAnswer() {
	id := c.Input().Get("id")
	_, signedIn := c.CheckSignedIn()

	message, err := object.GetMessage(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if message != nil {
		ok := c.requireUserDataAccess(message.User, message.Store)
		if !ok {
			return
		}
	}

	c.Ctx.ResponseWriter.Header().Set("Content-Type", "text/event-stream")
	c.Ctx.ResponseWriter.Header().Set("Cache-Control", "no-cache")
	c.Ctx.ResponseWriter.Header().Set("Connection", "keep-alive")

	// Any user can point a chat at any store, so tools that run commands or touch the local
	// machine are only enabled for the global admin, never for store admins or signed-in users.
	job := messageAnswerJobs.getOrStart(id, c.Ctx.Request.Host, c.GetAcceptLanguage(), signedIn, c.IsGlobalAdmin())
	streamMessageAnswerJob(c.Ctx.ResponseWriter, c.Ctx.Request, job)
}

// CancelMessageAnswer
// @Title CancelMessageAnswer
// @Tag Message API
// @Description cancel a running message answer job
// @Param id query string true "The id of message"
// @Success 200 {object} controllers.Response The Response object
// @router /cancel-message-answer [post]
func (c *ApiController) CancelMessageAnswer() {
	id := c.Input().Get("id")

	message, err := object.GetMessage(id)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	if message == nil {
		c.ResponseError(fmt.Sprintf("The message: %s is not found", id))
		return
	}
	ok := c.requireUserDataAccess(message.User, message.Store)
	if !ok {
		return
	}

	messageAnswerJobs.cancel(id)
	c.ResponseOk()
}

func (c *ApiController) generateMessageAnswer(id string, responseWriter http.ResponseWriter, host string) {
	_, signedIn := c.CheckSignedIn()
	generateMessageAnswer(id, responseWriter, host, c.GetAcceptLanguage(), signedIn, c.IsGlobalAdmin(), c.ResponseError)
}

func streamMessageAnswerJob(responseWriter http.ResponseWriter, request *http.Request, job *messageAnswerJob) {
	replay, ch, unsubscribe, done := job.subscribe()
	defer unsubscribe()

	for _, chunk := range replay {
		if _, err := responseWriter.Write(chunk); err != nil {
			return
		}
		if flusher, ok := responseWriter.(http.Flusher); ok {
			flusher.Flush()
		}
	}

	if done {
		return
	}

	var notify <-chan struct{}
	if request != nil {
		notify = request.Context().Done()
	}

	for {
		select {
		case chunk, ok := <-ch:
			if !ok {
				return
			}
			if _, err := responseWriter.Write(chunk); err != nil {
				return
			}
			if flusher, ok := responseWriter.(http.Flusher); ok {
				flusher.Flush()
			}
		case <-notify:
			return
		}
	}
}

func generateMessageAnswer(id string, responseWriter http.ResponseWriter, host string, lang string, signedIn bool, allowHighRiskTools bool, responseError func(string, ...interface{})) {
	responseErrorStream := func(message *object.Message, errorText string) {
		if err := writeMessageErrorStream(responseWriter, lang, message, errorText); err != nil {
			if responseError != nil {
				responseError(err.Error())
			}
		}
	}

	emitStatus := func(statusText string) {
		_ = writeStatusStream(responseWriter, statusText)
	}

	message, err := object.GetMessage(id)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	if message == nil {
		responseErrorStream(message, fmt.Sprintf("The message: %s is not found", id))
		return
	}

	if message.Author != "AI" {
		responseErrorStream(message, fmt.Sprintf("The message is invalid, message author should be \"AI\", but got \"%s\"", message.Author))
		return
	}
	if message.ReplyTo == "" {
		responseErrorStream(message, "The message is invalid, message replyTo should not be empty")
		return
	}
	if message.Text != "" {
		responseErrorStream(message, fmt.Sprintf("The message is invalid, message text should be empty, but got \"%s\"", message.Text))
		return
	}

	if strings.HasPrefix(message.ErrorText, "error, status code: 400, message: The response was filtered due to the prompt triggering") {
		responseErrorStream(message, message.ErrorText)
		return
	}

	chatId := util.GetIdFromOwnerAndName(message.Owner, message.Chat)
	chat, err := object.GetChat(chatId)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	//if chat == nil || chat.Organization != message.Organization {
	//	c.ResponseErrorStream(message, fmt.Sprintf("The chat: %s is not found", chatId))
	//	return
	//}

	store, err := object.ResolveStoreForChat(chat)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}
	if store == nil {
		if chat.Tool != "" || chat.ModelProvider != "" {
			store = &object.Store{
				Owner:          "admin",
				ModelProvider:  chat.ModelProvider,
				KnowledgeCount: 10,
			}
		} else {
			responseErrorStream(message, fmt.Sprintf(i18n.Translate(lang, "account:The store: %s is not found"), chat.Store))
			return
		}
	}

	// the agent's own prompt, before tools, skills and experience are appended to it
	agentPrompt := store.Prompt

	if chat.Tool != "" {
		store.Tools = []string{chat.Tool}
	}

	if !allowHighRiskTools && len(store.Tools) > 0 {
		store.Tools, err = object.FilterOutHighRiskTools(store.Owner, store.Tools)
		if err != nil {
			responseErrorStream(message, err.Error())
			return
		}
	}

	if len(store.Tools) > 0 {
		store.Prompt += "\nYou are a helpful AI assistant with access to tools. When the user asks you to perform a task, you MUST use the available tools to complete it directly. Do not refuse or explain why you cannot — just use the tools and fulfill the request."
		store.Prompt += "\n## Execution Bias\n" +
			"- Actionable request: act in this turn.\n" +
			"- Continue until done or genuinely blocked; do not finish with a plan/promise when tools can move it forward.\n" +
			"- Task completion: keep calling tools until the task is accomplished; do not describe next steps — execute them.\n" +
			"- Weak/empty tool result: vary query, path, or source before concluding.\n" +
			"- Final answer needs evidence: cite all sources with their title and URL. When web_search returns results, " +
			"reference all relevant entries by their title and url in your answer in APA format, the whole line is a markdown link, so the user can verify.\n" +
			"- Mutable facts need live checks: use tools rather than memory.\n" +
			"- Longer work: brief progress update, then keep going."
	}

	if len(store.Skills) > 0 {
		skillsContent, skillErr := object.GetSkillsCatalog(store.Owner, store.Skills)
		if skillErr != nil {
			responseErrorStream(message, skillErr.Error())
			return
		}
		if skillsContent != "" {
			store.Prompt += "\n\n" + skillsContent
		}
	}

	question := store.Welcome
	var questionMessage *object.Message
	if message.ReplyTo != "Welcome" {
		questionMessage, err = object.GetMessage(util.GetId("admin", message.ReplyTo))
		if err != nil {
			responseErrorStream(message, err.Error())
			return
		}
		if questionMessage == nil {
			responseErrorStream(message, fmt.Sprintf("The message: %s is not found", id))
			return
		}
		// Only answer a question from the same chat, never another user's message.
		if questionMessage.Owner != message.Owner || questionMessage.Chat != message.Chat {
			responseErrorStream(message, fmt.Sprintf("The message: %s is not found", id))
			return
		}

		question = questionMessage.Text
	}

	if question == "" {
		responseErrorStream(message, fmt.Sprintf("The question should not be empty"))
		return
	}

	if !signedIn {
		var count int
		count, err = object.GetNearMessageCount(message.User, store.LimitMinutes)
		if err != nil {
			responseErrorStream(message, err.Error())
			return
		}
		if count > store.Frequency {
			responseErrorStream(message, "You have queried too many times, please wait for a while")
			return
		}
	}

	g := object.GetGuardrail()
	if g != nil && questionMessage != nil {
		emitStatus(fmt.Sprintf("%s安全检查中", g.Name))
		previousReply, err := object.GetPreviousAnswerText(chat.Name, questionMessage.CreatedTime)
		if err != nil {
			responseErrorStream(message, err.Error())
			return
		}
		if verdict := g.CheckInput(question, object.GetGuardrailAgentName(store), previousReply, lang); verdict.IsBlocked() {
			fmt.Printf("guardrail: blocked question %s: %s (%s, %s)\n", questionMessage.Name, verdict.Category, verdict.Source, verdict.Reason)
			message.Text = guardrail.GetRefusal(g.Name, "input", verdict)
			message.Guardrail = object.GetGuardrailTag("input", verdict)
			message.ErrorText = ""
			finishMessageAnswer(responseWriter, message, chat, responseErrorStream)
			return
		}
	}

	emitStatus(i18n.Translate(lang, "chat:Preparing"))

	modelProviderName := store.ModelProvider
	if chat.ModelProvider != "" {
		modelProviderName = chat.ModelProvider
	}

	modelProvider, err := object.GetProviderFromName(store.Owner, modelProviderName, lang)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	if video.IsVideoModel(modelProvider.Type, modelProvider.SubType) {
		videoProvider, err := modelProvider.GetVideoProvider(lang)
		if err != nil {
			responseErrorStream(message, err.Error())
			return
		}
		if err = handleVideoMessageAnswer(responseWriter, message, chat, modelProvider, videoProvider, questionMessage, question, host, lang); err != nil {
			if errors.Is(err, errMessageAnswerCanceled) {
				return
			}
			responseErrorStream(message, err.Error())
		}
		return
	}

	if err = object.ValidateModelProvider(modelProvider, lang); err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	modelProviderObj, err := modelProvider.GetModelProvider(lang)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	// Perform dry run to validate user has sufficient balance before expensive operations
	err = validateTransactionBeforeAIGeneration(message, chat, store, question, modelProvider, modelProviderObj, lang, responseErrorStream)
	if err != nil {
		return
	}

	embeddingProvider, embeddingProviderObj, err := object.GetEmbeddingProviderFromContext(store.Owner, store.EmbeddingProvider, lang)
	if err != nil {
		if err2 := writeInfoStream(responseWriter, i18n.Translate(lang, "message_answer:No embedding model configured, answering without knowledge base")); err2 != nil {
			responseErrorStream(message, err2.Error())
			return
		}
		embeddingProvider = nil
		embeddingProviderObj = nil
	}

	mcpToolSet, err := object.GetServerMcpToolSet(store.Owner, store.McpServer, lang)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	webSearchEnabled := false
	if questionMessage != nil {
		webSearchEnabled = questionMessage.WebSearchEnabled
	}
	origin := getOriginFromHost(host)
	mcpToolSet = object.MergeMcpTools(mcpToolSet, store, webSearchEnabled, message.User, origin, lang)

	var knowledge []*model.RawMessage
	var vectorScores []object.VectorScore
	embeddingResult := &embedding.EmbeddingResult{}

	if chat.Tool == "" && store.KnowledgeCount != 0 && embeddingProviderObj != nil {
		emitStatus(i18n.Translate(lang, "chat:Searching knowledge base"))
		knowledge, vectorScores, embeddingResult, err = object.GetNearestKnowledge(store.Name, store.VectorStores, store.SearchProvider, embeddingProvider, embeddingProviderObj, modelProvider, store.Owner, question, store.KnowledgeCount, lang)
		if err != nil && err.Error() != "no knowledge vectors found" {
			err = fmt.Errorf(i18n.Translate(lang, "message_answer:object.GetNearestKnowledge() error, %s"), err.Error())
			responseErrorStream(message, err.Error())
			return
		}
		if embeddingResult == nil {
			embeddingResult = &embedding.EmbeddingResult{}
		}
		if g != nil {
			knowledge = g.FilterKnowledge(knowledge)
		}
	}

	if chat.Tool == "" && store.KnowledgeCount != 0 {
		imageCatalog, imageErr := object.GetImageKnowledgeCatalog(store)
		if imageErr != nil {
			fmt.Printf("image knowledge catalog: %s\n", imageErr.Error())
		} else if imageCatalog != "" {
			store.Prompt += "\n\n" + imageCatalog
		}
	}

	// The experience library holds human corrections of this agent's earlier answers.
	// It is appended to the prompt (like the skills catalog) rather than mixed into the
	// knowledge list, so it can outrank the knowledge it contradicts.
	var experienceNames []string
	if store.EnableExperienceLibrary {
		emitStatus(i18n.Translate(lang, "chat:Searching experience library"))
		experienceContent, names, expErr := object.GetExperienceCatalog(store, question, embeddingProvider, embeddingProviderObj, lang)
		if expErr != nil {
			fmt.Printf("experience library: %s\n", expErr.Error())
		} else if experienceContent != "" {
			store.Prompt += "\n\n" + experienceContent
			experienceNames = names
		}
	}

	writer := &RefinedWriter{context.Response{ResponseWriter: responseWriter}, *NewCleaner(6), []byte{}, []byte{}, []byte{}, []byte{}, []byte{}}

	if questionMessage != nil {
		questionMessage.TokenCount = embeddingResult.TokenCount
		questionMessage.Price = embeddingResult.Price
		questionMessage.Currency = embeddingResult.Currency
		if embeddingResult.Data != nil {
			questionMessage.Data = embeddingResult.Data
		}

		_, err = object.UpdateMessage(questionMessage.GetId(), questionMessage, false)
		if err != nil {
			responseErrorStream(message, err.Error())
			return
		}
	}

	history, err := object.GetRecentRawMessages(chat.Name, message.CreatedTime, store.MemoryLimit)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	printAgentSessionStart(store, modelProviderName, mcpToolSet, history)

	fmt.Printf("Question: [%s]\n", question)
	fmt.Printf("Knowledge: [\n")
	for i, k := range knowledge {
		fmt.Printf("Knowledge %d: [%s]\n", i, k.Text)
	}
	fmt.Printf("]\n")
	// fmt.Printf("Refined Question: [%s]\n", realQuestion)
	fmt.Printf("Answer: [")

	prompt := store.Prompt
	reviewQuestion := question
	if !isReasonModel(modelProvider.SubType) {
		if modelProvider.Type == "Alibaba Cloud" && webSearchEnabled {
			prompt, err = getPromptWithCarrier(prompt, store.SuggestionCount, chat.NeedTitle)
		} else {
			question, err = getQuestionWithCarriers(question, store.SuggestionCount, chat.NeedTitle)
		}
		if err != nil {
			responseErrorStream(message, err.Error())
			return
		}
	}

	modelProviderDisplayName := modelProvider.DisplayName
	if modelProviderDisplayName == "" {
		modelProviderDisplayName = modelProviderName
	}
	emitStatus(fmt.Sprintf(i18n.Translate(lang, "chat:Generating answer with %s"), modelProviderDisplayName))

	queryModel := func(question string, prompt string) (*model.ModelResult, error) {
		if mcpToolSet != nil {
			messages := &model.ToolMessages{
				Messages:  []*model.RawMessage{},
				ToolCalls: nil,
			}
			toolSession := &model.ToolSession{
				McpToolSet:   mcpToolSet,
				ToolMessages: messages,
				IsVision:     model.IsVisionModel(modelProvider.SubType),
				SessionID:    chat.Name,
			}
			return model.QueryTextWithTools(modelProviderObj, question, writer, history, prompt, knowledge, toolSession, lang)
		}
		if isReasonModel(modelProvider.SubType) {
			return QueryCarrierText(question, writer, history, prompt, knowledge, modelProviderObj, chat.NeedTitle, store.SuggestionCount, lang)
		}
		return modelProviderObj.QueryText(question, writer, history, prompt, knowledge, nil, lang)
	}

	modelResult, err := queryModel(question, prompt)
	if err != nil && strings.Contains(err.Error(), "DataInspectionFailed") && (question != reviewQuestion || prompt != store.Prompt) && writer.MessageString() == "" && writer.ReasonString() == "" {
		question, prompt = reviewQuestion, store.Prompt
		modelResult, err = queryModel(question, prompt)
	}
	for retry := 1; retry <= 2 && err != nil && isModelOverloaded(err) && writer.MessageString() == "" && writer.ReasonString() == "" && writer.ToolString() == ""; retry++ {
		time.Sleep(time.Duration(retry*3) * time.Second)
		modelResult, err = queryModel(question, prompt)
	}
	if err != nil {
		if errors.Is(err, errMessageAnswerCanceled) {
			return
		}
		if strings.Contains(err.Error(), "write tcp") {
			if responseError != nil {
				responseError(err.Error())
			}
			return
		}
		responseErrorStream(message, err.Error())
		return
	}

	if len(vectorScores) > 0 {
		bytes, err := json.Marshal(vectorScores)
		if err == nil {
			_, _ = responseWriter.Write([]byte(fmt.Sprintf("event: vector\ndata: %s\n\n", string(bytes))))
		}
	}

	fmt.Printf("]\n")

	answer := writer.MessageString()
	defer func() {
		event := fmt.Sprintf("event: end\ndata: %s\n\n", "end")
		if _, writeErr := responseWriter.Write([]byte(event)); writeErr != nil {
			fmt.Printf("write end SSE event failed: %s\n", writeErr.Error())
		}
		if flusher, ok := responseWriter.(http.Flusher); ok {
			flusher.Flush()
		}
	}()
	message.ReasonText = writer.ReasonString()
	message.ToolCalls = model.GetToolCallsFromWriter(writer.ToolString())
	searchString := writer.SearchString()
	if searchString != "" {
		var searchResults []model.SearchResult
		err := json.Unmarshal([]byte(searchString), &searchResults)
		if err == nil {
			message.SearchResults = searchResults
		}
	}

	message.TokenCount = modelResult.TotalTokenCount
	message.Price = modelResult.TotalPrice
	message.Currency = modelResult.Currency

	textAnswer := answer
	textSuggestions := []object.Suggestion{}
	textTitle := ""
	textAnswer, textSuggestions, textTitle, err = parseAnswerWithCarriers(answer, store.SuggestionCount, chat.NeedTitle)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	message.Text = textAnswer
	if message.Text != "" {
		message.ErrorText = ""
		message.IsAlerted = false
	}
	message.Suggestions = textSuggestions

	if g != nil && questionMessage != nil {
		emitStatus(fmt.Sprintf("%s审核回答中", g.Name))
		if verdict := g.CheckOutput(reviewQuestion, message.Text, agentPrompt, object.GetGuardrailAgentName(store), lang); verdict.IsBlocked() {
			fmt.Printf("guardrail: withdrew answer %s: %s (%s, %s)\n", message.Name, verdict.Category, verdict.Source, verdict.Reason)
			message.Text = guardrail.GetRefusal(g.Name, "output", verdict)
			message.ReasonText = ""
			message.Suggestions = []object.Suggestion{}
			message.Guardrail = object.GetGuardrailTag("output", verdict)
		} else {
			var kinds, reasonKinds []string
			message.Text, kinds = guardrail.MaskSensitive(message.Text)
			message.ReasonText, reasonKinds = guardrail.MaskSensitive(message.ReasonText)
			if len(kinds) == 0 {
				kinds = reasonKinds
			}
			if len(kinds) > 0 {
				message.Guardrail = "masked:" + strings.Join(kinds, ",")
			}
		}
		if message.Guardrail != "" {
			if err = writeGuardrailStream(responseWriter, message); err != nil {
				responseErrorStream(message, err.Error())
				return
			}
		}
	}

	tryStoreRemoteImage(message, host, lang)

	message.VectorScores = vectorScores

	// Normalize price precision before persisting or creating transactions
	message.Price = model.AddPrices(message.Price, 0)

	// Add transaction for message with price
	err = object.AddTransactionForMessage(message)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	_, err = object.UpdateMessage(message.GetId(), message, false)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	chat.TokenCount += message.TokenCount
	chat.Price += message.Price
	if chat.Currency == "" {
		chat.Currency = message.Currency
	}

	// Update chat's ModelProvider if not set
	if chat.ModelProvider == "" {
		chat.ModelProvider = modelProvider.Name
	}

	emitChatUpdate := false
	if chat.NeedTitle {
		userTextForTitle := question
		if firstUserText, firstErr := object.GetFirstUserMessageText(chat.Name); firstErr == nil && strings.TrimSpace(firstUserText) != "" {
			userTextForTitle = firstUserText
		}
		resolvedTitle := carrier.ResolveChatTitle(textTitle, userTextForTitle)
		if resolvedTitle != "" {
			chat.DisplayName = resolvedTitle
			chat.NeedTitle = false
			emitChatUpdate = true
		}
	}

	if questionMessage != nil {
		if chat.Currency == questionMessage.Currency {
			chat.TokenCount += questionMessage.TokenCount
			chat.Price += questionMessage.Price
		}
	}

	chat.IsGenerating = false
	_, err = object.UpdateChat(chat.GetId(), chat)
	if err != nil {
		responseErrorStream(message, err.Error())
		return
	}

	if emitChatUpdate {
		if err := writeChatUpdateStream(responseWriter, chat); err != nil {
			responseErrorStream(message, err.Error())
			return
		}
	}

	object.IncreaseExperienceHitCounts(store.Owner, experienceNames)

	object.StartExperienceReview(object.ExperienceReviewRequest{
		Store:             store,
		Chat:              chat,
		Question:          reviewQuestion,
		Answer:            message.Text,
		ToolCalls:         message.ToolCalls,
		ReasonSummary:     message.ReasonText,
		ModelProviderName: modelProvider.GetId(),
		Lang:              lang,
	})
}

// GetAnswer
// @Title GetAnswer
// @Tag Message API
// @Description get answer
// @Param provider query string true "The provider"
// @Param question query string true "The question of message"
// @Param framework query string true "The framework"
// @Param video query string true "The video"
// @Success 200 {string} string "answer message"
// @router /get-answer [get]
func (c *ApiController) GetAnswer() {
	userName, ok := c.RequireSignedIn()
	if !ok {
		return
	}

	provider := c.Input().Get("provider")
	question := c.Input().Get("question")
	framework := c.Input().Get("framework")
	video := c.Input().Get("video")
	tool := c.Input().Get("tool")

	if tool != "" {
		if !c.RequireAdmin() {
			return
		}
		t, err := object.GetTool(util.GetIdFromOwnerAndName("admin", tool))
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
		if !c.requireHighRiskToolPermission(t) {
			return
		}
	}

	if question == "" {
		c.ResponseError(fmt.Sprintf("The question should not be empty"))
		return
	}

	category := "Custom"
	chatName := fmt.Sprintf("chat_%s", util.GetRandomName())
	if framework != "" {
		if video == "" {
			category = "FrameworkTest"
			chatName = framework
		} else {
			category = "FrameworkVideoRun"
			chatName = fmt.Sprintf("%s - %s", video, framework)
		}
	}

	chat, err := object.GetChat(util.GetId("admin", chatName))
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	// The chat name comes from the request, so it may name another user's chat.
	if chat != nil && !c.requireUserDataAccess(chat.User, chat.Store) {
		return
	}
	if chat == nil {
		casdoorOrganization := conf.GetConfigString("casdoorOrganization")
		currentTime := util.GetCurrentTime()
		chat = &object.Chat{
			Owner:         "admin",
			Name:          chatName,
			CreatedTime:   currentTime,
			UpdatedTime:   currentTime,
			Organization:  casdoorOrganization,
			DisplayName:   chatName,
			Store:         "",
			ModelProvider: provider,
			Category:      category,
			User:          userName,
			ClientIp:      c.getClientIp(),
			UserAgent:     c.getUserAgent(),
			MessageCount:  0,
			IsHidden:      strings.HasPrefix(chatName, "pipe_"),
		}

		chat.ClientIpDesc = util.GetDescFromIP(chat.ClientIp)
		chat.UserAgentDesc = util.GetDescFromUserAgent(chat.UserAgent)

		_, err = object.AddChat(chat)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
	}

	var answer string
	var modelResult *model.ModelResult
	if tool != "" {
		origin := getOriginFromHost(c.Ctx.Request.Host)
		answer, modelResult, err = object.GetAnswerWithTool(provider, tool, question, userName, origin, c.GetAcceptLanguage())
	} else {
		answer, modelResult, err = object.GetAnswer(provider, question, c.GetAcceptLanguage())
	}
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	questionMessage := &object.Message{
		Owner:        "admin",
		Name:         fmt.Sprintf("message_%s", util.GetRandomName()),
		CreatedTime:  util.GetCurrentTimeEx(chat.CreatedTime),
		Organization: chat.Organization,
		Store:        chat.Store,
		User:         userName,
		Chat:         chat.Name,
		ReplyTo:      "",
		Author:       userName,
		Text:         question,
	}

	questionMessage.Currency = modelResult.Currency

	_, err = object.AddMessage(questionMessage)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	answerMessage := &object.Message{
		Owner:         "admin",
		Name:          fmt.Sprintf("message_%s", util.GetRandomName()),
		CreatedTime:   util.GetCurrentTimeEx(chat.CreatedTime),
		Organization:  chat.Organization,
		Store:         chat.Store,
		User:          userName,
		Chat:          chat.Name,
		ReplyTo:       questionMessage.Name,
		Author:        "AI",
		Text:          answer,
		ModelProvider: provider,
	}

	answerMessage.TokenCount = modelResult.TotalTokenCount
	answerMessage.Price = modelResult.TotalPrice
	answerMessage.Currency = modelResult.Currency

	_, err = object.AddMessage(answerMessage)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	tryStoreRemoteImage(answerMessage, c.Ctx.Request.Host, c.GetAcceptLanguage())
	answer = answerMessage.Text

	chat.TokenCount += answerMessage.TokenCount
	chat.Price += answerMessage.Price
	if chat.Currency == "" {
		chat.Currency = answerMessage.Currency
	}

	chat.UpdatedTime = util.GetCurrentTime()
	chat.MessageCount += 2

	_, err = object.UpdateChat(chat.GetId(), chat)
	if err != nil {
		c.ResponseOk(err.Error())
		return
	}

	c.ResponseOk(answer)
}

// finishMessageAnswer saves an answer that was decided without asking the
// model, sends it to the page and ends the stream.
func finishMessageAnswer(responseWriter http.ResponseWriter, message *object.Message, chat *object.Chat, responseErrorStream func(*object.Message, string)) {
	if _, err := object.UpdateMessage(message.GetId(), message, false); err != nil {
		responseErrorStream(message, err.Error())
		return
	}
	chat.IsGenerating = false
	if _, err := object.UpdateChat(chat.GetId(), chat); err != nil {
		responseErrorStream(message, err.Error())
		return
	}
	if err := writeGuardrailStream(responseWriter, message); err != nil {
		responseErrorStream(message, err.Error())
		return
	}
	_, _ = responseWriter.Write([]byte("event: end\ndata: end\n\n"))
	if flusher, ok := responseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func printAgentSessionStart(store *object.Store, modelProviderName string, mcpToolSet *mcp.ToolSet, history []*model.RawMessage) {
	fmt.Printf("\n=== Agent Session Start ===\n")
	fmt.Printf("Store: [%s] | Model Provider: [%s] | MCP Server: [%s]\n", store.Name, modelProviderName, store.McpServer)
	fmt.Printf("Skills: %v\n", store.Skills)
	fmt.Printf("Tools: %v\n", store.Tools)
	if mcpToolSet != nil {
		fmt.Printf("MCP Connections: [%d server(s)]\n", len(mcpToolSet.Connections))
		for serverName := range mcpToolSet.Connections {
			fmt.Printf("  - MCP Server: [%s]\n", serverName)
		}
		fmt.Printf("Available Tools: [%d total]\n", len(mcpToolSet.Tools))
		for _, t := range mcpToolSet.Tools {
			fmt.Printf("  - [%s]: %s\n", t.Name, t.Description)
		}
		if mcpToolSet.WebSearchEnabled {
			fmt.Printf("  - [web_search] (builtin)\n")
		}
	} else {
		fmt.Printf("Available Tools: [None]\n")
	}
	fmt.Printf("History: [%d messages] | Memory Limit: [%d] | Knowledge Count: [%d]\n", len(history), store.MemoryLimit, store.KnowledgeCount)
	fmt.Printf("===========================\n\n")
}
