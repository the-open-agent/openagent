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
import {Avatar, Button, Card, Col, Empty, Row, Space, Tabs, Tag, Typography} from "antd";
import StoreInsights from "./StoreInsights";
import {AppstoreOutlined, BarChartOutlined, BugOutlined, CommentOutlined, EyeOutlined, FolderOpenOutlined, ForkOutlined, SettingOutlined, StarOutlined} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import i18next from "i18next";
import CommentArea from "./comment/CommentArea";
import FileTree from "./FileTree";
import * as Setting from "./Setting";

const {Text, Title} = Typography;

function renderHeader(store, onStartChat, onFork, forking, onPlaceholder) {
  const initials = (store.displayName || store.name || "?")[0].toUpperCase();
  const authorName = store.author || store.owner;

  return (
    <div style={{display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 16, flexWrap: "wrap"}}>
      {store.avatar ? (
        <Avatar size={72} src={store.avatar} style={{flexShrink: 0}} />
      ) : (
        <Avatar size={72} style={{backgroundColor: Setting.getAvatarColor(store.name), flexShrink: 0, fontSize: 30}}>
          {initials}
        </Avatar>
      )}
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6}}>
          <div style={{minWidth: 0}}>
            <Title level={3} style={{margin: 0, wordBreak: "break-word"}}>
              <Text type="secondary" style={{fontSize: 20, fontWeight: 400}}>{store.owner} / </Text>
              {store.displayName || store.name}
            </Title>
            <Text type="secondary" style={{fontSize: 14}}>
              {i18next.t("store:By")} <strong>{authorName}</strong>
            </Text>
          </div>
          <Space wrap>
            <Button icon={<StarOutlined />} onClick={() => onPlaceholder("star")}>
              {i18next.t("store:Star")}
            </Button>
            <Button icon={<EyeOutlined />} onClick={() => onPlaceholder("watch")}>
              {i18next.t("store:Watch")}
            </Button>
            <Button icon={<ForkOutlined />} loading={forking} onClick={onFork}>
              {i18next.t("store:Fork")}
            </Button>
            <Button type="primary" icon={<CommentOutlined />} onClick={onStartChat}>
              {i18next.t("store:Start Chat")}
            </Button>
          </Space>
        </div>
        {store.affiliation ? (
          <div style={{fontSize: 13, color: "var(--ant-color-text-tertiary)", marginTop: 2}}>
            {store.affiliation}
          </div>
        ) : null}
        <div style={{marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6}}>
          {store.subject ? <Tag color="purple">{store.subject}</Tag> : null}
          {store.grade ? <Tag color="cyan">{store.grade}</Tag> : null}
          {store.topic ? <Tag color="geekblue">{store.topic}</Tag> : null}
        </div>
        {store.brief ? (
          <div style={{marginTop: 8, fontSize: 14, color: "var(--ant-color-text-secondary)", maxWidth: 640}}>
            {store.brief}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderAbout(store) {
  const rows = [
    [i18next.t("general:Owner"), store.owner],
    [i18next.t("store:Forked from"), store.forkedFromOwner && store.forkedFromName ? `${store.forkedFromOwner}/${store.forkedFromName}` : ""],
    [i18next.t("general:Author"), store.author],
    [i18next.t("store:Affiliation"), store.affiliation],
    [i18next.t("store:Tutor"), store.tutor],
    [i18next.t("store:Subject"), store.subject],
    [i18next.t("store:Grade"), store.grade],
    [i18next.t("store:Topic"), store.topic],
  ].filter(([, value]) => value);
  const stats = [
    [i18next.t("store:Chat count"), store.chatCount],
    [i18next.t("general:Messages"), store.messageCount],
    [i18next.t("store:Vector count"), store.vectorCount],
  ].filter(([, value]) => value !== undefined && value !== null);

  return (
    <Card title={i18next.t("store:About")} size="small">
      {store.brief ? (
        <div style={{fontSize: 14, lineHeight: 1.6, marginBottom: 14}}>
          {store.brief}
        </div>
      ) : null}
      <div style={{display: "grid", gap: 8}}>
        {rows.map(([label, value]) => (
          <div key={label} style={{display: "flex", justifyContent: "space-between", gap: 12}}>
            <Text type="secondary">{label}</Text>
            <Text style={{textAlign: "right", wordBreak: "break-word"}}>{value}</Text>
          </div>
        ))}
      </div>
      {stats.length > 0 ? (
        <div style={{display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 16}}>
          {stats.map(([label, value]) => (
            <div key={label} style={{border: "1px solid var(--ant-color-border-secondary)", borderRadius: 6, padding: "8px 6px", textAlign: "center"}}>
              <div style={{fontWeight: 600}}>{value}</div>
              <Text type="secondary" style={{fontSize: 12}}>{label}</Text>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function renderReadme(store) {
  const content = store.description || store.prompt || store.welcomeText || "";
  if (!content) {return null;}

  return (
    <Card
      title={
        <div style={{display: "flex", alignItems: "center", gap: 8}}>
          <FolderOpenOutlined />
          <span>{i18next.t("store:README")}</span>
        </div>
      }
      styles={{body: {padding: "20px 24px"}}}
    >
      <div className="markdown-body" style={{fontSize: 14, lineHeight: "1.6"}}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </Card>
  );
}

function renderFiles(account, store, onStoreUpdate, onRefresh) {
  return (
    <FileTree
      account={account}
      store={store}
      onUpdateStore={onStoreUpdate}
      onRefresh={onRefresh}
    />
  );
}

function renderOverview(account, store, onStoreUpdate, onRefresh) {
  const isExternalStore = Boolean(store.endpoint || store.hubDbName);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <div style={{display: "grid", gap: 16}}>
          {renderFiles(account, store, onStoreUpdate, onRefresh)}
          {renderReadme(store)}
          <CommentArea
            account={account}
            targetType="agenthub"
            targetKey={`${store.owner}/${store.name}`}
            targetOwner={store.owner}
            disabled={isExternalStore}
            unavailableText={i18next.t("store:Comments are unavailable for external agents")}
          />
        </div>
      </Col>
      <Col xs={24} lg={8}>
        {renderAbout(store)}
      </Col>
    </Row>
  );
}

function renderIssues() {
  return (
    <Card>
      <Empty description={i18next.t("store:Issues are coming soon")} />
    </Card>
  );
}

function renderInsights(store, activeSub, onSubTabChange) {
  return (
    <StoreInsights
      owner={store.owner}
      storeName={store.name}
      activeSub={activeSub}
      onSubTabChange={onSubTabChange}
    />
  );
}

function renderTabContent(account, store, activeTab, activeSub, onStoreUpdate, onRefresh, onSubTabChange) {
  if (activeTab === "files") {
    return renderFiles(account, store, onStoreUpdate, onRefresh);
  }
  if (activeTab === "issues") {
    return renderIssues();
  }
  if (activeTab === "insights") {
    return renderInsights(store, activeSub, onSubTabChange);
  }
  return renderOverview(account, store, onStoreUpdate, onRefresh);
}

function StoreHubAgentDetail({account, store, activeTab, activeSub, canManage, onTabChange, onSubTabChange, onStartChat, onFork, forking, onPlaceholder, onStoreUpdate, onRefresh}) {
  const tabItems = [
    {key: "overview", label: <span><AppstoreOutlined /> {i18next.t("store:Overview")}</span>},
    {key: "files", label: <span><FolderOpenOutlined /> {i18next.t("general:Files")}</span>},
    {key: "issues", label: <span><BugOutlined /> {i18next.t("store:Issues")}</span>},
    {key: "insights", label: <span><BarChartOutlined /> {i18next.t("store:Insights")}</span>},
  ];

  if (canManage) {
    tabItems.push({key: "settings", label: <span><SettingOutlined /> {i18next.t("general:Settings")}</span>});
  }

  return (
    <div style={{padding: "24px 32px", maxWidth: 1280, margin: "0 auto"}}>
      {renderHeader(store, onStartChat, onFork, forking, onPlaceholder)}
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={onTabChange}
        style={{marginBottom: 16}}
      />
      {renderTabContent(account, store, activeTab, activeSub, onStoreUpdate, onRefresh, onSubTabChange)}
    </div>
  );
}

export default StoreHubAgentDetail;
