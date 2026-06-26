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

import React from "react";
import {Button, Drawer, Modal, Spin} from "antd";
import {BarsOutlined, CloseCircleFilled, MenuFoldOutlined, MenuUnfoldOutlined} from "@ant-design/icons";
import moment from "moment";
import * as StoreBackend from "./backend/StoreBackend";
import ChatMenu from "./ChatMenu";
import ChatBox from "./ChatBox";
import StoreInfoTitle from "./StoreInfoTitle";
import MultiPaneManager from "./MultiPaneManager";
import {renderReason, renderText} from "./ChatMessageRender";
import * as Setting from "./Setting";
import * as ChatBackend from "./backend/ChatBackend";
import * as MessageBackend from "./backend/MessageBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import {MessageCarrier} from "./chat/MessageCarrier";
import {getFirstUserMessageText} from "./carrier/titleUtils";
import {applyToolDelta, applyToolEvent, createToolDeltaFlusher} from "./chat/toolCallStream";

const chatStatusPollingInterval = 2000;

class ChatPage extends BaseListPage {
  constructor(props) {
    super(props);

    this.menu = React.createRef();
    this.chatBox = React.createRef();
  }

  UNSAFE_componentWillMount() {
    const savedCollapsedState = localStorage.getItem("chatMenuCollapsed");
    const chatMenuCollapsed = savedCollapsedState ? JSON.parse(savedCollapsedState) : false;

    // If URL path contains a store name, update localStorage to that store.
    // Otherwise, use whatever is already in localStorage (never override it).
    const urlStore = this.getStore();
    if (urlStore) {
      Setting.setStore(urlStore);
    }
    const currentStore = urlStore || Setting.getStoreCurrent();

    this.setState({
      loading: true,
      disableInput: false,
      isModalOpen: false,
      messageLoading: false,
      messageError: false,
      autoRead: false,
      chatMenuVisible: false,
      chatMenuCollapsed: chatMenuCollapsed,
      defaultStore: null,
      filteredStores: [],
      paneCount: 1,
      storeName: currentStore, // Store the current store name in state
      draftStoreName: currentStore,
      draftModelProvider: null,
      generationMode: "text",
    });

    this.fetch();
    this.pollingChatNames = new Set();
    this.chatStatusPollingErrorShown = false;
    this.isChatPageUnmounted = false;
    this.startPolling();
  }

  componentWillUnmount() {
    this.isChatPageUnmounted = true;
    this.stopPolling();
  }

