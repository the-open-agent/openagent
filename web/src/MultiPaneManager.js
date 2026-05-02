// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
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

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Button, Input, Select} from "antd";
import {MinusOutlined, PlusOutlined, SendOutlined} from "@ant-design/icons";
import moment from "moment";
import ChatBox from "./ChatBox";
import {renderReason, renderText} from "./ChatMessageRender";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import * as ChatBackend from "./backend/ChatBackend";
import * as MessageBackend from "./backend/MessageBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import i18next from "i18next";
import {MessageCarrier} from "./chat/MessageCarrier";

const {TextArea} = Input;

const MultiPaneManager = ({
  stores,
  defaultStore,
  account,
  messageLoading,
  messageError,
  onCancelMessage,
  initialChat,
  onChatUpdate,
  onSetMessageLoading,
  paneCount,
  onPaneCountChange,
}) => {
  const [panes, setPanes] = useState([]);
  const [globalInputValue, setGlobalInputValue] = useState("");
  const [modelProviders, setModelProviders] = useState([]);

  const loadingStateRef = useRef(new Set());
  const addedChatsRef = useRef(new Set());
  const initialChatRef = useRef(null);
  const globalInputRef = useRef();

  const canManagePanes = Setting.isLocalAdminUser(account);
  const availableStores = stores || [];

  // Load model providers
  useEffect(() => {
    if (!defaultStore?.childModelProviders?.length) {
      setModelProviders([]);
      return;
    }

    ProviderBackend.getProviders("admin").then((res) => {
      if (res.status === "ok") {
        const providers = res.data.filter(provider =>
          provider.category === "Model" && defaultStore.childModelProviders.includes(provider.name)
        );
        setModelProviders(providers);
      }
    });
  }, [defaultStore]);

  const createNewChat = useCallback((baseChat, selectStore = {}) => {
    const randomName = Setting.getRandomName();
    return {
      owner: "admin",
      name: `chat_${randomName}`,
      store: selectStore?.name || "",
      createdTime: moment().format(),
      updatedTime: moment().format(),
      organization: account.owner,
      displayName: `${i18next.t("chat:New Chat")} - ${randomName}`,
      type: "AI",
      user: account.name,
      category: baseChat?.category || i18next.t("chat:Default Category"),
      user1: "",
      user2: "",
      users: [],
      clientIp: account.createdIp,
      userAgent: account.education,
      messageCount: 0,
      needTitle: true,
      modelProvider: baseChat?.modelProvider || selectStore?.modelProvider || null,
    };
  }, [account]);

  const addChatToBackend = useCallback((chat) => {
    if (!chat?.name || addedChatsRef.current.has(chat.name)) {return;}

    addedChatsRef.current.add(chat.name);
    ChatBackend.addChat(chat).catch(error => {
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }, []);

  const setLoadingForPane = useCallback((paneIndex, loading) => {
    loading ? loadingStateRef.current.add(paneIndex) : loadingStateRef.current.delete(paneIndex);
    onSetMessageLoading?.(loadingStateRef.current.size > 0);
  }, [onSetMessageLoading]);

  const getMessages = useCallback((paneIndex, chat) => {
    if (!chat) {return;}

    MessageBackend.getChatMessages("admin", chat.name).then((res) => {
      res.data.forEach(message => {
        message.html = renderText(message.text);
      });

      setPanes(prev => prev.map((pane, i) =>
        i === paneIndex ? {...pane, messages: res.data} : pane
      ));

      const lastMessage = res.data[res.data.length - 1];
      if (lastMessage?.author === "AI" && lastMessage.replyTo && !lastMessage.text) {
        handleAIResponse(paneIndex, chat, res.data, lastMessage);
      }
    });
  }, []);

  const handleAIResponse = useCallback((paneIndex, chat, messages, lastMessage) => {
    let text = "", reasonText = "";
    const toolCalls = [];
    setLoadingForPane(paneIndex, true);

    if (lastMessage.errorText) {
      setLoadingForPane(paneIndex, false);
      return;
    }

    const messageCarrier = new MessageCarrier(chat.needTitle);

    MessageBackend.getMessageAnswer(
      lastMessage.owner,
      lastMessage.name,
      (data) => {
        const jsonData = JSON.parse(data);
        if (!jsonData.text) {jsonData.text = "\n";}

        const lastMessage2 = Setting.deepCopy(lastMessage);
        text += jsonData.text;
        const parsedResult = messageCarrier.parseAnswerWithCarriers(text);

        if (parsedResult.title) {
          const updatedChat = {...chat, displayName: parsedResult.title, needTitle: false};
          setPanes(prev => prev.map((pane, i) =>
            i === paneIndex ? {...pane, chat: updatedChat} : pane
          ));
        }

        lastMessage2.text = parsedResult.finalAnswer;
        if (reasonText) {
          lastMessage2.reasonText = reasonText;
        }
        if (toolCalls.length > 0) {
          lastMessage2.toolCalls = toolCalls;
        }
        messages[messages.length - 1] = lastMessage2;
        messages.forEach(msg => msg.html = renderText(msg.text));

        setPanes(prev => prev.map((pane, i) =>
          i === paneIndex ? {...pane, messages: [...messages]} : pane
        ));
      },
      (data) => {
        const jsonData = JSON.parse(data);
        if (!jsonData.text) {jsonData.text = "\n";}

        reasonText += jsonData.text;
        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.reasonText = reasonText;
        lastMessage2.isReasoningPhase = true;
        lastMessage2.text = "";

        messages[messages.length - 1] = lastMessage2;
        setPanes(prev => prev.map((pane, i) =>
          i === paneIndex ? {...pane, messages: [...messages]} : pane
        ));
      },
      (data) => {
        const jsonData = JSON.parse(data);

        toolCalls.push({
          name: jsonData.name,
          arguments: jsonData.arguments,
          content: jsonData.content,
        });

        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.toolCalls = toolCalls;

        messages[messages.length - 1] = lastMessage2;
        setPanes(prev => prev.map((pane, i) =>
          i === paneIndex ? {...pane, messages: [...messages]} : pane
        ));
      },
      (data) => {
        const searchResults = JSON.parse(data);

        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.searchResults = searchResults;

        messages[messages.length - 1] = lastMessage2;
        setPanes(prev => prev.map((pane, i) =>
          i === paneIndex ? {...pane, messages: [...messages]} : pane
        ));
      },
      (data) => {
        const vectorScores = JSON.parse(data);

        const lastMessage2 = Setting.deepCopy(lastMessage);
        lastMessage2.vectorScores = vectorScores;

        messages[messages.length - 1] = lastMessage2;
        setPanes(prev => prev.map((pane, i) =>
          i === paneIndex ? {...pane, messages: [...messages]} : pane
        ));
      },
      (error) => {
        Setting.showMessage("error", Setting.getRefinedErrorText(error));
        const errorMessage = Setting.deepCopy(lastMessage);
        errorMessage.errorText = error;
        messages[messages.length - 1] = errorMessage;
        messages.forEach(msg => msg.html = renderText(msg.text));

        setPanes(prev => prev.map((pane, i) =>
          i === paneIndex ? {...pane, messages: [...messages]} : pane
        ));
        setLoadingForPane(paneIndex, false);
      },
      () => {
        const finalMessage = Setting.deepCopy(lastMessage);
        finalMessage.text = text;
        finalMessage.isReasoningPhase = false;

        if (reasonText) {
          finalMessage.reasonText = reasonText;
        }

        if (toolCalls.length > 0) {
          finalMessage.toolCalls = toolCalls;
        }

        if (messages[messages.length - 1].searchResults) {
          finalMessage.searchResults = messages[messages.length - 1].searchResults;
        }

        if (messages[messages.length - 1].vectorScores) {
          finalMessage.vectorScores = messages[messages.length - 1].vectorScores;
        }

        const parsedResult = messageCarrier.parseAnswerWithCarriers(text);
        if (parsedResult.title) {
          const updatedChat = {...chat, displayName: parsedResult.title, needTitle: false};
          setPanes(prev => prev.map((pane, i) =>
            i === paneIndex ? {...pane, chat: updatedChat} : pane
          ));
        }

        finalMessage.text = parsedResult.finalAnswer;
        finalMessage.suggestions = parsedResult.suggestionArray;
        messages[messages.length - 1] = finalMessage;

        messages.forEach(msg => {
          msg.html = renderText(msg.text);
          if (msg.reasonText) {msg.reasonHtml = renderReason(msg.reasonText);}
        });

        setPanes(prev => prev.map((pane, i) =>
          i === paneIndex ? {...pane, messages: [...messages]} : pane
        ));
        setLoadingForPane(paneIndex, false);
      }
    );
  }, [setLoadingForPane]);

  const initializePanes = useCallback(() => {
    if (!initialChat) {return;}

    const isNewChat = !initialChatRef.current || initialChatRef.current.name !== initialChat.name;
    const originalStore = initialChat.store ? stores?.find(s => s.name === initialChat.store) : null;

    const newPanes = [];
    const chatsToAdd = [];

    for (let i = 0; i < paneCount; i++) {
      let paneData = {
        store: originalStore,
        chat: null,
        messages: null,
      };

      // Keep existing pane data if not a new chat
      if (!isNewChat && panes[i]) {
        paneData = {...panes[i]};
      }

      if (i === 0) {
        // First pane uses initialChat directly
        paneData.chat = initialChat;
        if (isNewChat) {addedChatsRef.current.add(initialChat.name);}
      } else if (!isNewChat && panes[i]?.chat) {
        // Keep existing chat
        paneData.chat = panes[i].chat;
      } else {
        // Create new chat for additional panes
        const chat = createNewChat(initialChat, {name: originalStore?.name, modelProvider: originalStore?.modelProvider});
        paneData.chat = chat;
        chatsToAdd.push(chat);
      }

      newPanes[i] = paneData;
    }

    setPanes(newPanes);

    // Add new chats to backend and load messages
    chatsToAdd.forEach(addChatToBackend);

    newPanes.forEach((pane, index) => {
      if (pane.messages === null && pane.chat) {
        getMessages(index, pane.chat);
      }
    });

    if (isNewChat) {
      initialChatRef.current = initialChat;
      const currentChatNames = new Set(newPanes.filter(p => p.chat?.name).map(p => p.chat.name));
      addedChatsRef.current = currentChatNames;
    }
  }, [paneCount, initialChat, stores, panes, createNewChat, addChatToBackend, getMessages]);

  // Initialize panes when dependencies change
  useEffect(() => {
    if (initialChat) {initializePanes();}
  }, [paneCount, initialChat?.name, stores]);

  const updatePaneStore = useCallback((paneIndex, store) => {
    setPanes(prev => prev.map((pane, i) =>
      i === paneIndex ? {...pane, store} : pane
    ));

    const currentChat = panes[paneIndex]?.chat;
    if (currentChat && store && currentChat.store !== store.name) {
      const updatedChat = {...currentChat, store: store.name};
      setPanes(prev => prev.map((pane, i) =>
        i === paneIndex ? {...pane, chat: updatedChat} : pane
      ));

      if (paneIndex === 0) {onChatUpdate?.(updatedChat);}

      ChatBackend.updateChat(updatedChat.owner, updatedChat.name, updatedChat).catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
    }
  }, [panes, onChatUpdate]);

  const updatePaneProvider = useCallback((paneIndex, providerName) => {
    const currentChat = panes[paneIndex]?.chat;
    if (currentChat && currentChat.modelProvider !== providerName) {
      const updatedChat = {...currentChat, modelProvider: providerName};
      setPanes(prev => prev.map((pane, i) =>
        i === paneIndex ? {...pane, chat: updatedChat} : pane
      ));

      if (paneIndex === 0) {onChatUpdate?.(updatedChat);}

      ChatBackend.updateChat(updatedChat.owner, updatedChat.name, updatedChat).catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
    }
  }, [panes, onChatUpdate]);

  const sendMessage = useCallback((paneIndex, text, fileName, isHidden, isRegenerated) => {
    const chat = panes[paneIndex]?.chat;
    if (!chat) {return;}

    const newMessage = {
      owner: "admin",
      name: `message_${Setting.getRandomName()}`,
      createdTime: moment().format(),
      organization: account.owner,
      user: account.name,
      store: chat.store,
      chat: chat.name,
      replyTo: "",
      author: account.name,
      text,
      isHidden,
      isDeleted: false,
      isAlerted: false,
      isRegenerated,
      fileName,
      modelProvider: chat?.modelProvider || panes[paneIndex]?.store?.modelProvider || modelProviders[0]?.name || "",
    };

    MessageBackend.addMessage(newMessage).then((res) => {
      if (res.status === "ok") {
        getMessages(paneIndex, chat);
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
      }
    }).catch(error => {
      Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
    });
  }, [panes, account, getMessages]);

  const handleGlobalInput = useCallback(() => {
    const text = globalInputValue.trim();
    if (!text) {return;}

    panes.forEach((pane, i) => {
      if (pane.chat) {sendMessage(i, text, "", false, false);}
    });

    setGlobalInputValue("");
  }, [globalInputValue, panes, sendMessage]);

  const handleGlobalInputKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGlobalInput();
    }
  }, [handleGlobalInput]);

  const renderPaneHeader = (index) => (
    <div style={{padding: "8px 12px", borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa", fontSize: "12px", display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between"}}>
      <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
        <div style={{display: "flex", alignItems: "center", gap: "6px"}}>
          <Select size="small" style={{minWidth: "100px"}} value={panes[index]?.store?.name || availableStores[0]?.name || ""} onChange={(value) => updatePaneStore(index, availableStores.find(s => s.name === value))} placeholder="Select store">
            {availableStores.map(store => (
              <Select.Option key={store.name} value={store.name}>{store.displayName || store.name}</Select.Option>
            ))}
          </Select>
        </div>

        {modelProviders.length > 0 && (
          <div style={{display: "flex", alignItems: "center", gap: "6px"}}>
            <Select size="small" style={{minWidth: "120px"}} value={panes[index]?.chat?.modelProvider || panes[index]?.store?.modelProvider || modelProviders[0]?.name || ""} onChange={(value) => updatePaneProvider(index, value)} placeholder="Select model" optionLabelProp="children">
              {modelProviders.map(provider => (
                <Select.Option key={provider.name} value={provider.name}>
                  <div style={{display: "flex", alignItems: "center", gap: "6px"}}>
                    <img src={Setting.getProviderLogoURL(provider)} alt={provider.name} style={{width: 16, height: 16}} />
                    <span>{Setting.getProviderDisplayName(provider)}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {index === 0 && canManagePanes && (
        <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
          <span>{i18next.t("chat:Panes")}: {paneCount}</span>
          <Button size="small" icon={<PlusOutlined />} onClick={() => paneCount < 4 && onPaneCountChange?.(paneCount + 1)} />
          <Button size="small" icon={<MinusOutlined />} onClick={() => paneCount > 1 && onPaneCountChange?.(paneCount - 1)} disabled={paneCount <= 1} />
        </div>
      )}
    </div>
  );

  const renderGlobalInput = () => (
    <div style={{padding: "12px 16px", borderTop: "1px solid #f0f0f0", backgroundColor: "#fafafa"}}>
      <div style={{display: "flex", alignItems: "flex-start", gap: "12px"}}>
        <div style={{flex: 1}}>
          <Input.Group compact style={{display: "flex"}}>
            <TextArea ref={globalInputRef} value={globalInputValue} onChange={(e) => setGlobalInputValue(e.target.value)} onPressEnter={handleGlobalInputKeyPress} placeholder="Send message to all panes..." autoSize={{minRows: 1, maxRows: 4}} style={{flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0}} disabled={messageLoading} />
            <Button type="primary" icon={<SendOutlined />} onClick={handleGlobalInput} disabled={messageLoading || !globalInputValue.trim()} style={{borderTopLeftRadius: 0, borderBottomLeftRadius: 0, height: "auto", display: "flex", alignItems: "center"}} />
          </Input.Group>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{flex: 1, height: "100%", position: "relative", display: "flex", flexDirection: "column"}}>
      <div style={{flex: 1, display: "grid", gridTemplateColumns: `repeat(${paneCount}, 1fr)`, gap: "2px", overflow: "hidden"}}>
        {Array.from({length: paneCount}, (_, index) => {
          const pane = panes[index] || {};
          return (
            <div key={index} style={{position: "relative", display: "flex", flexDirection: "column", border: paneCount > 1 ? "1px solid #e8e8e8" : "none", borderRadius: paneCount > 1 ? "4px" : "0"}}>
              {paneCount > 1 && renderPaneHeader(index)}

              {(pane.messages?.length > 0) && (
                <div style={{position: "absolute", top: paneCount > 1 ? 40 : -50, left: 0, right: 0, bottom: 0, backgroundImage: `url(${Conf.StaticBaseUrl}/img/openagent-logo_1600x276.png)`, backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "150px auto", backgroundBlendMode: "luminosity", filter: "grayscale(80%) brightness(140%) contrast(90%)", opacity: 0.3, pointerEvents: "none"}}></div>
              )}

              <div style={{flex: 1}}>
                <ChatBox autoFocusInput={paneCount <= 1} disableInput={false} loading={messageLoading} messages={pane.messages || []} messageError={messageError} sendMessage={(text, fileName, regenerate = false) => sendMessage(index, text, fileName, false, regenerate)} onMessageEdit={() => getMessages(index, pane.chat)} onCancelMessage={onCancelMessage} account={account} name={pane.chat?.name} displayName={pane.chat?.displayName} store={pane.store || defaultStore} />
              </div>
            </div>
          );
        })}
      </div>

      {paneCount > 1 && renderGlobalInput()}
    </div>
  );
};

export default MultiPaneManager;
