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
import {Button, Space, Tooltip} from "antd";
import {
  CopyOutlined,
  DislikeFilled,
  DislikeOutlined,
  LikeFilled,
  LikeOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import i18next from "i18next";

export const CopyButton = ({message, onCopy}) => (
  <Tooltip title={i18next.t("general:Copy")} arrow={false}>
    <Button
      icon={<CopyOutlined />}
      color="primary"
      variant="text"
      onClick={() => onCopy(message)}
    />
  </Tooltip>
);

const MessageActions = ({
  message,
  isLastMessage,
  index,
  onCopy,
  onRegenerate,
  onLike,
  onToggleRead,
  isReading,
  isLoadingTTS,
  readingMessage,
  account,
  setIsRegenerating,
  isRegenerating,
}) => {
  const isCurrentMessageBeingRead = readingMessage === message.name;
  const isCurrentMessageBeingLoaded = isLoadingTTS && isCurrentMessageBeingRead;

  const getTtsIcon = () => {
    if (isCurrentMessageBeingLoaded) {
      return <LoadingOutlined />;
    }
    if (isCurrentMessageBeingRead && isReading) {
      return <PauseCircleOutlined />;
    }
    return <PlayCircleOutlined />;
  };

  // Get appropriate tooltip text for TTS button
  const getTtsTooltip = () => {
    if (isCurrentMessageBeingLoaded) {
      return i18next.t("general:Loading...");
    }
    if (isCurrentMessageBeingRead && isReading) {
      return i18next.t("general:Pause");
    }
    if (isCurrentMessageBeingRead && !isReading) {
      return i18next.t("general:Resume");
    }
    return i18next.t("chat:Read it out");
  };

  return (
    <Space
      size="small"
      style={{
        opacity: 0.8,
      }}
    >
      <CopyButton message={message} onCopy={onCopy} />

      <Tooltip title={i18next.t("general:Like")} arrow={false}>
        <Button
          icon={message.likeUsers?.includes(account.name) ? <LikeFilled /> : <LikeOutlined />}
          color="primary"
          variant="text"
          onClick={() => onLike(message, "like")}
        />
      </Tooltip>

      <Tooltip title={i18next.t("general:Dislike")} arrow={false}>
        <Button
          icon={message.dislikeUsers?.includes(account.name) ? <DislikeFilled /> : <DislikeOutlined />}
          color="primary"
          variant="text"
          onClick={() => onLike(message, "dislike")}
        />
      </Tooltip>

      <Tooltip title={getTtsTooltip()} arrow={false}>
        <Button
          icon={getTtsIcon()}
          color="primary"
          variant="text"
          onClick={() => onToggleRead(message)}
          disabled={isCurrentMessageBeingLoaded}
        />
      </Tooltip>

      {!isLastMessage ? null : (
        <Tooltip title={i18next.t("general:Regenerate")} arrow={false}>
          <Button
            icon={<ReloadOutlined />}
            color="primary"
            variant="text"
            onClick={() => {
              setIsRegenerating(true);
              onRegenerate(index);
            }}
            disabled={isRegenerating}
          />
        </Tooltip>
      )}
    </Space>
  );
};

export default MessageActions;
