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
import {Avatar, Button, Card, Col, Divider, Drawer, Empty, Row, Spin, Tag, Tooltip, Typography} from "antd";
import {CommentOutlined, CopyOutlined, InfoCircleOutlined, LinkOutlined} from "@ant-design/icons";
import * as StoreBackend from "./backend/StoreBackend";
import * as Setting from "./Setting";
import i18next from "i18next";

const {Text, Paragraph} = Typography;

class StoreHubPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stores: [],
      loading: true,
      drawerVisible: false,
      selectedStore: null,
    };
  }

  componentDidMount() {
    this.getHubStores();
  }

  getHubStores() {
    StoreBackend.getHubStores()
      .then((res) => {
        if (res.status === "ok") {
          this.setState({stores: res.data || [], loading: false});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          this.setState({loading: false});
        }
      })
      .catch(() => {
        this.setState({loading: false});
      });
  }

  // Returns the full chat URL for a store (always absolute)
  getChatUrl(store) {
    const chatPath = `/stores/${store.owner}/${store.name}/chat`;
    if (store.endpoint) {
      return `${store.endpoint}${chatPath}`;
    }
    return `${window.location.origin}${chatPath}`;
  }

  openDrawer(store) {
    this.setState({drawerVisible: true, selectedStore: store});
  }

  closeDrawer() {
    this.setState({drawerVisible: false, selectedStore: null});
  }

  handleStartChat(store) {
    const chatPath = `/stores/${store.owner}/${store.name}/chat`;
    if (store.endpoint) {
      window.open(this.getChatUrl(store), "_blank", "noopener,noreferrer");
    } else {
      this.closeDrawer();
      this.props.history.push(chatPath);
    }
  }

  handleCopyLink(store) {
    const url = this.getChatUrl(store);
    navigator.clipboard.writeText(url).then(() => {
      Setting.showMessage("success", i18next.t("general:Successfully copied"));
    }).catch(() => {
      Setting.showMessage("error", i18next.t("general:Failed to get"));
    });
  }

  renderStoreCard(store) {
    const initials = (store.displayName || store.name || "?")[0].toUpperCase();
    const description = store.brief || store.welcomeText || store.prompt || "";
    const authorName = store.author || store.owner;
    const chatUrl = this.getChatUrl(store);
    const isExternal = !!store.hubDbName;

    return (
      <Col xs={24} sm={12} md={8} lg={6} key={`${store.owner}/${store.name}/${store.hubDbName}`}>
        <Card
          hoverable
          style={{
            borderRadius: 12,
            height: "100%",
            cursor: "pointer",
            borderColor: "var(--ant-color-border)",
          }}
          bodyStyle={{padding: "20px"}}
          onClick={() => this.openDrawer(store)}
        >
          <div style={{display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12}}>
            {store.avatar ? (
              <Avatar size={52} src={store.avatar} style={{flexShrink: 0}} />
            ) : (
              <Avatar size={52} style={{backgroundColor: Setting.getAvatarColor(store.name), flexShrink: 0}}>
                {initials}
              </Avatar>
            )}
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 2}}>
                <div style={{fontWeight: 600, fontSize: 15, lineHeight: "22px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1}}>
                  {store.displayName || store.name}
                </div>
                {isExternal ? (
                  <Tooltip title={`${i18next.t("store:External store from")}: ${store.hubDbName}`}>
                    <Tag color="orange" style={{fontSize: 11, padding: "0 4px", lineHeight: "18px", margin: 0, flexShrink: 0}}>
                      {i18next.t("store:External")}
                    </Tag>
                  </Tooltip>
                ) : null}
              </div>
              <Text type="secondary" style={{fontSize: 12}}>
                {i18next.t("store:By")} {authorName}
              </Text>
              <div style={{marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4}}>
                {store.subject ? <Tag color="purple" style={{fontSize: 11, padding: "0 4px", lineHeight: "18px", margin: 0}}>{store.subject}</Tag> : null}
                {store.grade ? <Tag color="cyan" style={{fontSize: 11, padding: "0 4px", lineHeight: "18px", margin: 0}}>{store.grade}</Tag> : null}
                {store.topic ? <Tag color="geekblue" style={{fontSize: 11, padding: "0 4px", lineHeight: "18px", margin: 0}}>{store.topic}</Tag> : null}
              </div>
            </div>
          </div>
          {description ? (
            <Paragraph
              ellipsis={{rows: 3}}
              style={{color: "var(--ant-color-text-secondary)", marginBottom: 12, fontSize: 13}}
            >
              {description}
            </Paragraph>
          ) : (
            <div style={{height: 60}} />
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 8px",
              background: "var(--ant-color-fill-quaternary)",
              borderRadius: 6,
              border: "1px solid var(--ant-color-border-secondary)",
              marginBottom: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <LinkOutlined style={{color: "var(--ant-color-primary)", fontSize: 11, flexShrink: 0}} />
            <Typography.Link
              href={chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{flex: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}
              onClick={(e) => e.stopPropagation()}
            >
              {chatUrl}
            </Typography.Link>
            <Tooltip title={i18next.t("general:Copy")}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                style={{flexShrink: 0, height: 20, width: 20, minWidth: 20, padding: 0}}
                onClick={(e) => {e.stopPropagation(); this.handleCopyLink(store);}}
              />
            </Tooltip>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 4, color: "var(--ant-color-primary)", fontSize: 13}}>
            <InfoCircleOutlined />
            <span>{i18next.t("store:View Details")}</span>
          </div>
        </Card>
      </Col>
    );
  }

  renderDrawer() {
    const {drawerVisible, selectedStore} = this.state;
    if (!selectedStore) {
      return null;
    }

    const store = selectedStore;
    const chatUrl = this.getChatUrl(store);
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
        open={drawerVisible}
        onClose={() => this.closeDrawer()}
        styles={{body: {padding: "28px 24px", display: "flex", flexDirection: "column", height: "100%"}}}
      >
        {/* ── Header: avatar + name + author + tags ── */}
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
              {i18next.t("store:By")} {authorName}
            </Text>
            <div style={{marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4}}>
              {store.subject ? <Tag color="purple">{store.subject}</Tag> : null}
              {store.grade ? <Tag color="cyan">{store.grade}</Tag> : null}
              {store.topic ? <Tag color="geekblue">{store.topic}</Tag> : null}
            </div>
          </div>
        </div>

        <Divider style={{margin: "0 0 18px"}} />

        {/* ── Info fields ── */}
        <div style={{flex: 1, overflowY: "auto"}}>
          {renderField(i18next.t("store:Brief"), store.brief)}
          {renderField(i18next.t("store:Tutor"), store.tutor)}

          {store.description ? (
            <div style={{marginBottom: 14}}>
              <div style={{fontSize: 12, color: "var(--ant-color-text-tertiary)", marginBottom: 3, fontWeight: 500}}>
                {i18next.t("store:Hub description")}
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
                onClick={(e) => e.stopPropagation()}
              >
                {chatUrl}
              </Typography.Link>
              <Tooltip title={i18next.t("general:Copy")}>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {e.stopPropagation(); this.handleCopyLink(store);}}
                />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* ── Start Chat button (pinned to bottom) ── */}
        <div style={{paddingTop: 16, borderTop: "1px solid var(--ant-color-border-secondary)"}}>
          <Button
            type="primary"
            size="large"
            block
            icon={<CommentOutlined />}
            onClick={() => this.handleStartChat(store)}
          >
            {i18next.t("store:Start Chat")}
          </Button>
        </div>
      </Drawer>
    );
  }

  render() {
    const {loading, stores} = this.state;

    return (
      <div style={{padding: "24px 32px", minHeight: "100vh", background: "var(--ant-color-bg-layout)"}}>
        <div style={{marginBottom: 24}}>
          <h2 style={{fontWeight: 700, fontSize: 24, marginBottom: 4}}>{i18next.t("general:Hub")}</h2>
          <p style={{color: "var(--ant-color-text-secondary)", margin: 0}}>
            {i18next.t("general:Hub desc")}
          </p>
        </div>
        {loading ? (
          <div style={{textAlign: "center", padding: "80px 0"}}>
            <Spin size="large" />
          </div>
        ) : stores.length === 0 ? (
          <Empty description={i18next.t("general:No published agents yet")} style={{marginTop: 80}} />
        ) : (
          <Row gutter={[16, 16]}>
            {stores.map(store => this.renderStoreCard(store))}
          </Row>
        )}
        {this.renderDrawer()}
      </div>
    );
  }
}

export default StoreHubPage;
