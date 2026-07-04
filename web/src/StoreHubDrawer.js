// Copyright 2026 The OpenAgent Authors. All Rights Reserved.
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
import {Avatar, Button, Divider, Drawer, Tag, Tooltip, Typography} from "antd";
import {CommentOutlined, CopyOutlined, LinkOutlined, RobotOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import UserLabel from "./common/UserLabel";
import i18next from "i18next";

const {Text, Paragraph} = Typography;

// Returns the full absolute chat URL for a store.
export function getChatUrl(store) {
  const chatPath = `/stores/${store.owner}/${store.name}/chat`;
  if (store.endpoint) {
    return `${store.endpoint}${chatPath}`;
  }
  return `${window.location.origin}${chatPath}`;
}

// Props:
//   store       – the store object to display (or null/undefined)
//   visible     – whether the drawer is open
//   onClose     – () => void
//   onStartChat – (store) => void
//   onCopyLink  – (store) => void
//   onViewAgent – (store) => void
function StoreHubDrawer({store, visible, onClose, onStartChat, onCopyLink, onViewAgent, account}) {
  if (!store) {
    return null;
  }

  const chatUrl = getChatUrl(store);
  const authorName = store.author || store.owner;
  const initials = (store.displayName || store.name || "?")[0].toUpperCase();

  const renderField = (label, value) => {
    if (!value) {
      return null;
    }
    return (
      <div style={{marginBottom: 14}}>
        <div style={{fontSize: 12, color: "var(--ant-color-text-tertiary)", marginBottom: 3, fontWeight: 500}}>
          {label}
        </div>
        <div style={{fontSize: 14, color: "var(--ant-color-text)", lineHeight: "22px"}}>
          {value}
        </div>
      </div>
    );
  };

  return (
    <Drawer
      title={null}
      placement="right"
      width={440}
      open={visible}
      onClose={onClose}
      styles={{body: {padding: "28px 24px", display: "flex", flexDirection: "column", height: "100%"}}}
    >
      {/* ── Header: avatar + name + author + affiliation + tags ── */}
      <div style={{display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20}}>
        {store.avatar ? (
          <Avatar size={72} src={store.avatar} style={{flexShrink: 0}} />
        ) : (
          <Avatar
            size={72}
            style={{backgroundColor: Setting.getAvatarColor(store.name), flexShrink: 0, fontSize: 28}}
          >
            {initials}
          </Avatar>
        )}
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontWeight: 700, fontSize: 18, lineHeight: "26px", marginBottom: 4, wordBreak: "break-word"}}>
            {store.displayName || store.name}
          </div>
          <Text type="secondary" style={{fontSize: 13}}>
            {i18next.t("store:By")}{" "}
            {store.author
              ? authorName
              : <UserLabel user={store.owner} account={account} showAvatar={false} nameStyle={{fontSize: 13}} />}
          </Text>
          {store.affiliation ? (
            <div style={{fontSize: 12, color: "var(--ant-color-text-tertiary)", marginTop: 2}}>
              {store.affiliation}
            </div>
          ) : null}
          <div style={{marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4}}>
            {store.subject ? <Tag color="purple">{store.subject}</Tag> : null}
            {store.grade ? <Tag color="cyan">{store.grade}</Tag> : null}
            {store.topic ? <Tag color="geekblue">{store.topic}</Tag> : null}
          </div>
        </div>
      </div>

      <Divider style={{margin: "0 0 18px"}} />

      {/* ── Info fields (scrollable) ── */}
      <div style={{flex: 1, overflowY: "auto"}}>
        {renderField(i18next.t("store:Brief"), store.brief)}
        {renderField(i18next.t("store:Tutor"), store.tutor)}

        {store.description ? (
          <div style={{marginBottom: 14}}>
            <div style={{fontSize: 12, color: "var(--ant-color-text-tertiary)", marginBottom: 3, fontWeight: 500}}>
              {i18next.t("general:Description")}
            </div>
            <Paragraph
              style={{fontSize: 14, color: "var(--ant-color-text)", lineHeight: "22px", marginBottom: 0, whiteSpace: "pre-wrap"}}
            >
              {store.description}
            </Paragraph>
          </div>
        ) : null}

        {/* ── Chat link ── */}
        <div style={{marginBottom: 20}}>
          <div style={{fontSize: 12, color: "var(--ant-color-text-tertiary)", marginBottom: 6, fontWeight: 500}}>
            <LinkOutlined style={{marginRight: 4}} />
            {i18next.t("store:Chat Link")}
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--ant-color-fill-quaternary)",
            borderRadius: 8,
            padding: "8px 12px",
            border: "1px solid var(--ant-color-border-secondary)",
          }}>
            <Typography.Link
              href={chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{flex: 1, fontSize: 12, wordBreak: "break-all"}}
            >
              {chatUrl}
            </Typography.Link>
            <Tooltip title={i18next.t("general:Copy")}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => onCopyLink(store)}
              />
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── Action buttons (pinned to bottom) ── */}
      <div style={{paddingTop: 16, borderTop: "1px solid var(--ant-color-border-secondary)", display: "flex", flexDirection: "column", gap: 8}}>
        {onViewAgent ? (
          <Button
            size="large"
            block
            icon={<RobotOutlined />}
            onClick={() => onViewAgent(store)}
          >
            {i18next.t("store:Enter Agent")}
          </Button>
        ) : null}
        <Button
          type="primary"
          size="large"
          block
          icon={<CommentOutlined />}
          onClick={() => onStartChat(store)}
        >
          {i18next.t("store:Start Chat")}
        </Button>
      </div>
    </Drawer>
  );
}

export default StoreHubDrawer;
