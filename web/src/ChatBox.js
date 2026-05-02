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
import {Card, Layout} from "antd";
import * as Setting from "./Setting";
import i18next from "i18next";
import copy from "copy-to-clipboard";
import moment from "moment";
import ChatExampleQuestions from "./ChatExampleQuestions";
import MessageList from "./chat/MessageList";
import ChatInput from "./chat/ChatInput";
import WelcomeHeader from "./chat/WelcomeHeader";
import * as MessageBackend from "./backend/MessageBackend";
import TtsHelper from "./TextToSpeech";
import SpeechToTextHelper from "./SpeechToText";

// Store the input value when the name(chat) leaves
const inputStore = new Map();

class ChatBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: "",
      files: [],
      messages: this.props.messages,
      currentReadingMessage: null,
      isReading: false,
      isLoadingTTS: false,
      isVoiceInput: false,
      rerenderErrorMessage: false,
      webSearchEnabled: false,
    };
    this.synth = window.speechSynthesis;
    this.cursorPosition = undefined;
    this.copyFileName = null;
    this.messageListRef = React.createRef();
    this.inputRef = React.createRef();
    this.ttsHelper = new TtsHelper(this);
    this.sttHelper = new SpeechToTextHelper(this);
  }

  setWebSearchEnabled = (enabled) => {
    this.setState({webSearchEnabled: enabled});
  };

  focusInput() {
    this.inputRef.current?.focus();
  }

  scheduleFocusInput() {
    if (this.props.disableInput || this.props.autoFocusInput === false) {
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.focusInput();
      });
    });
  }

  componentDidMount() {
    window.addEventListener("beforeunload", () => {
      this.synth.cancel();
    });
    this.addCursorPositionListener();
    this.scheduleFocusInput();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // clear old status when the name(chat) changes
    if (prevProps.name !== this.props.name) {
      inputStore.set(prevProps.name, this.state.value);
      this.clearOldStatus();
    }
    if (inputStore.has(this.props.name)) {
      this.setState({value: inputStore.get(this.props.name)});
      inputStore.delete(this.props.name);
    }
    if (prevProps.messages?.length !== this.props.messages?.length) {
      this.setState({messages: this.props.messages});
      this.scrollToBottom();
    }
    if (prevProps.name !== this.props.name) {
      this.scheduleFocusInput();
    }
  }

  componentWillUnmount() {
    inputStore.set(this.props.name, this.state.value);
    this.clearOldStatus();
  }

  clearOldStatus() {
    this.sttHelper.cleanup();
    this.ttsHelper.cleanup();
    this.setState({
      value: "",
      files: [],
      messages: this.props.messages,
      currentReadingMessage: null,
      isReading: false,
      isLoadingTTS: false,
      isVoiceInput: false,
    });
    this.cursorPosition = undefined;
  }

  addCursorPositionListener() {
    const inputElement = document.querySelector(".cs-message-input__content-editor");
    const updateCursorPosition = () => {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(inputElement);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        this.cursorPosition = preSelectionRange.toString().length;
        if (this.state.isVoiceInput) {
          this.sttHelper.stopRecognition();
        }
      }
    };

    inputElement?.addEventListener("keyup", updateCursorPosition);
    inputElement?.addEventListener("click", updateCursorPosition);
  }

  handleSend = (innerHtml, webSearchEnabled = false) => {
    // abort because the remaining recognition results are useless
    this.sttHelper.stopRecognition();

    let newValue = this.state.value;

    this.state.files.forEach(uploadedFile => {
      newValue = uploadedFile.value + "\n" + newValue;
    });

    if (newValue === "" || this.props.disableInput) {
      return;
    }

    const date = moment();
    const dateString = date.format("YYYYMMDD_HHmmss");

    let fileName = "";
    if (this.state.files[0]) {
      fileName = this.state.files[0].file.name;
    } else if (this.copyFileName) {
      const fileExtension = this.copyFileName.match(/\..+$/)[0];
      fileName = dateString + fileExtension;
      this.copyFileName = null;
    }

    this.props.sendMessage(newValue, fileName, false, false, webSearchEnabled);
    this.setState({value: "", files: []});
  };

  handleRegenerate = (index) => {
    // can only regenerate after sending the message
    const messages = this.state.messages || [];
    const message = [...messages].reverse().find(message => message.author !== "AI");

    this.handleEditMessage({...message, text: message.text, updatedTime: new Date().toISOString()}, true);
  };

  copyMessageFromHTML(message) {
    const parts = [];

    if (message.toolCalls && message.toolCalls.length > 0) {
      message.toolCalls.forEach((toolCall) => {
        let part = `Tool calls (1)\n${toolCall.name}`;
        if (toolCall.arguments) {
          try {
            part += `\nArguments:\n${JSON.stringify(JSON.parse(toolCall.arguments), null, 2)}`;
          } catch {
            part += `\nArguments:\n${toolCall.arguments}`;
          }
        }
        if (toolCall.content) {
          try {
            part += `\nResult:\n${JSON.stringify(JSON.parse(toolCall.content), null, 2)}`;
          } catch {
            part += `\nResult:\n${toolCall.content}`;
          }
        }
        parts.push(part);
      });
    }

    const tempElement = document.createElement("div");
    tempElement.innerHTML = message.text || message;
    const text = tempElement.innerText;
    if (text) {
      parts.push(text);
    }

    copy(parts.join("\n\n"));
    Setting.showMessage("success", i18next.t("general:Successfully copied"));
  }

  handleMessageLike = (message, reactionType) => {
    const oppositeReaction = reactionType === "like" ? "dislike" : "like";
    const isCancel = !!message[`${reactionType}Users`]?.includes(this.props.account.name);

    if (isCancel) {
      message[`${reactionType}Users`] = Setting.deleteElementFromSet(message[`${reactionType}Users`], this.props.account.name);
    } else {
      message[`${reactionType}Users`] = Setting.addElementToSet(message[`${reactionType}Users`], this.props.account.name);
    }

    message[`${oppositeReaction}Users`] = Setting.deleteElementFromSet(message[`${oppositeReaction}Users`], this.props.account.name);

    this.setState({messages: this.state.messages.map(m => m.name === message.name ? message : m)});
    MessageBackend.updateMessage(message.owner, message.name, message).then((result) => {
      if (result.status === "ok") {
        if (reactionType === "like") {
          if (isCancel) {
            Setting.showMessage("success", i18next.t("general:Successfully unliked"));
          } else {
            Setting.showMessage("success", i18next.t("general:Successfully liked"));
          }
        } else {
          if (isCancel) {
            Setting.showMessage("success", i18next.t("general:Successfully undisliked"));
          } else {
            Setting.showMessage("success", i18next.t("general:Successfully disliked"));
          }
        }
      } else {
        Setting.showMessage("error", result.msg);
      }
    });
  };

  toggleMessageReadState = (message) => {
    const shouldPause = (this.state.readingMessage === message.name && this.state.isReading);
    if (shouldPause) {
      this.ttsHelper.pauseReading();
      return;
    }

    if (this.state.readingMessage === message.name && this.state.isReading === false) {
      this.ttsHelper.resumeReading();
      return;
    }

    this.ttsHelper.readMessage(message, this.props.store);
  };

  // Updated startVoiceInput method for ChatBox component
  startVoiceInput = () => {
    this.setState({isVoiceInput: true});

    // Check if using browser builtin or cloud provider
    const providerValue = this.props.store?.speechToTextProvider || "";
    const useCloudProvider = providerValue !== "" && providerValue !== "Browser Built-In";

    if (useCloudProvider) {
      this.sttHelper.startRecording()
        .catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to start recording")}: ${error.message}`);
          this.setState({isVoiceInput: false});
        });
    } else {
      // Using browser builtin recognition
      const recognition = this.sttHelper.initBrowserRecognition(this.processVoiceResult());

      if (!recognition) {
        Setting.showMessage("error", i18next.t("chat:Speech recognition not supported in this browser"));
        this.setState({isVoiceInput: false});
      }
    }
  };

  // Updated stopVoiceInput method for ChatBox component
  stopVoiceInput = () => {
    const providerValue = this.props.store?.speechToTextProvider || "";
    const useCloudProvider = providerValue !== "" && providerValue !== "Browser Built-In";

    if (useCloudProvider) {
      if (this.sttHelper.stopRecording()) {
        const audioBlob = new Blob(this.sttHelper.audioChunks, {type: "audio/webm"});
        this.sttHelper.processAudioFile(audioBlob, this.props.store, this.processVoiceResult(true));
      }
    } else {
      this.sttHelper.stopRecognition();

      setTimeout(() => {
        // Send the message after speech recognition is complete
        if (this.state.value && this.state.value.trim() !== "") {
          this.handleSend();
        }
      }, 300);
    }

    this.setState({isVoiceInput: false});
  };

  // Updated to handle both updating UI and to know when to send
  processVoiceResult = (shouldSendAfterProcessing = false) => {
    return (event) => {
      const transcript = Array.from(event?.results)?.map((result) => result[0].transcript).join(" ");

      if (!transcript || transcript.trim() === "") {
        return; // Skip empty transcripts
      }

      // Update the input field with the transcript
      if (this.cursorPosition === undefined) {
        this.setState({value: transcript}, () => {
          if (shouldSendAfterProcessing && this.state.value && this.state.value.trim() !== "") {
            this.handleSend();
          }
        });
      } else {
        const oldValue = this.state.value || "";
        const newValue = oldValue.slice(0, this.cursorPosition) + transcript + oldValue.slice(this.cursorPosition);
        this.setState({value: newValue}, () => {
          if (shouldSendAfterProcessing && this.state.value && this.state.value.trim() !== "") {
            this.handleSend();
          }
        });
      }
    };
  };

  scrollToBottom = () => {
    if (this.messageListRef.current) {
      const scrollElement = this.messageListRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  };

  handleEditMessage = (message, silent = false) => {
    const editedMessage = {
      ...message,
      createdTime: moment().format(),
      store: this.props.store?.name,
      webSearchEnabled: this.state.webSearchEnabled,
      modelProvider: this.props.chat?.modelProvider || this.props.store?.modelProvider,
    };
    MessageBackend.addMessage(editedMessage)
      .then((res) => {
        if (res.status === "ok") {
          const chat = res.data;

          if (this.props.onMessageEdit) {
            this.props.onMessageEdit(chat.name);
          }

          if (!silent) {
            Setting.showMessage("success", i18next.t("general:Successfully saved"));
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to connect to server")}: ${error}`);
      });
  };

  render() {
    let messages = this.props.messages;
    if (messages === null) {
      messages = [];
    }

    let exampleQuestions = this.props.store?.exampleQuestions;
    if (!exampleQuestions) {
      exampleQuestions = [];
    }

    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlMessage = urlParams.get("newMessage");

    return (
      <Layout style={{display: "flex", width: "100%", height: "100%", borderRadius: "6px", ...this.props.styles?.layout}}>
        <Card variant="borderless" style={{display: "flex", width: "100%", height: "100%", flexDirection: "column", position: "relative", padding: "0", boxShadow: "none", ...this.props.styles?.card}}>
          {messages.length === 0 && !hasUrlMessage && <WelcomeHeader store={this.props.store} />}

          <MessageList
            ref={this.messageListRef}
            messages={messages}
            account={this.props.account}
            store={this.props.store}
            onRegenerate={this.handleRegenerate}
            onMessageLike={this.handleMessageLike}
            onCopyMessage={this.copyMessageFromHTML}
            onToggleRead={this.toggleMessageReadState}
            onEditMessage={this.handleEditMessage}
            hideInput={this.props.hideInput}
            disableInput={this.props.disableInput}
            isReading={this.state.isReading}
            isLoadingTTS={this.state.isLoadingTTS}
            readingMessage={this.state.readingMessage}
            sendMessage={(text, fileName = "") => this.props.sendMessage(text, fileName, false, false, this.state.webSearchEnabled)}
            files={this.state.files}
            hideThinking={this.props.store?.hideThinking === true}
          />

          {!this.props.disableInput && (
            <ChatInput
              ref={this.inputRef}
              value={this.state.value}
              store={this.props.store}
              chat={this.props.chat}
              files={this.state.files}
              onFileChange={(files) => this.setState({files})}
              onChange={(value) => this.setState({value})}
              onSend={this.handleSend}
              loading={this.props.loading}
              disableInput={this.props.disableInput}
              messageError={this.props.messageError}
              onCancelMessage={this.props.onCancelMessage}
              onVoiceInputStart={this.startVoiceInput}
              onVoiceInputEnd={this.stopVoiceInput}
              isVoiceInput={this.state.isVoiceInput}
              webSearchEnabled={this.state.webSearchEnabled}
              onWebSearchChange={this.setWebSearchEnabled}
            />
          )}
        </Card>

        {messages.length === 0 ? (
          <ChatExampleQuestions
            sendMessage={(text, fileName = "") => this.props.sendMessage(text, fileName, false, false, this.state.webSearchEnabled)}
            exampleQuestions={exampleQuestions}
          />
        ) : null}
      </Layout>
    );
  }
}

export default ChatBox;
