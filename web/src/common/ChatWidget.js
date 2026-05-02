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

import React from "react";
import {Button, Select, Tooltip} from "antd";
import * as Setting from "../Setting";
import {renderReason, renderText} from "../ChatMessageRender";
import moment from "moment";
import * as ChatBackend from "../backend/ChatBackend";
import * as MessageBackend from "../backend/MessageBackend";
import * as ProviderBackend from "../backend/ProviderBackend";
import i18next from "i18next";
import ChatBox from "../ChatBox";
import {MessageCarrier} from "../chat/MessageCarrier";

/**
 * ChatWidget - A complete chat component with header, model selector, and chat interface
 *
 * @component
 * @description
 * A comprehensive chat component that includes a title bar, model selector, new chat button, and chat interface.
 * Supports automatic loading or creating chats, managing message state, and model provider switching.
 *
 * @param {string} chatName - Required. Unique identifier for the chat, used to load or create the chat
 * @param {string} [displayName] - Optional. Display name for the chat. If not provided, uses default format
 * @param {string} [title] - Optional. Title shown in the header when chat has no displayName
 * @param {string} [category] - Optional. Category for the chat. Defaults to "Default Category"
 * @param {string} [modelProvider] - Optional. Default model provider name
 * @param {Object} account - Required. Current user account information
 * @param {string} account.name - User name
 * @param {string} account.owner - User owner
 * @param {string} [account.createdIp] - User's IP address when created
 * @param {string} [account.education] - User education information
 * @param {string} [height="600px"] - Optional. Component height
 * @param {boolean} [showHeader=true] - Optional. Whether to show the header
 * @param {boolean} [showNewChatButton=true] - Optional. Whether to show the new chat button
 * @param {Object} [store] - Optional. Store object containing prompts
 * @param {Array<PromptItem>} [prompts=[]] - Optional. If store is not provided, array of preset prompts
 * @param {Function} [onChatTitleUpdated] - Optional. Callback when chat title is updated
 * @param {Function} [onMessageSent] - Optional. Callback after message is sent
 * @param {Function} [onChatCleared] - Optional. Callback when chat is cleared
 *
 * @typedef {Object} PromptItem
 * @property {string} title - Prompt title
 * @property {string} text - Prompt content
 * @property {string} image - Prompt image URL
 *
 * @typedef {Object} Account
 * @property {string} name - User name
 * @property {string} owner - User owner
 * @property {string} [createdIp] - User's IP when created
 * @property {string} [education] - User education info
 *
 * @typedef {Object} Chat
 * @property {string} name - Chat name
 * @property {string} displayName - Chat display name
 * @property {string} modelProvider - Model provider name
 *
 * @typedef {Object} Message
 * @property {string} name - Message name
 * @property {string} text - Message text
 * @property {string} author - Message author
 *
 * @example
 * // Basic usage
 * <ChatWidget
 *   chatName="my-chat-001"
 *   displayName="My Chat"
 *   account={userAccount}
 *   height="500px"
 * />
 *
 * @example
 * // Advanced usage with callbacks and prompts
 * <ChatWidget
 *   chatName={`workflow_chat_${workflowName}`}
 *   displayName={`Workflow Chat - ${workflowName}`}
 *   category="Workflow"
 *   account={account}
 *   title="Chat Assistant"
 *   height="600px"
 *   showNewChatButton={true}
 *   onChatTitleUpdated={(chat) => console.log('Title updated:', chat.displayName)}
 *   onMessageSent={(message, chat) => console.log('Message sent:', message)}
 *   onChatCleared={() => console.log('Chat cleared')}
 *   prompts={[
 *     {
 *       title: "Explain Workflow",
 *       text: "Please explain this workflow process",
 *       image: ""
 *     }
 *   ]}
 * />
 */
