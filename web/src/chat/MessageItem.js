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

import React, {useEffect, useState} from "react";
import {Bubble} from "@ant-design/x";
import {Alert, Avatar, Button, Col, Collapse, Row, Space} from "antd";
import {FileTextOutlined, GlobalOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "../Setting";
import i18next from "i18next";
import {AvatarErrorUrl} from "../Conf";
import {renderText} from "../ChatMessageRender";
import MessageActions, {CopyButton} from "./MessageActions";
import MessageSuggestions from "./MessageSuggestions";
import MessageEdit from "./MessageEdit";
import {MessageCarrier} from "./MessageCarrier";
import SearchSourcesDrawer from "./SearchSourcesDrawer";
import KnowledgeSourcesDrawer from "./KnowledgeSourcesDrawer";
import ToolCallSection from "./ToolCallSection";

const {Panel} = Collapse;

const MessageItem = ({
  message,
  index,
  isLastMessage,
  account,
  avatar,
  onCopy,
  onRegenerate,
  onLike,
  onToggleRead,
  onEditMessage,
  disableInput,
  isReading,
  isLoadingTTS, // Added new prop for TTS loading state
  readingMessage,
  sendMessage,
  hideThinking,
}) => {
  const [avatarSrc, setAvatarSrc] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [reasonExpanded, setReasonExpanded] = useState(["reason"]);
  const [searchDrawerVisible, setSearchDrawerVisible] = useState(false);
  const [knowledgeDrawerVisible, setKnowledgeDrawerVisible] = useState(false);
  const themeColor = Setting.getThemeColor();

  const isDark = Setting.getIsDark();

  const aiBubbleBg = isDark ? "#2a2d35" : "#f4f6fa";
  const aiBubbleBorder = isDark ? "1px solid #383d47" : "1px solid #eaedf3";

  const renderThinkingAnimation = () => {
    return (
      <div className="message-thinking" style={{
        padding: "10px",
        borderRadius: "5px",
        display: "flex",
        alignItems: "center",
      }}>
        <div style={{
          fontWeight: "bold",
          color: themeColor,
        }}>
          {i18next.t("chat:Thinking")}
        </div>
        <div className="thinking-animation" style={{
          marginLeft: "8px",
          display: "flex",
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: "6px",
              height: "6px",
              backgroundColor: themeColor,
              borderRadius: "50%",
              margin: "0 2px",
              animation: "thinkingDot 1.4s infinite ease-in-out both",
              animationDelay: i * 0.16 + "s",
            }} />
          ))}
        </div>
        <style>{`
          @keyframes thinkingDot {
            0%, 80%, 100% {
              transform: scale(0);
            }
            40% {
              transform: scale(1.0);
            }
          }
        `}</style>
      </div>
    );
  };

  const {isEditing,
    isHovering,
    setIsHovering,
    renderEditForm,
    renderEditButton,
    handleMouseEnter,
    handleMouseLeave,
  } = MessageEdit({
    message,
    isLastMessage,
    disableInput,
    index,
    onEditMessage,
  });

  useEffect(() => {
    // Set the initial avatar source
    setAvatarSrc(message.author === "AI" ? avatar : Setting.getUserAvatar(message, account));
  }, [message.author, avatar, account, message]);

  const handleAvatarError = () => {
    // Set fallback URL when avatar fails to load
    setAvatarSrc(AvatarErrorUrl);
  };

  const renderMessageContent = () => {
    if (isEditing && message.author !== "AI") {
      return renderEditForm();
    }

    if (message.errorText !== "") {
      const regenerateButton = (
        <Button
          danger
          type="primary"
          onClick={() => {
            setIsRegenerating(true);
            onRegenerate(index);
          }}
          disabled={isRegenerating}
        >
          {isRegenerating
            ? i18next.t("general:Regenerating...")
            : i18next.t("general:Regenerate")}
        </Button>
      );
      return Setting.isMobile() ? (
        <div>
          <Alert
            message={Setting.getRefinedErrorText(message.errorText)}
            description={message.errorText}
            type="error"
            showIcon
            style={{whiteSpace: "normal", wordWrap: "break-word"}}
          />
          <Row justify="center" style={{marginTop: 16}}>
            <Col>{regenerateButton}</Col>
          </Row>
        </div>
      ) : (
        <Alert
          message={Setting.getRefinedErrorText(message.errorText)}
          description={message.errorText}
          type="error"
          showIcon
          action={<div style={{marginLeft: 16}}>{regenerateButton}</div>}
        />
      );
    }

    if (message.text === "" && message.author === "AI" && !message.reasonText && (!message.toolCalls || message.toolCalls.length === 0)) {
      return null;
    }

    if (message.isReasoningPhase && message.author === "AI" && !message.toolCalls && !message.text) {
      return null;
    }

    if ((message.reasonText || message.toolCalls) && message.author === "AI") {
      return (
        <div className="message-content">
          {!hideThinking && message.reasonText && (
            <div className="message-reason" style={{marginBottom: "15px"}}>
              <Collapse
                ghost
                activeKey={reasonExpanded}
                onChange={setReasonExpanded}
                style={{
                  borderLeft: `3px solid ${themeColor}`,
                  borderRadius: "5px",
                  padding: "10px",
                }}
              >
                <Panel
                  header={
                    <span style={{fontWeight: "bold", color: themeColor}}>
                      {i18next.t("chat:Reasoning process")}
                    </span>
                  }
                  key="reason"
                  className="chat-message-collapse-panel"
                >
                  <div className="reason-content">
                    {renderText(message.reasonText)}
                  </div>
                </Panel>
              </Collapse>
            </div>
          )}
          <ToolCallSection
            toolCalls={message.toolCalls}
            isDark={isDark}
            themeColor={themeColor}
          />

          <div className="message-answer">
            {message.html || renderText(message.text)}
          </div>
        </div>
      );
    }

    if (isLastMessage && message.author === "AI" && message.TokenCount === 0) {
      const mssageCarrier = new MessageCarrier(false); // we only use final answer blow so no need to parse title
      return renderText(mssageCarrier.parseAnswerWithCarriers(message.text).finalAnswer);
    }

    return message.html;
  };

  const renderReasoningBubble = () => {
    if (message.isReasoningPhase && message.author === "AI" && message.reasonText) {
      return (
        <div style={{marginBottom: "8px"}}>
          <Bubble
            placement="start"
            content={
              hideThinking ? renderThinkingAnimation() : (
                <div className="message-reason">
                  <Collapse
                    ghost
                    activeKey={reasonExpanded}
                    onChange={setReasonExpanded}
                    style={{
                      borderLeft: `3px solid ${themeColor}`,
                      borderRadius: "5px",
                      padding: "10px",
                    }}
                  >
                    <Panel
                      header={
                        <span style={{fontWeight: "bold", color: themeColor}}>
                          {i18next.t("chat:Reasoning process")}
                        </span>
                      }
                      key="reason"
                      className="chat-message-collapse-panel"
                    >
                      <div className="reason-content">
                        {renderText(message.reasonText)}
                      </div>
                    </Panel>
                  </Collapse>
                </div>
              )
            }
            typing={!hideThinking ? {
              step: 2,
              interval: 50,
            } : undefined}
            avatar={<Avatar src={avatarSrc} onError={handleAvatarError} />}
            styles={{
              content: {
                borderRadius: "4px 18px 18px 18px",
                padding: "11px 16px",
                backgroundColor: aiBubbleBg,
                border: aiBubbleBorder,
              },
            }}
          />
        </div>
      );
    }
    return null;
  };

  const renderMessageBubble = () => {
    if (message.isReasoningPhase && message.author === "AI") {
      return null;
    }

    const isUserMessage = message.author !== "AI";

    return (
      <div style={{
        display: "flex",
        justifyContent: isUserMessage ? "flex-end" : "flex-start",
        alignItems: "center",
        position: "relative",
      }}>
        {isUserMessage && !isEditing && (
          <Space size="small" style={{opacity: isHovering ? 0.8 : 0, transition: "opacity 0.2s ease-in-out"}}>
            <CopyButton message={message} onCopy={onCopy} />
            {renderEditButton()}
          </Space>
        )}

        <Bubble
          placement={isUserMessage ? "end" : "start"}
          content={
            <div style={{position: "relative", width: "100%"}} className={isUserMessage ? "user-message-content" : ""}>
              {renderMessageContent()}
            </div>
          }
          footer={
            <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
              {!isEditing && message.author === "AI" && (disableInput === false || index !== isLastMessage) && (
                <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                  <MessageActions
                    message={message}
                    isLastMessage={isLastMessage}
                    index={index}
                    onCopy={onCopy}
                    onRegenerate={onRegenerate}
                    onLike={onLike}
                    onToggleRead={onToggleRead}
                    onEdit={() => setIsHovering(true)}
                    isReading={isReading}
                    isLoadingTTS={isLoadingTTS} // Pass loading state to MessageActions
                    readingMessage={readingMessage}
                    account={account}
                    setIsRegenerating={setIsRegenerating}
                    isRegenerating={isRegenerating}
                  />
                  {message.searchResults?.length > 0 && (
                    <Button
                      type="text"
                      size="small"
                      icon={<GlobalOutlined />}
                      onClick={() => setSearchDrawerVisible(true)}
                      style={{
                        fontSize: "12px",
                        color: themeColor,
                        padding: "0 8px",
                        height: "24px",
                      }}
                    >
                      {message.searchResults.length} {i18next.t("chat:Web sources")}
                    </Button>
                  )}
                  {message.vectorScores?.length > 0 && (
                    <Button
                      type="text"
                      size="small"
                      icon={<FileTextOutlined />}
                      onClick={() => setKnowledgeDrawerVisible(true)}
                      style={{
                        fontSize: "12px",
                        color: themeColor,
                        padding: "0 8px",
                        height: "24px",
                      }}
                    >
                      {message.vectorScores.length} {i18next.t("chat:Knowledge sources")}
                    </Button>
                  )}
                </div>
              )}
              {message.author === "AI" && isLastMessage && (
                <MessageSuggestions message={message} sendMessage={sendMessage} />
              )}
            </div>
          }
          loading={message.text === "" && message.author === "AI" && !message.reasonText && !message.errorText && (!message.toolCalls || message.toolCalls.length === 0)}
          typing={message.author === "AI" && !message.isReasoningPhase ? {
            step: 2,
            interval: 50,
          } : undefined}
          avatar={<Avatar src={avatarSrc} onError={handleAvatarError} />}
          styles={{
            content: isUserMessage ? {
              borderRadius: "18px 18px 4px 18px",
              padding: "11px 16px",
              backgroundColor: themeColor,
              color: "#fff",
              minWidth: isEditing ? "300px" : "auto",
            } : {
              borderRadius: "4px 18px 18px 18px",
              padding: "11px 16px",
              backgroundColor: aiBubbleBg,
              border: aiBubbleBorder,
              minWidth: isEditing ? "300px" : "auto",
            },
          }}
        />
      </div>
    );
  };

  return (
    <>
      <div
        style={{
          maxWidth: "90%",
          margin: message.author === "AI" ? "0 auto 0 0" : "0 0 0 auto",
          position: "relative",
          marginBottom: "4px",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{
          textAlign: message.author === "AI" ? "left" : "right",
          color: isDark ? "#4b5563" : "#c0c4cc",
          fontSize: "11px",
          marginBottom: "6px",
          padding: "0 14px",
          letterSpacing: "0.2px",
        }}>
          {moment(message.createdTime).format("HH:mm")}
        </div>

        {renderReasoningBubble()}

        {renderMessageBubble()}
      </div>

      <SearchSourcesDrawer
        visible={searchDrawerVisible}
        onClose={() => setSearchDrawerVisible(false)}
        searchResults={message.searchResults}
      />

      <KnowledgeSourcesDrawer
        visible={knowledgeDrawerVisible}
        onClose={() => setKnowledgeDrawerVisible(false)}
        vectorScores={message.vectorScores}
        account={account}
      />
    </>
  );
};

export default MessageItem;
