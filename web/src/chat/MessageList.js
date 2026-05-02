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
import {List} from "antd";
import MessageItem from "./MessageItem";
import * as Setting from "../Setting";

class MessageList extends React.Component {
  render() {
    const {
      messages,
      account,
      store,
      onRegenerate,
      onMessageLike,
      onCopyMessage,
      onToggleRead,
      onEditMessage,
      hideInput,
      disableInput,
      isReading,
      isLoadingTTS,
      readingMessage,
      sendMessage,
      files,
      hideThinking,
    } = this.props;

    const avatarSrc = store?.avatar || Setting.getDefaultAiAvatar();
    const filteredMessages = messages.filter(message => message.isHidden === false);

    return (
      <List
        ref={this.props.innerRef}
        locale={{emptyText: " "}}
        className="chat-message-list"
        style={{
          flex: 1,
          overflow: "auto",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: hideInput ? "0px" : files.length > 0 ? "150px" : "100px",
          padding: "24px",
          paddingBottom: hideInput ? "0px" : "40px",
          scrollBehavior: "smooth",
        }}
        dataSource={filteredMessages}
        renderItem={(message, index) => (
          <MessageItem
            key={message.name || index}
            message={message}
            index={index}
            isLastMessage={index === filteredMessages.length - 1}
            account={account}
            avatar={avatarSrc}
            onCopy={onCopyMessage}
            onRegenerate={onRegenerate}
            onLike={onMessageLike}
            onToggleRead={onToggleRead}
            onEditMessage={onEditMessage}
            disableInput={disableInput}
            isReading={isReading}
            isLoadingTTS={isLoadingTTS}
            readingMessage={readingMessage}
            sendMessage={sendMessage}
            hideThinking={hideThinking}
          />
        )}
      />
    );
  }
}

// Forward the ref from parent
export default React.forwardRef((props, ref) => <MessageList innerRef={ref} {...props} />);