class ChatWidget extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: [],
      messageLoading: false,
      messageError: false,
      disableInput: false,
      currentChat: null,
      modelProviders: [],
    };
    this.chatBox = React.createRef();
  }

  componentDidMount() {
    this.loadProviders().then(() => {
      if (this.props.chatName) {
        this.loadOrCreateChat();
      }
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.chatName !== this.props.chatName && this.props.chatName) {
      this.loadOrCreateChat();
    }
    if (this.props.modelProviderLocked && prevProps.modelProvider !== this.props.modelProvider && this.props.modelProvider) {
      this.updateModelProvider(this.props.modelProvider);
    }
  }

  // Load model providers
  loadProviders() {
    return ProviderBackend.getProviders(this.props.account?.owner || "admin")
      .then((res) => {
        if (res.status === "ok") {
          const providers = res.data.filter(provider => {
            if (provider.category !== "Model") {
              return false;
            }
            return this.props.modelProviderLocked ? true : provider.state === "Active";
          });
          const selectedProvider = this.props.modelProvider || providers.find(p => p.isDefault)?.name || providers[0]?.name || "";
          this.setState({
            modelProviders: providers,
            currentChat: {
              ...this.state.currentChat,
              modelProvider: selectedProvider,
            },
          });
          return providers;
        }
        return [];
      })
      .catch(error => {
        Setting.showMessage("error", `Failed to load providers: ${error}`);
        return [];
      });
  }

  // Load or create a chat based on the chatName prop
  loadOrCreateChat() {
    const chatName = this.props.chatName;
    if (!chatName) {
      return;
    }

    ChatBackend.getChat("admin", chatName)
      .then((res) => {
        if (res.status === "ok" && res.data) {
          const chat = res.data;
          let needsUpdate = false;
          // Sync modelProvider from props (or default) if different
          const desiredModel = this.props.modelProvider ||
            (this.state.modelProviders.length > 0 ? this.state.modelProviders[0].name : "");
          if (desiredModel && chat.modelProvider !== desiredModel) {
            chat.modelProvider = desiredModel;
            needsUpdate = true;
          }
          if (this.props.tool && chat.tool !== this.props.tool) {
            chat.tool = this.props.tool;
            needsUpdate = true;
          }
          if (needsUpdate) {
            ChatBackend.updateChat(chat.owner, chat.name, chat).catch(() => {});
          }
          this.setState({currentChat: chat});
          this.getMessages(chat);
        } else {
          this.newChat();
        }
      })
      .catch(() => {
        this.newChat();
      });
  }

  newChat() {
    const chatName = this.props.chatName;
    const displayName = this.props.displayName || `Chat - ${chatName}`;
    // Ensure we get the current modelProvider from the chat or select the first available one
    const currentModelProvider = this.state.currentChat?.modelProvider || this.props.modelProvider ||
                                 (this.state.modelProviders.length > 0 ? this.state.modelProviders[0].name : "") || "";

    const newChat = {
      owner: "admin",
      name: chatName,
      createdTime: moment().format(),
      updatedTime: moment().format(),
      organization: this.props.account?.owner,
      displayName: displayName,
      category: this.props.category || i18next.t("chat:Default Category"),
      type: "AI",
      user: this.props.account?.name,
      user1: "",
      user2: "",
      users: [],
      clientIp: this.props.account?.createdIp,
      userAgent: this.props.account?.education,
      messageCount: 0,
      needTitle: true,
      modelProvider: currentModelProvider,
      tool: this.props.tool || "",
    };

    ChatBackend.addChat(newChat)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            currentChat: newChat,
            messages: [],
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  newMessage(text, fileName, isHidden, isRegenerated) {
    const randomName = Setting.getRandomName();
    // Ensure we get the current modelProvider from the chat or select the first available one
    const currentModelProvider = this.state.currentChat?.modelProvider || this.props.modelProvider ||
                                 (this.state.modelProviders.length > 0 ? this.state.modelProviders[0].name : "") || "";

    return {
      owner: "admin",
      name: `message_${randomName}`,
      createdTime: moment().format(),
      organization: this.props.account?.owner || "admin",
      user: this.props.account?.name || "admin",
      chat: this.state.currentChat?.name,
      replyTo: "",
      author: this.props.account?.name || "admin",
      text: text,
      isHidden: isHidden || false,
      isDeleted: false,
      isAlerted: false,
      isRegenerated: isRegenerated || false,
      fileName: fileName || "",
      modelProvider: currentModelProvider,
    };
  }

  sendMessage = (text, fileName, isHidden, isRegenerated) => {
    if (!this.state.currentChat) {
      Setting.showMessage("error", i18next.t("chat:The chat is not found"));
      return;
    }

    if (!text.trim()) {
      return;
    }

    this.setState({
      messageLoading: false,  // Wating for the AI response
      messageError: false,
    });

    const newMessage = this.newMessage(text, fileName, isHidden, isRegenerated);
    MessageBackend.addMessage(newMessage)
      .then((res) => {
        if (res.status === "ok") {
          const updatedChat = res.data;
          this.setState({
            currentChat: updatedChat,
          });
          this.getMessages(updatedChat);

          if (this.props.onMessageSent) {
            this.props.onMessageSent(newMessage, updatedChat);
          }
        } else {
          this.setState({
            messageLoading: false,
            messageError: true,
          });
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({
          messageLoading: false,
          messageError: true,
        });
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  };

  getMessages(chat) {
    if (!chat) {
      return;
    }

    MessageBackend.getChatMessages("admin", chat.name)
      .then((res) => {
        if (res.status === "ok") {
          const messages = res.data || [];
          messages.map((message) => {
            message.html = renderText(message.text);
            return message;
          });
          this.setState({
            messages: messages,
          });

          // Check if the last message is an AI message that is still pending
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.author === "AI" && lastMessage.replyTo !== "" && lastMessage.text === "") {
              this.handlePendingAIMessage(lastMessage, chat, messages);
            } else {
              this.setState({
                messageLoading: false,
              });
            }
          } else {
            this.setState({
              messageLoading: false,
            });
          }

          // Automatically scroll to the last message
          setTimeout(() => {
            if (messages.length > 0) {
              Setting.scrollToDiv(`chatbox-list-item-${messages.length}`);
            }
          }, 100);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          this.setState({
            messageLoading: false,
            messageError: true,
          });
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
        this.setState({
          messageLoading: false,
          messageError: true,
        });
      });
  }

  cancelMessage = () => {
    if (this.state.messages && this.state.messages.length > 0) {
      const lastMessage = this.state.messages[this.state.messages.length - 1];
      if (lastMessage.author === "AI" && this.state.messageLoading) {
        MessageBackend.closeMessageEventSource(lastMessage.owner, lastMessage.name);

        MessageBackend.updateMessage(lastMessage.owner, lastMessage.name, lastMessage)
          .then((res) => {
            if (res.status === "ok") {
              this.setState({
                messageLoading: false,
              });
            } else {
              Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
            }
          })
          .catch(error => {
            Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
          });
      }
    } else {
      this.setState({
        messageLoading: false,
      });
    }
  };

  // clearMessages Directly delete current chat and create a new one
  clearMessages = () => {
    if (this.state.currentChat) {
      ChatBackend.deleteChat(this.state.currentChat)
        .then((res) => {
          if (res.status === "ok") {
            this.newChat();
            Setting.showMessage("success", i18next.t("chat:New Chat"));

            if (this.props.onChatCleared) {
              this.props.onChatCleared();
            }
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${error}`);
        });
    } else {
      this.newChat();
    }
  };

  handleMessageEdit = () => {
    if (this.state.currentChat) {
      this.getMessages(this.state.currentChat);
    }
  };

  handlePendingAIMessage(lastMessage, chat, messages) {
    let text = "";
    let reasonText = "";
    const toolCalls = [];
    let searchResults = null;
    let vectorScores = null;
    this.setState({
      messageLoading: true,
    });

    if (lastMessage.errorText !== "") {
      this.setState({
        messageLoading: false,
        messageError: true,
      });
      return;
    }

    const messageCarrier = new MessageCarrier(chat.needTitle);

    MessageBackend.getMessageAnswer(lastMessage.owner, lastMessage.name,
      // onMessage
      (data) => {
        const jsonData = JSON.parse(data);
        if (jsonData.text === "") {
          jsonData.text = "\n";
        }
        const lastMessage2 = Setting.deepCopy(lastMessage);
        text += jsonData.text;
        const parsedResult = messageCarrier.parseAnswerWithCarriers(text);

        this.updateChatDisplayName(parsedResult.title, chat);

        if (!chat || (this.state.currentChat?.name !== chat.name)) {
          return;
        }

        lastMessage2.text = parsedResult.finalAnswer;

        if (reasonText) {
          lastMessage2.reasonText = reasonText;
          lastMessage2.reasonHtml = renderReason(reasonText);
        }
        if (toolCalls.length > 0) {
          lastMessage2.toolCalls = [...toolCalls];
        }
        if (searchResults) {
          lastMessage2.searchResults = searchResults;
        }
        if (vectorScores) {
          lastMessage2.vectorScores = vectorScores;
        }

        const updatedMessages = [...messages];
        updatedMessages[updatedMessages.length - 1] = lastMessage2;

        updatedMessages.forEach((message) => {
          message.html = renderText(message.text);
        });

        this.setState({
          messages: updatedMessages,
          messageError: false,
        });
      },
      // onReasoning
      (data) => {
        if (!chat || (this.state.currentChat?.name !== chat.name)) {
          return;
        }
        const jsonData = JSON.parse(data);

        if (jsonData.text === "") {
          jsonData.text = "\n";
        }

        reasonText += jsonData.text;

        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.reasonText = reasonText;
        lastMessage2.isReasoningPhase = true;
        lastMessage2.text = "";

        const updatedMessages = [...messages];
        updatedMessages[updatedMessages.length - 1] = lastMessage2;

        this.setState({
          messages: updatedMessages,
        });
      },
      // onTool (handles both tool-start and tool-complete events)
      (data) => {
        if (!chat || (this.state.currentChat?.name !== chat.name)) {
          return;
        }
        const jsonData = JSON.parse(data);

        if (!jsonData.content) {
          // tool-start: add new entry with empty content (tool is executing)
          toolCalls.push({
            name: jsonData.name,
            arguments: jsonData.arguments,
            content: "",
          });
        } else {
          // tool-complete: find the last pending entry with same name and update it
          let found = false;
          for (let i = toolCalls.length - 1; i >= 0; i--) {
            if (toolCalls[i].name === jsonData.name && !toolCalls[i].content) {
              toolCalls[i] = {
                name: jsonData.name,
                arguments: jsonData.arguments,
                content: jsonData.content,
              };
              found = true;
              break;
            }
          }
          if (!found) {
            toolCalls.push({
              name: jsonData.name,
              arguments: jsonData.arguments,
              content: jsonData.content,
            });
          }
        }

        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.toolCalls = toolCalls;

        const updatedMessages = [...messages];
        updatedMessages[updatedMessages.length - 1] = lastMessage2;

        this.setState({
          messages: updatedMessages,
        });
      },
      // onSearch
      (data) => {
        if (!chat || (this.state.currentChat?.name !== chat.name)) {
          return;
        }
        searchResults = JSON.parse(data);

        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.searchResults = searchResults;
        if (toolCalls.length > 0) {
          lastMessage2.toolCalls = [...toolCalls];
        }

        const updatedMessages = [...messages];
        updatedMessages[updatedMessages.length - 1] = lastMessage2;

        this.setState({
          messages: updatedMessages,
        });
      },
      // onVector
      (data) => {
        if (!chat || (this.state.currentChat?.name !== chat.name)) {
          return;
        }
        vectorScores = JSON.parse(data);

        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.vectorScores = vectorScores;
        if (toolCalls.length > 0) {
          lastMessage2.toolCalls = [...toolCalls];
        }

        const updatedMessages = [...messages];
        updatedMessages[updatedMessages.length - 1] = lastMessage2;

        this.setState({
          messages: updatedMessages,
        });
      },
      // onError
      (error) => {
        Setting.showMessage("error", Setting.getRefinedErrorText(error));
        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.errorText = error;
        const updatedMessages = [...messages];
        updatedMessages[updatedMessages.length - 1] = lastMessage2;

        updatedMessages.map((message) => {
          message.html = renderText(message.text);
          return message;
        });

        this.setState({
          messages: updatedMessages,
          messageLoading: false,
          messageError: true,
        });
      },
      // onFinished
      (data) => {
        if (!chat || (this.state.currentChat?.name !== chat.name)) {
          return;
        }

        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.text = text;
        lastMessage2.isReasoningPhase = false;

        if (reasonText) {
          lastMessage2.reasonText = reasonText;
          lastMessage2.reasonHtml = renderReason(reasonText);
        }
        if (toolCalls.length > 0) {
          lastMessage2.toolCalls = [...toolCalls];
        }
        if (searchResults) {
          lastMessage2.searchResults = searchResults;
        }
        if (vectorScores) {
          lastMessage2.vectorScores = vectorScores;
        }

        // Parse the final answer and suggestions
        const parsedResult = messageCarrier.parseAnswerWithCarriers(text);
        text = parsedResult.finalAnswer;

        if (parsedResult.title !== "") {
          chat.displayName = parsedResult.title;
          chat.needTitle = false;
        }

        lastMessage2.text = parsedResult.finalAnswer;
        lastMessage2.suggestions = parsedResult.suggestionArray;

        const updatedMessages = [...messages];
        updatedMessages[updatedMessages.length - 1] = lastMessage2;

        updatedMessages.map((message, index) => {
          message.html = renderText(message.text);

          if (message.reasonText) {
            message.reasonHtml = renderReason(message.reasonText);
          }
          return message;
        });

        this.setState({
          messages: updatedMessages,
          messageLoading: false,
          messageError: false,
        });

        setTimeout(() => {
          Setting.scrollToDiv(`chatbox-list-item-${updatedMessages.length}`);
        }, 100);
      }
    );
  }

  updateChatDisplayName(title, chat) {
    if (title !== "" && chat) {
      chat.displayName = title;
      this.setState({
        currentChat: chat,
      });

      if (this.props.onChatTitleUpdated) {
        this.props.onChatTitleUpdated(chat);
      }
    }
  }

  // Update model provider for the current chat
  updateModelProvider = (providerName) => {
    if (this.state.currentChat && this.state.currentChat.modelProvider !== providerName) {
      const updatedChat = {...this.state.currentChat, modelProvider: providerName};
      this.setState({
        currentChat: updatedChat,
      });

      ChatBackend.updateChat(updatedChat.owner, updatedChat.name, updatedChat)
        .then((res) => {
          if (res.status !== "ok") {
            Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
          }
        })
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
        });
    }
  };

  // Render header with title and controls
  renderHeader() {
    const {showNewChatButton = true, title, modelProviderLocked, lockedModelProviderInfo} = this.props;
    const chatDisplayName = this.state.currentChat?.displayName || title || i18next.t("general:Chat");

    // When locked, override the cached backend entry with the live (possibly unsaved) provider info
    // so that logo and name update immediately when Type / Sub type are changed in the edit form.
    const displayProviders = (modelProviderLocked && lockedModelProviderInfo)
      ? this.state.modelProviders.map(p =>
        p.name === lockedModelProviderInfo.name ? lockedModelProviderInfo : p
      )
      : this.state.modelProviders;

    return (
      <div style={{
        padding: "8px 12px",
        borderBottom: "1px solid #f0f0f0",
        backgroundColor: "#fafafa",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{display: "flex", alignItems: "center", gap: "12px", flex: 1, flexWrap: "wrap"}}>
          <Tooltip title={chatDisplayName}>
            <span style={{fontWeight: "500", color: "#333", width: Setting.isMobile() ? "35vw" : "15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{chatDisplayName}</span>
          </Tooltip>

          {displayProviders.length > 0 && (
            <Select
              size="small"
              style={{width: Setting.isMobile() ? "35vw" : "15rem"}}
              value={this.state.currentChat?.modelProvider || displayProviders[0]?.name || ""}
              onChange={this.updateModelProvider}
              placeholder="Select model"
              optionLabelProp="children"
              disabled={!!modelProviderLocked}
            >
              {displayProviders.map((provider, id) => (
                <Select.Option key={id} value={provider.name}>
                  <div style={{display: "flex", alignItems: "center", gap: "6px"}}>
                    <img
                      src={Setting.getProviderLogoURL(provider)}
                      alt={provider.name}
                      style={{width: 16, height: 16}}
                    />
                    <span>{Setting.getProviderDisplayName(provider)}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          )}

          {showNewChatButton && (
            <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
              <Button
                type="primary"
                size="small"
                onClick={this.clearMessages}
              >
                {i18next.t("chat:New Chat")}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  render() {
    const {
      height = "600px",
      account,
      prompts = [],
      exampleQuestions,
      showHeader = true,
    } = this.props;

    return (
      <div style={{display: "flex", flexDirection: "column", height: height, border: "1px solid #f0f0f0", borderRadius: "4px"}}>
        {showHeader && this.renderHeader()}

        <div style={{flex: 1, position: "relative"}}>
          <ChatBox
            ref={this.chatBox}
            autoFocusInput={false}
            disableInput={this.state.disableInput}
            loading={this.state.messageLoading}
            messages={this.state.messages}
            messageError={this.state.messageError}
            sendMessage={(text, fileName, regenerate = false) => {
              this.sendMessage(text, fileName, false, regenerate);
            }}
            onMessageEdit={this.handleMessageEdit}
            onCancelMessage={this.cancelMessage}
            account={account}
            name={this.state.currentChat?.name}
            displayName={this.state.currentChat?.displayName}
            store={this.props.store || {
              prompts: prompts,
              exampleQuestions: exampleQuestions || prompts,
            }}
            styles={{
              layout: {
                border: "none",
                borderRadius: "0 0",
              },
              card: {
                border: "none",
                borderRadius: "0 0",
              },
            }}
          />
        </div>
      </div>
    );
  }
}

export default ChatWidget;
