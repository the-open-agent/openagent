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
import {Avatar, Card, Col, Empty, Row, Spin, Tag, Typography} from "antd";
import {CommentOutlined} from "@ant-design/icons";
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

  renderStoreCard(store) {
    const chatPath = `/stores/${store.owner}/${store.name}/chat`;
    const chatUrl = store.endpoint ? `${store.endpoint}${chatPath}` : null;
    const initials = (store.displayName || store.name || "?")[0].toUpperCase();
    const description = store.welcomeText || store.prompt || "";

    const handleClick = () => {
      if (chatUrl) {
        window.open(chatUrl, "_blank", "noopener,noreferrer");
      } else {
        this.props.history.push(chatPath);
      }
    };

    return (
      <Col xs={24} sm={12} md={8} lg={6} key={`${store.owner}/${store.name}/${store.hubDbName}`}>
        <Card
          hoverable
          style={{borderRadius: 12, height: "100%", cursor: "pointer"}}
          bodyStyle={{padding: "20px"}}
          onClick={handleClick}
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
              <div style={{fontWeight: 600, fontSize: 15, lineHeight: "22px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                {store.displayName || store.name}
              </div>
              <Text type="secondary" style={{fontSize: 12}}>
                {i18next.t("store:By")} {store.owner}
              </Text>
              {store.hubDbName ? (
                <div style={{marginTop: 2}}>
                  <Tag color="blue" style={{fontSize: 11, padding: "0 4px", lineHeight: "18px"}}>{store.hubDbName}</Tag>
                </div>
              ) : null}
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
          <div style={{display: "flex", alignItems: "center", gap: 4, color: "var(--ant-color-primary)", fontSize: 13}}>
            <CommentOutlined />
            <span>{i18next.t("store:Start Chat")}</span>
          </div>
        </Card>
      </Col>
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
      </div>
    );
  }
}

export default StoreHubPage;