  startPolling() {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      const generatingChats = this.state.data?.filter(chat => chat.isGenerating) || [];
      generatingChats.forEach(chat => {
        const chatKey = `${chat.owner}/${chat.name}`;
        if (this.pollingChatNames.has(chatKey)) {
          return;
        }

        this.pollingChatNames.add(chatKey);
        ChatBackend.getChatStatus(chat.owner, chat.name)
          .then(res => {
            if (this.isChatPageUnmounted) {
              return;
            }
            if (res.status !== "ok") {
              if (!this.chatStatusPollingErrorShown) {
                Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
                this.chatStatusPollingErrorShown = true;
              }
              return;
            }
            this.chatStatusPollingErrorShown = false;

            const status = res.data;
            const isViewing = this.state.chat?.name === chat.name;
            const generationFinished = chat.isGenerating && !status.isGenerating;

            if (generationFinished && isViewing && this.state.messageLoading) {
              this.setState({
                messageLoading: false,
              });
              this.getMessages({...chat, ...status}, {skipPendingAnswer: true});
            }

            if (generationFinished && isViewing && status.isUnread) {
              this.markChatRead({...chat, ...status});
              return;
            }

            if (status.isGenerating !== chat.isGenerating || status.isUnread !== chat.isUnread) {
              this.updateChatStatus(chat.name, status);
            }
          })
          .catch(error => {
            if (this.isChatPageUnmounted) {
              return;
            }
            if (!this.chatStatusPollingErrorShown) {
              Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
              this.chatStatusPollingErrorShown = true;
            }
          })
          .finally(() => {
            if (!this.isChatPageUnmounted) {
              this.pollingChatNames.delete(chatKey);
            }
          });
      });
    }, chatStatusPollingInterval);
  }

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.pollingChatNames?.clear();
  }

  handleGenerationModeChange = (mode) => {
    this.setState({generationMode: mode});
    const chat = this.state.chat;
    if (chat) {
      Setting.saveChatGenerationMode(chat.owner, chat.name, mode);
    }
  };

  componentDidMount() {
    super.componentDidMount();
    window.addEventListener("message", event => {
      if ((event.data.source !== undefined && event.data.source.includes("react-devtools")) || event.data.wappalyzer !== undefined) {
        return;
      }

      if (event.data === "close") {
        this.setState({
          isModalOpen: false,
        });
      }
    });

    if (this.props.onCreateChatPage) {
      this.props.onCreateChatPage(this);
    }
    const urlParams = new URLSearchParams(window.location.search);
    const newMessage = urlParams.get("newMessage");

    if (newMessage && newMessage.trim() !== "") {
      this.sendMessage(newMessage);
    }
  }

  toggleChatMenu = () => {
    this.setState({
      chatMenuVisible: !this.state.chatMenuVisible,
    });
  };

  closeChatMenu = () => {
    this.setState({
      chatMenuVisible: false,
    });
  };

  toggleChatMenuCollapse = () => {
    const newCollapsedState = !this.state.chatMenuCollapsed;
    this.setState({
      chatMenuCollapsed: newCollapsedState,
    });
    localStorage.setItem("chatMenuCollapsed", JSON.stringify(newCollapsedState));
  };

  generateChatUrl(chatName, storeName, owner = "admin") {
    const currentStoreName = this.getStore();
    if (!currentStoreName) {
      if (chatName) {
        return `/chat/${chatName}`;
      }
      return "/chat";
    }
    const targetStoreName = storeName || currentStoreName;

    if (chatName) {
      return `/${owner}/${targetStoreName}/chat/${chatName}`;
    }
    return `/${owner}/${targetStoreName}/chat`;
  }

  updateStoreAndUrl = (newStore) => {
    if (!this.state.chat) {
      return null;
    }
    const updatedChat = {...this.state.chat, store: newStore.name};
    this.goToLinkSoft(this.generateChatUrl(updatedChat.name, updatedChat.store));
    this.setState({chat: updatedChat});
    return updatedChat;
  };

  updateChatStatus = (chatName, updates) => {
    this.setState(prevState => {
      const data = prevState.data;
      if (!data) {return prevState;}

      const index = data.findIndex(c => c.name === chatName);
      if (index === -1) {return prevState;}

      const newChat = {...data[index], ...updates};
      const newData = [...data];
      newData[index] = newChat;

      const nextState = {data: newData};
      if (prevState.chat?.name === chatName) {
        nextState.chat = newChat;
      }
      return nextState;
    });
  };

  markChatRead = (chat) => {
    if (!chat || !chat.isUnread || chat.isGenerating) {
      return;
    }

    const updatedChat = {...chat, isUnread: false};
    ChatBackend.updateChat(chat.owner, chat.name, updatedChat)
      .then(res => {
        if (this.isChatPageUnmounted) {
          return;
        }
        if (res.status === "ok") {
          this.updateChatStatus(chat.name, {isUnread: false, isGenerating: chat.isGenerating});
        }
      })
      .catch(error => {
        if (this.isChatPageUnmounted) {
          return;
        }
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  };

  getGlobalStores() {
    StoreBackend.getGlobalStores().then((res) => {
      if (res.status === "ok") {
        const stores = res?.data;
        const defaultStore = stores?.find(store => store.isDefault);

        let filteredStores = [];
        if (stores && defaultStore && defaultStore.childStores && defaultStore.childStores.length > 0) {
          const childStoreNames = new Set(defaultStore.childStores);
          filteredStores = stores.filter(store => childStoreNames.has(store.name));
        }

        this.setState({
          stores: stores,
          defaultStore: defaultStore,
          filteredStores: filteredStores,
        });
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
      }
    });
  }

  getChat() {
    if (this.props.match) {
      return this.props.match.params.chatName;
    } else {
      return undefined;
    }
  }

  getStore() {
    if (this.props.match) {
      return this.props.match.params.storeName;
    } else {
      return undefined;
    }
  }

  goToLinkSoft(path) {
    if (this.props.history) {
      this.props.history.push(path);
    } else {
      return "";
    }
  }

  newMessage(text, fileName, isHidden, isRegenerated, webSearchEnabled = false) {
    const randomName = Setting.getRandomName();
    const message = {
      owner: "admin",
      name: `message_${randomName}`,
      createdTime: moment().format(),
      organization: this.props.account.owner,
      store: this.state.chat?.store,
      user: this.props.account.name,
      chat: this.state.chat?.name,
      replyTo: "",
      author: this.props.account.name,
      text: text,
      isHidden: isHidden,
      isDeleted: false,
      isAlerted: false,
      isRegenerated: isRegenerated,
      fileName: fileName,
      webSearchEnabled: webSearchEnabled,
      modelProvider: this.state.chat?.modelProvider,
    };

    if (!this.state.chat) {
      const urlStoreName = this.state.draftStoreName || this.state.storeName || this.getStore();
      if (urlStoreName) {
        message.store = urlStoreName;
      }
      if (this.state.draftModelProvider) {
        message.modelProvider = this.state.draftModelProvider;
      }
    }

    if (!message.modelProvider) {
      if (message.store) {
        const store = this.state.stores?.find(store => store.name === message.store);
        message.modelProvider = store?.modelProvider;
      } else {
        message.modelProvider = this.state.defaultStore?.modelProvider;
      }
    }

    return message;
  }

  cancelMessage = () => {
    if (this.state.messages && this.state.messages.length > 0) {
      const lastMessage = this.state.messages[this.state.messages.length - 1];
      if (lastMessage.author === "AI" && this.state.messageLoading) {
        MessageBackend.closeMessageEventSource(lastMessage.owner, lastMessage.name, true);

        const canceledChat = this.state.chat;
        MessageBackend.updateMessage(lastMessage.owner, lastMessage.name, lastMessage)
          .then((res) => {
            if (res.status === "ok") {
              this.setState({
                messageLoading: false,
              });
              if (canceledChat) {
                this.updateChatStatus(canceledChat.name, {isGenerating: false});
                const chatInList = this.state.data?.find(c => c.name === canceledChat.name);
                if (chatInList) {
                  this.markChatRead({...chatInList, isGenerating: false});
                }
              }
            } else {
              Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
            }
          })
          .catch(error => {
            Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
          });
      }
    }
  };

  refreshChatsAndSelect(chat) {
    const field = "user";
    const value = this.props.account.name;
    const sortField = "", sortOrder = "";
    const storeName = this.state.storeName;

    ChatBackend.getChats(value, storeName, -1, -1, field, value, sortField, sortOrder)
      .then((res) => {
        if (res.status === "ok") {
          const chats = res.data;
          this.setState({
            data: chats,
          });
          this.menu.current?.setSelectedKeyToChat(chats, chat.name);
        }
      });
  }

  sendMessage(text, fileName, isHidden, isRegenerated, webSearchEnabled = false) {
    const newMessage = this.newMessage(text, fileName, isHidden, isRegenerated, webSearchEnabled);
    this.setState({messageLoading: true});
    MessageBackend.addMessage(newMessage)
      .then((res) => {
        if (res.status === "ok") {
          const chat = res.data;
          const draftModelProvider = this.state.draftModelProvider;
          if (draftModelProvider) {
            chat.modelProvider = draftModelProvider;
          }
          const currentGenerationMode = this.state.generationMode;
          Setting.saveChatGenerationMode(chat.owner, chat.name, currentGenerationMode);
          this.setState({
            chat: chat,
            draftStoreName: chat.store,
            draftModelProvider: null,
            generationMode: currentGenerationMode,
          });
          this.goToLinkSoft(this.generateChatUrl(chat.name, chat.store));

          const afterRefresh = () => {
            this.refreshChatsAndSelect(chat);
            this.getMessages(chat);
          };

          if (draftModelProvider) {
            ChatBackend.updateChat(chat.owner, chat.name, chat)
              .then(() => afterRefresh())
              .catch(() => afterRefresh());
          } else {
            afterRefresh();
          }
        } else {
          this.setState({messageLoading: false});
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        this.setState({messageLoading: false});
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  getMessages(chat, options = {}) {
    this.setState({
      messageError: false,
    });

    MessageBackend.getChatMessages("admin", chat.name)
      .then((res) => {
        res.data.map((message) => {
          message.html = renderText(message.text);
        });
        this.setState({
          messages: res.data,
        });
        this.markChatRead(chat);

        if (res.data.length > 0) {
          const lastMessage = res.data[res.data.length - 1];
          if (lastMessage.author === "AI" && lastMessage.replyTo !== "" && lastMessage.text === "") {
            if (options.skipPendingAnswer) {
              this.setState({
                messageLoading: false,
                messageError: lastMessage.errorText !== "",
              });
              return;
            }
            let text = "";
            let reasonText = "";
            const toolCalls = [];
            const flushToolDelta = () => {
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }

              const currentMessage = res.data[res.data.length - 1];
              const lastMessage2 = Setting.deepCopy(currentMessage);
              lastMessage2.toolCalls = [...toolCalls];
              res.data[res.data.length - 1] = lastMessage2;
              this.setState({messages: [...res.data]});
            };
            const {scheduleFlush: scheduleToolDeltaFlush, flushNow: flushToolDeltaNow} = createToolDeltaFlusher(flushToolDelta);
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
            const mssageCarrier = new MessageCarrier(chat.needTitle);
            const userTextForTitle = getFirstUserMessageText(res.data);
            MessageBackend.getMessageAnswer(lastMessage.owner, lastMessage.name, (data) => {
              const jsonData = JSON.parse(data);

              if (jsonData.text === "") {
                jsonData.text = "\n";
              }
              const currentMessage = res.data[res.data.length - 1];
              const lastMessage2 = Setting.deepCopy(currentMessage);
              text += jsonData.text;
              const parsedResult = mssageCarrier.parseAnswerWithCarriers(text, userTextForTitle);
              this.updateChatDisplayName(parsedResult.title, chat);
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }
              lastMessage2.text = parsedResult.finalAnswer;

              lastMessage2.isReasoningPhase = false;

              res.data[res.data.length - 1] = lastMessage2;
              res.data.map((message, index) => {
                if (index === res.data.length - 1 && message.author === "AI") {
                  message.html = renderText(message.text);
                } else {
                  message.html = renderText(message.text);
                }
              });
              this.setState({
                messages: [...res.data],
                messageError: false,
              });
            }, (data) => {
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }
              const jsonData = JSON.parse(data);

              if (jsonData.text === "") {
                jsonData.text = "\n";
              }

              reasonText += jsonData.text;

              const currentMessage = res.data[res.data.length - 1];
              const lastMessage2 = Setting.deepCopy(currentMessage);
              lastMessage2.reasonText = reasonText;
              if (!lastMessage2.toolCalls || lastMessage2.toolCalls.length === 0) {
                lastMessage2.isReasoningPhase = true;
              }

              if (text) {
                lastMessage2.text = text;
              }
              res.data[res.data.length - 1] = lastMessage2;

              this.setState({
                messages: [...res.data],
              });
            }, (data) => {
              // onTool callback (handles both tool-start and tool-complete events)
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }
              const jsonData = JSON.parse(data);

              applyToolEvent(toolCalls, jsonData);
              flushToolDeltaNow();
            }, (data) => {
              // onSearch callback
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }
              const searchResults = JSON.parse(data);

              const currentMessage = res.data[res.data.length - 1];
              const lastMessage2 = Setting.deepCopy(currentMessage);
              lastMessage2.searchResults = searchResults;
              if (toolCalls.length > 0) {
                lastMessage2.toolCalls = [...toolCalls];
              }
              res.data[res.data.length - 1] = lastMessage2;

              this.setState({
                messages: [...res.data],
              });
            }, (data) => {
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }
              const vectorScores = JSON.parse(data);

              const currentMessage = res.data[res.data.length - 1];
              const lastMessage2 = Setting.deepCopy(currentMessage);
              lastMessage2.vectorScores = vectorScores;
              if (toolCalls.length > 0) {
                lastMessage2.toolCalls = [...toolCalls];
              }
              res.data[res.data.length - 1] = lastMessage2;

              this.setState({
                messages: [...res.data],
              });
            }, (error) => {
              this.updateChatStatus(chat.name, {isGenerating: false});
              const errorChat = this.state.data?.find(c => c.name === chat.name);
              if (errorChat) {
                this.markChatRead({...errorChat, isGenerating: false});
              }

              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }

              const lastMessage2 = Setting.deepCopy(lastMessage);
              lastMessage2.errorText = error;
              res.data[res.data.length - 1] = lastMessage2;

              res.data.map((message) => {
                message.html = renderText(message.text);
              });

              this.setState({
                messages: [...res.data],
                messageLoading: false,
                messageError: true,
              });
            }, (data) => {
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }
              flushToolDeltaNow();
              const lastMessage2 = Setting.deepCopy(lastMessage);
              lastMessage2.text = text;

              // Preserve reasoning when finalizing the message
              if (res.data[res.data.length - 1].reasonText) {
                lastMessage2.reasonText = res.data[res.data.length - 1].reasonText;
                lastMessage2.reasonHtml = res.data[res.data.length - 1].reasonHtml;
              }

              // Preserve tool calls when finalizing the message
              if (res.data[res.data.length - 1].toolCalls) {
                lastMessage2.toolCalls = res.data[res.data.length - 1].toolCalls;
              }

              // Preserve search results when finalizing the message
              if (res.data[res.data.length - 1].searchResults) {
                lastMessage2.searchResults = res.data[res.data.length - 1].searchResults;
              }

              // Preserve vector scores when finalizing the message
              if (res.data[res.data.length - 1].vectorScores) {
                lastMessage2.vectorScores = res.data[res.data.length - 1].vectorScores;
              }

              // We're no longer in reasoning phase
              lastMessage2.isReasoningPhase = false;
              // If there are suggestions or title , split them from the text
              const parsedResult = mssageCarrier.parseAnswerWithCarriers(text, userTextForTitle);
              text = parsedResult.finalAnswer;
              if (parsedResult.title !== "") {
                chat.displayName = parsedResult.title;
                chat.needTitle = false;
                this.updateChatDisplayName(parsedResult.title, chat);
              }
              lastMessage2.text = parsedResult.finalAnswer;
              lastMessage2.suggestions = parsedResult.suggestionArray;

              const isCurrentChat = this.state.chat?.name === chat.name;
              const updates = {isGenerating: false};
              if (isCurrentChat) {
                this.markChatRead({...chat, isGenerating: false});
              }
              this.updateChatStatus(chat.name, updates);

              if (!isCurrentChat) {
                return;
              }

              res.data[res.data.length - 1] = lastMessage2;
              res.data.map((message, index) => {
                // Ensure the main HTML is rendered properly
                message.html = renderText(message.text);

                // Make sure the reason HTML is still there if we have reason text
                if (message.reasonText) {
                  message.reasonHtml = renderReason(message.reasonText);
                }
              });

              this.setState({
                messages: [...res.data],
                messageLoading: false,
                messageError: false,
              });

              if (this.state.autoRead) {
                if (this.chatBox?.current?.toggleMessageReadState) {
                  this.chatBox.current.toggleMessageReadState(lastMessage2);
                }
              }
            }, (infoText) => {
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }
              const currentMessage = res.data[res.data.length - 1];
              const lastMessage2 = Setting.deepCopy(currentMessage);
              lastMessage2.hintText = infoText;
              res.data[res.data.length - 1] = lastMessage2;
              this.setState({messages: [...res.data]});
            }, (update) => {
              if (!chat || update?.name !== chat.name || !update.displayName) {
                return;
              }
              this.updateChatDisplayName(update.displayName, {...chat, needTitle: update.needTitle ?? false});
            }, (data) => {
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }
              const jsonData = JSON.parse(data);
              applyToolDelta(toolCalls, jsonData);
              scheduleToolDeltaFlush();
            }, (statusText) => {
              if (!chat || (this.state.chat?.name !== chat.name)) {
                return;
              }
              const currentMessage = res.data[res.data.length - 1];
              const lastMessage2 = Setting.deepCopy(currentMessage);
              lastMessage2.statusText = statusText;
              res.data[res.data.length - 1] = lastMessage2;
              this.setState({messages: [...res.data]});
            });
          } else {
            this.setState({
              messageLoading: false,
            });
          }
        }

        Setting.scrollToDiv(`chatbox-list-item-${res.data.length}`);
      });
  }

  updateChatDisplayName(title, chat) {
    if (title !== "") {
      const updatedChats = [...this.state.data];
      const index = updatedChats.findIndex(c => c.name === chat.name);
      if (index !== -1) {
        updatedChats[index].displayName = title;
        updatedChats[index].needTitle = false;
        const nextState = {data: updatedChats};
        if (this.state.chat?.name === chat.name) {
          nextState.chat = {...this.state.chat, displayName: title, needTitle: false};
        }
        this.setState(nextState);
      }
    }
  }

  addChat(chat, selectStore) {
    const draftStoreName = selectStore?.name || this.state.storeName || this.getStore() || this.state.defaultStore?.name || "";
    this.goToLinkSoft(this.generateChatUrl(undefined, draftStoreName));
    this.setState({
      chat: undefined,
      messages: [],
      chatMenuVisible: false,
      messageError: false,
      draftStoreName: draftStoreName,
      draftModelProvider: null,
      generationMode: "text",
    }, () => {
      this.menu.current?.clearSelectedKey();
      this.chatBox.current?.focusInput();
    });
    return undefined;
  }

  deleteChat(chats, i, chat) {
    ChatBackend.deleteChat(chat)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          const data = Setting.deleteRow(this.state.data, i);
          const j = Math.min(i, data.length - 1);
          if (j < 0) {
            this.setState({
              chat: undefined,
              messages: [],
              data: data,
            });
            this.goToLinkSoft("/chat");
          } else {
            const focusedChat = data[j];
            this.setState({
              chat: focusedChat,
              // messages: null,
              data: data,
              generationMode: Setting.loadChatGenerationMode(focusedChat.owner, focusedChat.name),
            });
            this.getMessages(focusedChat);
            this.goToLinkSoft(this.generateChatUrl(focusedChat.name, focusedChat.store));
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  updateChatName(chats, i, chat, newName) {
    const name = chat.name;
    chat.displayName = newName;
    ChatBackend.updateChat("admin", name, chat)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  }

  handleMessageEdit = (updatedChat) => {
    this.updateChatStatus(updatedChat.name, updatedChat);
    this.refreshChatsAndSelect(updatedChat);
    this.getMessages(updatedChat);
  };

  getCurrentChat() {
    return this.state.data.filter(chat => chat.name === this.state.chat?.name)[0];
  }

  handleChatUpdate = (updatedChat) => {
    this.setState(prevState => ({
      data: prevState.data.map(c => (c.name === updatedChat.name ? updatedChat : c)),
      chat: updatedChat,
    }));
  };

  renderModal() {
    return null;
  }

  renderUnsafePasswordModal() {
    if (this.props.account.password !== "#NeedToModify#") {
      return null;
    }

    return (
      <Modal
        title={
          <div>
            <CloseCircleFilled style={{color: "rgb(255,77,79)"}} />
            &nbsp;
            {" " + i18next.t("account:Please Modify Your Password")}
          </div>
        }
        closable={false}
        open={true}
        okButtonProps={{style: {display: "none"}}}
        cancelButtonProps={{style: {display: "none"}}}
        onOk={null}
        onCancel={null}
      >
        <div>
          <p>{i18next.t("account:The system has detected that you are using the default password, which is not secure. You need to modify your password immediately. Here are the instructions")}:</p>
          <p>{i18next.t("account:1. Go to your setting page by clicking on the below \"My Account\" button.")}</p>
          <p>{i18next.t("account:2. Click \"Modify password...\" button to change your password. Then close the setting page.")}</p>
          <p>{i18next.t("account:3. Go back to this page and refresh it by pressing F5 key. This alert message should be gone.")}</p>
          <p>{i18next.t("account:4. If you encounter any issues, please contact your administrator.")}</p>
          <div style={{display: "flex", justifyContent: "center", marginTop: "30px"}}>
            <Button type="primary" onClick={() => Setting.openLink(Setting.getMyProfileUrl(this.props.account))}>{i18next.t("account:My Account")}</Button>
          </div>
        </div>
      </Modal>
    );
  }

  renderTable(chats) {
    const isDark = Setting.getIsDark();

    const onSelectChat = (i) => {
      const chat = chats[i];
      this.setState({
        chat: chat,
        // messages: null,
        chatMenuVisible: false,
        messageError: false,
        draftStoreName: chat.store,
        generationMode: Setting.loadChatGenerationMode(chat.owner, chat.name),
      });
      this.getMessages(chat);
      this.goToLinkSoft(this.generateChatUrl(chat.name, chat.store));
    };

    const onAddChat = (selectStore = {}) => {
      const chat = this.getCurrentChat();
      this.addChat(chat, selectStore);
    };

    const onDeleteChat = (i) => {
      const chat = chats[i];
      this.deleteChat(chats, i, chat);
    };

    const onUpdateChatName = (i, newName) => {
      const chat = chats[i];
      this.updateChatName(chats, i, chat, newName);
    };

    const currentStoreName = this.state.storeName;

    if (this.state.loading) {
      return (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 120px)"}}>
          <Spin size="large" tip={i18next.t("general:Loading")} />
        </div>
      );
    }

    return (
      <div style={{display: "flex", height: (Setting.getUrlParam("isRaw") !== null) ? "calc(100vh)" : (window.location.pathname.startsWith("/chat")) ? "calc(100vh - 135px)" : Setting.isMobile() ? "calc(100vh - 136px)" : "calc(100vh - 135px)"}}>
        {
          this.renderModal()
        }
        {
          this.renderUnsafePasswordModal()
        }
        {
          !(Setting.isMobile() || Setting.getUrlParam("isRaw") !== null) && !this.state.chatMenuCollapsed && (
            <div style={{
              width: "250px",
              height: "100%",
              marginRight: "0",
              background: isDark ? "#1a1a1a" : "#f7f8fa",
              borderRight: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #ebebeb",
              flexShrink: 0,
            }}>
              <ChatMenu ref={this.menu} chats={chats} chatName={this.getChat()} onSelectChat={onSelectChat} onAddChat={onAddChat} onDeleteChat={onDeleteChat} onUpdateChatName={onUpdateChatName} stores={this.state.stores} currentStoreName={currentStoreName} />
            </div>
          )
        }

        {Setting.isMobile() && (
          <Drawer title={i18next.t("general:Chats")} placement="left" open={this.state.chatMenuVisible} onClose={this.closeChatMenu} width={250}
          >
            <ChatMenu ref={this.menu} chats={chats} chatName={this.getChat()} onSelectChat={onSelectChat} onAddChat={onAddChat} onDeleteChat={onDeleteChat} onUpdateChatName={onUpdateChatName} stores={this.state.stores} currentStoreName={currentStoreName} />
          </Drawer>
        )}

        <div style={{flex: 1, height: "100%", position: "relative", display: "flex", flexDirection: "column", minWidth: 0}}>
          {this.state.paneCount === 1 && (this.state.chat || Setting.isMobile() || Setting.getUrlParam("isRaw") === null) && (
            <div style={{display: "flex", alignItems: "center", borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #f0f0f0", background: isDark ? "rgba(20,20,20,0.9)" : "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)"}}>
              {Setting.isMobile() && (
                <Button type="text" icon={<BarsOutlined />} onClick={this.toggleChatMenu} style={{margin: "0 4px"}} />
              )}
              {!(Setting.isMobile() || Setting.getUrlParam("isRaw") !== null) && (
                <Button type="text" icon={this.state.chatMenuCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={this.toggleChatMenuCollapse} style={{margin: "0 4px"}} />
              )}
              <div style={{flex: 1}}>
                <StoreInfoTitle chat={this.state.chat} stores={this.state.stores} onChatUpdated={this.handleChatUpdate} onStoreChange={this.updateStoreAndUrl} autoRead={this.state.autoRead} onUpdateAutoRead={(checked) => this.setState({autoRead: checked})} account={this.props.account} paneCount={this.state.paneCount} onPaneCountChange={(count) => this.setState({paneCount: count})} showPaneControls={true} generationMode={this.state.generationMode} onGenerationModeChange={this.handleGenerationModeChange} draftStoreName={this.state.draftStoreName} onDraftStoreChange={(storeName) => this.setState({draftStoreName: storeName, draftModelProvider: null})} onDraftProviderChange={(providerName) => this.setState({draftModelProvider: providerName})} />
              </div>
            </div>
          )}

          {this.state.paneCount > 1 ? (
            <MultiPaneManager stores={this.state.stores} filteredStores={this.state.filteredStores} defaultStore={this.state.defaultStore} account={this.props.account} site={this.props.site} messageLoading={this.state.messageLoading} messageError={this.state.messageError} onCancelMessage={this.cancelMessage} initialChat={this.state.chat} onChatUpdate={(chat) => this.setState({chat})} onSetMessageLoading={(loading) => this.setState({messageLoading: loading})} paneCount={this.state.paneCount} onPaneCountChange={(count) => this.setState({paneCount: count})} />
          ) : (
            <div style={{flex: 1, position: "relative", overflow: "auto"}}>
              {(this.state.messages === undefined || this.state.messages === null) ? null : (
                <div style={{
                  position: "absolute",
                  top: -50,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url(${Setting.getLogo("", this.props.site?.logoUrl)})`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "200px auto",
                  backgroundBlendMode: "luminosity",
                  filter: "grayscale(80%) brightness(140%) contrast(90%)",
                  opacity: 0.5,
                  pointerEvents: "none",
                }}>
                </div>
              )}
              <ChatBox
                ref={this.chatBox}
                disableInput={this.state.disableInput}
                disableFocusHighlight={true}
                loading={this.state.messageLoading}
                messages={this.state.messages}
                messageError={this.state.messageError}
                sendMessage={(text, fileName, isHidden = false, regenerate = false, webSearchEnabled = false) => {
                  this.sendMessage(text, fileName, isHidden, regenerate, webSearchEnabled);
                }}
                onMessageEdit={this.handleMessageEdit}
                onCancelMessage={this.cancelMessage}
                account={this.props.account}
                name={this.state.chat?.name}
                displayName={this.state.chat?.displayName}
                chat={this.state.chat}
                store={this.state.chat ?
                  this.state.stores?.find(store => store.name === this.state.chat.store) :
                  this.state.stores?.find(store => store.name === this.state.draftStoreName) ||
                  this.state.stores?.find(store => store.name === this.state.storeName) ||
                  this.state.stores?.find(store => store.isDefault === true)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  fetch = (params = {}, setLoading = true) => {
    const field = "user";
    const value = this.props.account.name;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    const chatName = this.getChat();
    const storeName = this.state.storeName;

    if (setLoading) {
      this.setState({loading: true});
    }
    ChatBackend.getChats(value, storeName, -1, -1, field, value, sortField, sortOrder)
      .then((res) => {
        if (res.status === "ok") {
          const chats = res.data;
          const nextState = {
            loading: false,
            data: chats,
            messageError: false,
            searchText: params.searchText,
            searchedColumn: params.searchedColumn,
          };
          if (setLoading) {
            nextState.messages = [];
            nextState.chat = undefined;
            nextState.draftStoreName = storeName;
          }
          this.setState(nextState);

          if (chats.length > 0) {
            let chat;
            if (chatName !== undefined) {
              chat = chats.find(c => c.name === chatName);
            }
            if (!chat) {
              chat = chats[0];
              this.goToLinkSoft(this.generateChatUrl(chat.name, chat.store));
            }

            if (setLoading) {
              this.setState({
                messages: [],
                chat: chat,
                draftStoreName: chat.store,
                generationMode: Setting.loadChatGenerationMode(chat.owner, chat.name),
              });
              this.getMessages(chat);
            } else if (this.state.chat?.name === chat.name) {
              this.setState({chat: chat});
            }
          }
          this.getGlobalStores();

          if (!setLoading) {
            if (this.menu && this.menu.current) {
              this.menu.current.setSelectedKeyToChat(chats, this.state.chat?.name);
            }
          }
        }
      });
  };
}

export default ChatPage;
