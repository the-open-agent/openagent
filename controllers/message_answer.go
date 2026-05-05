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
	"fmt"
	"strings"

	"github.com/the-open-agent/openagent/conf"
	"github.com/the-open-agent/openagent/embedding"
	"github.com/the-open-agent/openagent/model"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
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

	c.Ctx.ResponseWriter.Header().Set("Content-Type", "text/event-stream")
	c.Ctx.ResponseWriter.Header().Set("Cache-Control", "no-cache")
	c.Ctx.ResponseWriter.Header().Set("Connection", "keep-alive")

	message, err := object.GetMessage(id)
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
		return
	}

	if message == nil {
		c.ResponseErrorStream(message, fmt.Sprintf("The message: %s is not found", id))
		return
	}

	if message.Author != "AI" {
		c.ResponseErrorStream(message, fmt.Sprintf("The message is invalid, message author should be \"AI\", but got \"%s\"", message.Author))
		return
	}
	if message.ReplyTo == "" {
		c.ResponseErrorStream(message, "The message is invalid, message replyTo should not be empty")
		return
	}
	if message.Text != "" {
		c.ResponseErrorStream(message, fmt.Sprintf("The message is invalid, message text should be empty, but got \"%s\"", message.Text))
		return
	}

	if strings.HasPrefix(message.ErrorText, "error, status code: 400, message: The response was filtered due to the prompt triggering") {
		c.ResponseErrorStream(message, message.ErrorText)
		return
	}

	chatId := util.GetIdFromOwnerAndName(message.Owner, message.Chat)
	chat, err := object.GetChat(chatId)
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
		return
	}

	//if chat == nil || chat.Organization != message.Organization {
	//	c.ResponseErrorStream(message, fmt.Sprintf("The chat: %s is not found", chatId))
	//	return
	//}

	if chat.Type != "AI" {
		c.ResponseErrorStream(message, "The chat type must be \"AI\"")
		return
	}

	store, err := object.ResolveStoreForChat(chat)
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
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
			c.ResponseErrorStream(message, fmt.Sprintf(c.T("account:The store: %s is not found"), chat.Store))
			return
		}
	}

	if chat.Tool != "" {
		store.Tools = []string{chat.Tool}
	}

	if len(store.Tools) > 0 {
		store.Prompt += "\nYou are a helpful AI assistant with access to tools. When the user asks you to perform a task, you MUST use the available tools to complete it directly. Do not refuse or explain why you cannot — just use the tools and fulfill the request."
		store.Prompt += "\n## Execution Bias\n" +
			"- Actionable request: act in this turn.\n" +
			"- Continue until done or genuinely blocked; do not finish with a plan/promise when tools can move it forward.\n" +
			"- Weak/empty tool result: vary query, path, or source before concluding.\n" +
			"- Final answer needs evidence: cite all sources with their title and URL. When web_search returns results, " +
			"reference all relevant entries by their title and url in your answer in APA format, the whole line is a markdown link, so the user can verify.\n" +
			"- Mutable facts need live checks: use tools rather than memory.\n" +
			"- Longer work: brief progress update, then keep going."
	}

	if len(store.Skills) > 0 {
		skillsContent, skillErr := object.GetSkillsContent(store.Owner, store.Skills)
		if skillErr != nil {
			c.ResponseErrorStream(message, skillErr.Error())
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
			c.ResponseErrorStream(message, err.Error())
			return
		}
		if questionMessage == nil {
			c.ResponseErrorStream(message, fmt.Sprintf("The message: %s is not found", id))
			return
		}

		question = questionMessage.Text

		question, err = refineQuestionTextViaParsingUrlContent(question, c.GetAcceptLanguage())
		if err != nil {
			c.ResponseErrorStream(message, err.Error())
			return
		}
	}

	if question == "" {
		c.ResponseErrorStream(message, fmt.Sprintf("The question should not be empty"))
		return
	}

	_, ok := c.CheckSignedIn()
	if !ok {
		var count int
		count, err = object.GetNearMessageCount(message.User, store.LimitMinutes)
		if err != nil {
			c.ResponseErrorStream(message, err.Error())
			return
		}
		if count > store.Frequency {
			c.ResponseErrorStream(message, "You have queried too many times, please wait for a while")
			return
		}
	}

	modelProviderName := store.ModelProvider
	if chat.ModelProvider != "" {
		modelProviderName = chat.ModelProvider
	}

	modelProvider, modelProviderObj, err := object.GetModelProviderFromContext(store.Owner, modelProviderName, c.GetAcceptLanguage())
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
		return
	}

	// Perform dry run to validate user has sufficient balance before expensive operations
	err = validateTransactionBeforeAIGeneration(message, chat, store, question, modelProvider, modelProviderObj, c.GetAcceptLanguage(), c.ResponseErrorStream)
	if err != nil {
		return
	}

	embeddingProvider, embeddingProviderObj, err := object.GetEmbeddingProviderFromContext(store.Owner, chat.User2, c.GetAcceptLanguage())
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
		return
	}

	mcpToolSet, err := object.GetServerMcpToolSet(store.Owner, store.McpServer, c.GetAcceptLanguage())
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
		return
	}

	webSearchEnabled := false
	if questionMessage != nil {
		webSearchEnabled = questionMessage.WebSearchEnabled
	}
	mcpToolSet = object.MergeMcpTools(mcpToolSet, store, webSearchEnabled, c.GetAcceptLanguage())

	var knowledge []*model.RawMessage
	var vectorScores []object.VectorScore
	embeddingResult := &embedding.EmbeddingResult{}

	if chat.Tool == "" && store.KnowledgeCount != 0 {
		knowledge, vectorScores, embeddingResult, err = object.GetNearestKnowledge(store.Name, store.VectorStores, store.SearchProvider, embeddingProvider, embeddingProviderObj, modelProvider, store.Owner, question, store.KnowledgeCount, c.GetAcceptLanguage())
		if err != nil && err.Error() != "no knowledge vectors found" {
			err = fmt.Errorf(c.T("message_answer:object.GetNearestKnowledge() error, %s"), err.Error())
			c.ResponseErrorStream(message, err.Error())
			return
		}
		if embeddingResult == nil {
			embeddingResult = &embedding.EmbeddingResult{}
		}
	}

	writer := &RefinedWriter{*c.Ctx.ResponseWriter, *NewCleaner(6), []byte{}, []byte{}, []byte{}, []byte{}, []byte{}}

	if questionMessage != nil {
		questionMessage.TokenCount = embeddingResult.TokenCount
		questionMessage.Price = embeddingResult.Price
		questionMessage.Currency = embeddingResult.Currency

		_, err = object.UpdateMessage(questionMessage.GetId(), questionMessage, false)
		if err != nil {
			c.ResponseErrorStream(message, err.Error())
			return
		}
	}

	history, err := object.GetRecentRawMessages(chat.Name, message.CreatedTime, store.MemoryLimit)
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
		return
	}

	fmt.Printf("Question: [%s]\n", question)
	fmt.Printf("Knowledge: [\n")
	for i, k := range knowledge {
		fmt.Printf("Knowledge %d: [%s]\n", i, k.Text)
	}
	fmt.Printf("]\n")
	// fmt.Printf("Refined Question: [%s]\n", realQuestion)
	fmt.Printf("Answer: [")

	prompt := store.Prompt
	if modelProvider.Type != "Dummy" && !isReasonModel(modelProvider.SubType) {
		if modelProvider.Type == "Alibaba Cloud" && webSearchEnabled {
			prompt, err = getPromptWithCarrier(prompt, store.SuggestionCount, chat.NeedTitle)
		} else {
			question, err = getQuestionWithCarriers(question, store.SuggestionCount, chat.NeedTitle)
		}
		if err != nil {
			c.ResponseErrorStream(message, err.Error())
			return
		}
	}

	var modelResult *model.ModelResult
	if mcpToolSet != nil {
		messages := &model.ToolMessages{
			Messages:  []*model.RawMessage{},
			ToolCalls: nil,
		}
		toolSession := &model.ToolSession{
			McpToolSet:   mcpToolSet,
			ToolMessages: messages,
		}
		modelResult, err = model.QueryTextWithTools(modelProviderObj, question, writer, history, prompt, knowledge, toolSession, c.GetAcceptLanguage())
	} else {
		if isReasonModel(modelProvider.SubType) {
			modelResult, err = QueryCarrierText(question, writer, history, prompt, knowledge, modelProviderObj, chat.NeedTitle, store.SuggestionCount, c.GetAcceptLanguage())
		} else {
			modelResult, err = modelProviderObj.QueryText(question, writer, history, prompt, knowledge, nil, c.GetAcceptLanguage())
		}
	}
	if err != nil {
		if strings.Contains(err.Error(), "write tcp") {
			c.ResponseError(err.Error())
			return
		}
		c.ResponseErrorStream(message, err.Error())
		return
	}

	if len(vectorScores) > 0 {
		bytes, err := json.Marshal(vectorScores)
		if err == nil {
			_, _ = c.Ctx.ResponseWriter.Write([]byte(fmt.Sprintf("event: vector\ndata: %s\n\n", string(bytes))))
		}
	}

	if writer.writerCleaner.cleaned == false {
		cleanedData := writer.writerCleaner.GetCleanedData()
		writer.buf = append(writer.buf, []byte(cleanedData)...)
		jsonData, err := ConvertMessageDataToJSON(cleanedData)
		if err != nil {
			c.ResponseErrorStream(message, err.Error())
			return
		}

		_, err = writer.ResponseWriter.Write([]byte(fmt.Sprintf("event: message\ndata: %s\n\n", jsonData)))
		if err != nil {
			c.ResponseErrorStream(message, err.Error())
			return
		}

		writer.Flush()
		fmt.Print(cleanedData)
	}

	fmt.Printf("]\n")

	event := fmt.Sprintf("event: end\ndata: %s\n\n", "end")
	_, err = c.Ctx.ResponseWriter.Write([]byte(event))
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
		return
	}

	answer := writer.MessageString()
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
		c.ResponseErrorStream(message, err.Error())
		return
	}

	message.Text = textAnswer
	if message.Text != "" {
		message.ErrorText = ""
		message.IsAlerted = false
	}

	tryStoreRemoteImage(message, c.Ctx.Request.Host, c.GetAcceptLanguage())

	message.Suggestions = textSuggestions

	message.VectorScores = vectorScores

	// Normalize price precision before persisting or creating transactions
	message.Price = model.AddPrices(message.Price, 0)

	// Add transaction for message with price
	err = object.AddTransactionForMessage(message)
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
		return
	}

	_, err = object.UpdateMessage(message.GetId(), message, false)
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
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

	if chat.NeedTitle && textTitle != "" {
		chat.DisplayName = textTitle
		chat.NeedTitle = false
	}

	if questionMessage != nil {
		if chat.Currency == questionMessage.Currency {
			chat.TokenCount += questionMessage.TokenCount
			chat.Price += questionMessage.Price
		}
	}

	_, err = object.UpdateChat(chat.GetId(), chat)
	if err != nil {
		c.ResponseErrorStream(message, err.Error())
		return
	}
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

	var answer string
	var modelResult *model.ModelResult
	var err error
	if tool != "" {
		answer, modelResult, err = object.GetAnswerWithTool(provider, tool, question, c.GetAcceptLanguage())
	} else {
		answer, modelResult, err = object.GetAnswer(provider, question, c.GetAcceptLanguage())
	}
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	chat, err := object.GetChat(util.GetId("admin", chatName))
	if err != nil {
		c.ResponseError(err.Error())
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
			Type:          "AI",
			User:          userName,
			User1:         "",
			User2:         "",
			Users:         []string{},
			ClientIp:      c.getClientIp(),
			UserAgent:     c.getUserAgent(),
			MessageCount:  0,
			IsHidden:      strings.HasPrefix(chatName, "chat_provider_"),
		}

		chat.ClientIpDesc = util.GetDescFromIP(chat.ClientIp)
		chat.UserAgentDesc = util.GetDescFromUserAgent(chat.UserAgent)

		_, err = object.AddChat(chat)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
	}

	if tool != "" {
		answer, modelResult, err = object.GetAnswerWithTool(provider, tool, question, c.GetAcceptLanguage())
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
