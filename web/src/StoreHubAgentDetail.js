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
import {Avatar, Button, Card, Col, Row, Space, Tabs, Tag, Tooltip, Typography} from "antd";
import StoreInsights from "./StoreInsights";
import StoreIssues from "./StoreIssues";
import StoreSecurity from "./StoreSecurity";
import StoreEditPage from "./StoreEditPage";
import ChatPage from "./ChatPage";
import {AppstoreOutlined, BarChartOutlined, BugOutlined, CommentOutlined, EyeFilled, EyeOutlined, FolderOpenOutlined, ForkOutlined, SafetyCertificateOutlined, SettingOutlined, StarFilled, StarOutlined} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import i18next from "i18next";
import CommentArea from "./comment/CommentArea";
import FileTree from "./FileTree";
import * as Setting from "./Setting";
import UserLabel from "./common/UserLabel";

const {Text, Title} = Typography;

function renderForkDisabledReason(favoriteStatus) {
  if (!favoriteStatus) {
    return "";
  }
  if (favoriteStatus.isOwner) {
    return i18next.t("store:You cannot fork your own agent");
  }
  if (favoriteStatus.hasForked) {
    return i18next.t("store:You have already forked this agent");
  }
  return "";
}

function renderHeader(store, account, onStartChat, onFork, forking, favoriteStatus, starLoading, watchLoading, onToggleFavorite) {
  const initials = (store.displayName || store.name || "?")[0].toUpperCase();
  const status = favoriteStatus || {};
  const forkDisabledReason = renderForkDisabledReason(status);
  const isForked = Boolean(store.forkedFromOwner && store.forkedFromName);

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
              <UserLabel user={store.owner} account={account} showAvatar={false} nameStyle={{fontSize: 20, fontWeight: 400, color: "var(--ant-color-text-secondary)"}} />
              <Text type="secondary" style={{fontSize: 20, fontWeight: 400}}> / </Text>
              {store.displayName || store.name}
            </Title>
            <div style={{display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap"}}>
              <Text type="secondary" style={{fontSize: 14}}>
                {i18next.t("store:By")}{" "}
                {store.author
                  ? <strong>{store.author}</strong>
                  : <UserLabel user={store.owner} account={account} showAvatar={false} strong />}
              </Text>
              {store.affiliation ? (
                <Text type="secondary" style={{fontSize: 13}}>
                  {store.affiliation}
                </Text>
              ) : null}
              {(store.subject || store.grade || store.topic || isForked) ? (
                <div style={{display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap"}}>
                  {store.subject ? <Tag color="purple" style={{margin: 0}}>{store.subject}</Tag> : null}
                  {store.grade ? <Tag color="cyan" style={{margin: 0}}>{store.grade}</Tag> : null}
                  {store.topic ? <Tag color="geekblue" style={{margin: 0}}>{store.topic}</Tag> : null}
                  {isForked ? (
                    <Tag icon={<ForkOutlined />} color="blue" style={{margin: 0}}>
                      {i18next.t("store:Forked from")} {store.forkedFromOwner}/{store.forkedFromName}
                    </Tag>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <Space wrap>
            <Button
              icon={status.starred ? <StarFilled style={{color: "#faad14"}} /> : <StarOutlined />}
              loading={starLoading}
              onClick={() => onToggleFavorite("star")}
            >
              {status.starred ? i18next.t("store:Starred") : i18next.t("store:Star")}
              {status.starCount > 0 ? ` (${status.starCount})` : ""}
            </Button>
            <Button
              icon={status.watched ? <EyeFilled style={{color: Setting.getThemeColor()}} /> : <EyeOutlined />}
              loading={watchLoading}
              onClick={() => onToggleFavorite("watch")}
            >
              {status.watched ? i18next.t("store:Watching") : i18next.t("store:Watch")}
              {status.watchCount > 0 ? ` (${status.watchCount})` : ""}
            </Button>
            <Tooltip title={forkDisabledReason}>
              <Button icon={<ForkOutlined />} loading={forking} disabled={Boolean(forkDisabledReason)} onClick={onFork}>
                {i18next.t("store:Fork")}
                {status.forkCount > 0 ? ` (${status.forkCount})` : ""}
              </Button>
            </Tooltip>
            <Button type="primary" icon={<CommentOutlined />} onClick={onStartChat}>
              {i18next.t("store:Start Chat")}
            </Button>
          </Space>
        </div>
        {store.brief ? (
          <div style={{marginTop: 8, fontSize: 14, color: "var(--ant-color-text-secondary)", maxWidth: "100%"}}>
            {store.brief}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderAbout(store, account) {
  const rows = [
    [i18next.t("general:Owner"), <UserLabel key="owner" user={store.owner} account={account} showAvatar={false} />],
    [i18next.t("store:Forked from"), store.forkedFromOwner && store.forkedFromName ? `${store.forkedFromOwner}/${store.forkedFromName}` : ""],
    [i18next.t("general:Author"), store.author],
    [i18next.t("store:Affiliation"), store.affiliation],
    [i18next.t("store:Tutor"), store.tutor],
    [i18next.t("store:Subject"), store.subject],
    [i18next.t("store:Grade"), store.grade],
    [i18next.t("store:Topic"), store.topic],
  ].filter(([, value]) => value);
  const stats = [
    [i18next.t("general:Chats"), store.chatCount],
    [i18next.t("general:Messages"), store.messageCount],
    [i18next.t("general:Vectors"), store.vectorCount],
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
  const areCommentsUnavailable = isExternalStore || store.publishState !== "Published";

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={18} style={{minWidth: 0}}>
        <div style={{display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16}}>
          {renderFiles(account, store, onStoreUpdate, onRefresh)}
          {renderReadme(store)}
          <CommentArea
            account={account}
            targetType="agenthub"
            targetKey={`${store.owner}/${store.name}`}
            targetOwner={store.owner}
            disabled={areCommentsUnavailable}
            unavailableText={isExternalStore ? i18next.t("store:Comments are unavailable for external agents") : i18next.t("store:Comments are unavailable")}
          />
        </div>
      </Col>
      <Col xs={24} lg={6}>
        {renderAbout(store, account)}
      </Col>
    </Row>
  );
}

function renderIssues(account, store, activeIssueName, onIssueChange) {
  return (
    <StoreIssues account={account} store={store} activeIssueName={activeIssueName} onIssueChange={onIssueChange} />
  );
}

function renderSecurity(account, store) {
  return (
    <StoreSecurity
      account={account}
      owner={store.owner}
      storeName={store.name}
    />
  );
}

function renderInsights(account, store, activeSub, onSubTabChange) {
  return (
    <StoreInsights
      account={account}
      owner={store.owner}
      storeName={store.name}
      activeSub={activeSub}
      onSubTabChange={onSubTabChange}
    />
  );
}

function renderSettings(account, store, history) {
  return (
    <StoreEditPage
      account={account}
      history={history}
      location={{}}
      match={{params: {owner: store.owner, storeName: store.name}}}
      basePath="/agents"
    />
  );
}

// ChatPage internally calls history.push() whenever a chat is auto-selected
// or created, which would otherwise navigate the whole agent detail page
// away from the Chat tab. Give it a no-op history so it stays put.
const noopHistory = {push: () => {}, replace: () => {}};

function renderChat(account, store) {
  return (
    <div style={{margin: "0 -32px -24px", borderTop: "1px solid var(--ant-color-border-secondary)"}}>
      <ChatPage
        account={account}
        history={noopHistory}
        location={{}}
        match={{params: {storeName: store.name}}}
        autoFocusInput={false}
      />
    </div>
  );
}

function renderTabContent(account, store, activeTab, activeSub, activeIssueName, onStoreUpdate, onRefresh, onSubTabChange, onIssueChange, history) {
  if (activeTab === "files") {
    return renderFiles(account, store, onStoreUpdate, onRefresh);
  }
  if (activeTab === "issues") {
    return renderIssues(account, store, activeIssueName, onIssueChange);
  }
  if (activeTab === "security") {
    return renderSecurity(account, store);
  }
  if (activeTab === "insights") {
    return renderInsights(account, store, activeSub, onSubTabChange);
  }
  if (activeTab === "settings") {
    return renderSettings(account, store, history);
  }
  if (activeTab === "chat") {
    return renderChat(account, store);
  }
  return renderOverview(account, store, onStoreUpdate, onRefresh);
}

function StoreHubAgentDetail({account, store, activeTab, activeSub, activeIssueName, canManage, onTabChange, onSubTabChange, onIssueChange, onStartChat, onFork, forking, favoriteStatus, starLoading, watchLoading, onToggleFavorite, onStoreUpdate, onRefresh, history}) {
  const tabItems = [
    {key: "overview", label: <span><AppstoreOutlined /> {i18next.t("store:Overview")}</span>},
    {key: "chat", label: <span><CommentOutlined /> {i18next.t("general:Chat")}</span>},
    {key: "files", label: <span><FolderOpenOutlined /> {i18next.t("general:Files")}</span>},
    {key: "issues", label: <span><BugOutlined /> {i18next.t("store:Issues")}</span>},
    {key: "security", label: <span><SafetyCertificateOutlined /> {i18next.t("store:Security")}</span>},
    {key: "insights", label: <span><BarChartOutlined /> {i18next.t("store:Insights")}</span>},
  ];

  if (canManage) {
    tabItems.push({key: "settings", label: <span><SettingOutlined /> {i18next.t("general:Settings")}</span>});
  }

  return (
    <div style={{padding: "24px 32px", maxWidth: 1400, margin: "0 auto"}}>
      {renderHeader(store, account, onStartChat, onFork, forking, favoriteStatus, starLoading, watchLoading, onToggleFavorite)}
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={onTabChange}
        style={{marginBottom: 16}}
      />
      {renderTabContent(account, store, activeTab, activeSub, activeIssueName, onStoreUpdate, onRefresh, onSubTabChange, onIssueChange, history)}
    </div>
  );
}

export default StoreHubAgentDetail;
