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

import React, {useEffect, useMemo, useState} from "react";
import {useHistory} from "react-router-dom";
import {Bubble} from "@ant-design/x";
import {Alert, Avatar, Button, Space} from "antd";
import {FileTextOutlined, GlobalOutlined, InfoCircleOutlined} from "@ant-design/icons";
import moment from "moment";
import * as Setting from "../Setting";
import i18next from "i18next";
import {renderText} from "../ChatMessageRender";
import MessageActions, {CopyButton} from "./MessageActions";
import MessageSuggestions from "./MessageSuggestions";
import MessageEdit from "./MessageEdit";
import {MessageCarrier} from "./MessageCarrier";
import SearchSourcesDrawer from "./SearchSourcesDrawer";
import KnowledgeSourcesDrawer from "./KnowledgeSourcesDrawer";
import ToolCallSection from "./ToolCallSection";
import ReasoningSection from "./ReasoningSection";
import StatusStrip from "./StatusStrip";
import GeneratedResourceList, {extractGeneratedResources} from "./GeneratedResourceList";
import UserLabel from "../common/UserLabel";

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
  hideInput,
  isReading,
  isLoadingTTS,
  readingMessage,
  sendMessage,
  hideThinking,
  isGenerating,
}) => {
  const history = useHistory();
  const [avatarSrc, setAvatarSrc] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [searchDrawerVisible, setSearchDrawerVisible] = useState(false);
  const [knowledgeDrawerVisible, setKnowledgeDrawerVisible] = useState(false);
  const themeColor = Setting.getThemeColor();

  const mergedSearchResults = useMemo(() => {
    const merged = [...(message.searchResults || [])];
    if (message.toolCalls) {
      message.toolCalls
        .filter(tc => tc.name === "web_fetch" && tc.content)
        .forEach(tc => {
          let purpose = "";
          let url = "";
          try {
            const args = JSON.parse(tc.arguments);
            url = args.url || "";
            purpose = args.purpose || "";
          } catch (e) {url = "";}
          if (!url) {return;}
          if (purpose === "get_list") {return;}

          let title = "";
          if (tc.content) {
            try {
              const content = JSON.parse(tc.content);
              const lines = content[0]["text"].split("\n");
              const titleLine = lines.find(line => line.includes("Title:"));
              title = titleLine ? titleLine.replace("Title:", "").trim() : "";
            } catch (e) {title = "";}
          }
          if (!title) {title = url;}

          merged.push({
            url,
            title,
            site_name: (() => {try {return new URL(url).hostname;} catch (e) {return "";}})(),
            icon: null,
            index: merged.length + 1,
          });
        });
    }
    return merged;
  }, [message.searchResults, message.toolCalls]);

  const generatedResources = useMemo(() => extractGeneratedResources(message.toolCalls), [message.toolCalls]);

  const isDark = Setting.getIsDark();

  const aiBubbleBg = isDark ? "#2a2d35" : "#f4f6fa";
  const aiBubbleBorder = isDark ? "1px solid #383d47" : "1px solid #eaedf3";

  const renderThinkingAnimation = (label) => {
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
          {label || i18next.t("chat:Thinking")}
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
    hideInput,
    index,
    onEditMessage,
    isDark,
  });

  useEffect(() => {
    // Set the initial avatar source
    setAvatarSrc(message.author === "AI" ? avatar : Setting.getUserAvatar(message, account));
  }, [message.author, avatar, account, message]);

  const handleAvatarError = () => {
    setAvatarSrc(Setting.getAvatarFallback());
  };

  // AI messages keep the plain avatar; human messages wrap the same avatar in a
  // UserLabel so hovering shows the sender's profile card and clicking opens
  // their Casdoor profile page. message.author is the sender's username here.
  const renderAvatarNode = () => {
    const avatarEl = <Avatar src={avatarSrc} onError={handleAvatarError} />;
    if (message.author === "AI") {
      return avatarEl;
    }
    const isSelf = account && message.author === account.name;
    return (
      <UserLabel
        user={message.author}
        account={account}
        displayName={isSelf ? account.displayName : undefined}
        avatar={isSelf ? account.avatar : undefined}
      >
        {avatarEl}
      </UserLabel>
    );
  };

  const renderMessageContent = () => {
    if (message.errorText !== "") {
      const isNoModelProvider = message.errorText.includes("Please add a model provider first") || message.errorText.includes("请先添加模型提供商");
      if (isNoModelProvider) {
        return (
          <Alert
            type="warning"
            showIcon
            style={{borderRadius: 8, fontSize: 12, padding: "6px 12px"}}
            message={
              <span>
                {Setting.getRefinedErrorText(message.errorText)}
                {" "}
                <Button
                  type="link"
                  size="small"
                  style={{padding: 0, fontWeight: 600, fontSize: 12, height: "auto"}}
                  onClick={() => history.push("/quick-setup")}
                >
                  {i18next.t("chat:No model provider - action")} →
                </Button>
              </span>
            }
          />
        );
      }
      return (
        <Alert
          type="warning"
          showIcon
          style={{borderRadius: 8, fontSize: 12, padding: "6px 12px"}}
          message={
            <span style={{fontFamily: "monospace", fontSize: 12, wordBreak: "break-all"}}>
              {Setting.getRefinedErrorText(message.errorText)}
              {!hideInput && (
                <Button
                  size="small"
                  type="link"
                  style={{padding: "0 0 0 8px", fontWeight: 600, fontSize: 12, height: "auto"}}
                  onClick={() => {
                    setIsRegenerating(true);
                    onRegenerate(index);
                  }}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? i18next.t("general:Regenerating...") : i18next.t("general:Regenerate")} →
                </Button>
              )}
            </span>
          }
        />
      );
    }

    if (message.text === "" && message.author === "AI" && !message.reasonText && (!message.toolCalls || message.toolCalls.length === 0)) {
      // The status strip above already shows a spinner + status text while the
      // generation is active; skip the bouncing-dot animation to avoid two
      // competing "working" indicators on the same bubble.
      if (isGenerating && isLastMessage && !message.errorText) {
        return null;
      }
      return renderThinkingAnimation(message.statusText);
    }

    if (message.isReasoningPhase && message.author === "AI" && !message.toolCalls && !message.text) {
      return null;
    }

    if ((message.reasonText || message.toolCalls) && message.author === "AI") {
      const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
      const shouldRenderInlineReason = (!message.isReasoningPhase || hasToolCalls) && !hideThinking && message.reasonText;

      return (
        <div className="message-content">
          {shouldRenderInlineReason && (
            <ReasoningSection
              reasonText={message.reasonText}
              isReasoningPhase={message.isReasoningPhase}
              isDark={isDark}
              themeColor={themeColor}
            />
          )}
          <ToolCallSection
            toolCalls={message.toolCalls}
            isDark={isDark}
            themeColor={themeColor}
          />

          <div className="message-answer">
            <GeneratedResourceList resources={generatedResources} />
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
    if (message.isReasoningPhase && message.author === "AI" && message.reasonText && (!message.toolCalls || message.toolCalls.length === 0)) {
      return (
        <div style={{marginBottom: "8px"}}>
          <Bubble
            placement="start"
            content={
              hideThinking ? renderThinkingAnimation() : (
                <ReasoningSection
                  reasonText={message.reasonText}
                  isReasoningPhase={message.isReasoningPhase}
                  isDark={isDark}
                  themeColor={themeColor}
                />
              )
            }
            typing={!hideThinking ? {
              step: 2,
              interval: 50,
            } : undefined}
            avatar={renderAvatarNode()}
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
    if (message.isReasoningPhase && message.author === "AI" && (!message.toolCalls || message.toolCalls.length === 0) && !message.text) {
      return null;
    }

    const isUserMessage = message.author !== "AI";

    if (isEditing && isUserMessage) {
      return renderEditForm();
    }

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
            {!hideInput && renderEditButton()}
          </Space>
        )}

        <Bubble
          placement={isUserMessage ? "end" : "start"}
          content={
            <div style={{position: "relative", width: "100%"}} className={isUserMessage ? "user-message-content" : ""}>
              {message.hintText && (
                <div style={{display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8, color: "#8c8c8c", fontSize: 12}}>
                  <InfoCircleOutlined style={{marginTop: 2, flexShrink: 0}} />
                  <span>{message.hintText}</span>
                </div>
              )}
              <StatusStrip
                message={message}
                isLastMessage={isLastMessage}
                isGenerating={isGenerating}
                themeColor={themeColor}
              />
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
                    isLoadingTTS={isLoadingTTS}
                    readingMessage={readingMessage}
                    account={account}
                    setIsRegenerating={setIsRegenerating}
                    isRegenerating={isRegenerating}
                    hideInput={hideInput}
                  />
                  {mergedSearchResults.length > 0 && (
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
                      {mergedSearchResults.length} {i18next.t("chat:Web sources")}
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
          typing={message.author === "AI" && !message.isReasoningPhase ? {
            step: 2,
            interval: 50,
          } : undefined}
          avatar={renderAvatarNode()}
          styles={{
            content: isUserMessage ? {
              borderRadius: "18px 18px 4px 18px",
              padding: "11px 16px",
              backgroundColor: themeColor,
              color: "#fff",
            } : {
              borderRadius: "4px 18px 18px 18px",
              padding: "11px 16px",
              backgroundColor: aiBubbleBg,
              border: aiBubbleBorder,
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
        searchResults={mergedSearchResults}
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
