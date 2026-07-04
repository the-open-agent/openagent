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

import React, {Component} from "react";
import {Avatar, Card, Col, Row, Space, Spin, Typography} from "antd";
import * as StoreBackend from "./backend/StoreBackend";
import * as AnalysisBackend from "./backend/AnalysisBackend";
import * as Setting from "./Setting";
import UserLabel from "./common/UserLabel";
import WordCloudChart from "./WordCloudChart";
import BreadcrumbBar from "./common/BreadcrumbBar";
import i18next from "i18next";

const {Title} = Typography;

class AnalysisListPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      storeWordClouds: [],
      loading: true,
    };
  }

  componentDidMount() {
    this.loadData();
  }

  loadData() {
    StoreBackend.getGlobalStores(Setting.getRequestStore(this.props.account), 1, 10000, "", "", "", "")
      .then((res) => {
        if (res.status !== "ok") {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          this.setState({loading: false});
          return;
        }

        const stores = (res.data || []).filter(s => s.messageCount > 0);
        if (stores.length === 0) {
          this.setState({storeWordClouds: [], loading: false});
          return;
        }

        Promise.all(
          stores.map(store =>
            AnalysisBackend.getStoreWordCloud(store.name)
              .then(r => ({store, wordCountMap: r.status === "ok" ? r.data : {}}))
              .catch(() => ({store, wordCountMap: {}}))
          )
        ).then(results => {
          this.setState({storeWordClouds: results, loading: false});
        });
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
        this.setState({loading: false});
      });
  }

  render() {
    const {storeWordClouds, loading} = this.state;

    return (
      <div style={{padding: "24px"}}>
        <BreadcrumbBar uri={this.props.location.pathname} />
        <Title level={3} style={{marginTop: "16px"}}>{i18next.t("store:Analysis")}</Title>
        {loading ? (
          <div style={{textAlign: "center", paddingTop: "100px"}}>
            <Spin size="large" />
          </div>
        ) : storeWordClouds.length === 0 ? (
          <div style={{textAlign: "center", paddingTop: "100px", color: "#999"}}>
            {i18next.t("store:No message data available")}
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {storeWordClouds.map(({store, wordCountMap}) => (
              <Col key={store.name} xs={24} lg={8}>
                <Card
                  title={
                    <Space>
                      <Avatar src={store.avatar || Setting.getDefaultAiAvatar()} size={24} />
                      <span>{store.displayName || store.name}</span>
                      <UserLabel user={store.owner} account={this.props.account} showAvatar={false} nameStyle={{fontWeight: "normal", color: "#999", fontSize: "12px"}} />
                    </Space>
                  }
                  extra={
                    <Space size={16}>
                      <a href={`/stores/${store.owner}/${store.name}`} target="_blank" rel="noreferrer">{i18next.t("general:Edit")}</a>
                      <a href={`/analysis/${store.owner}/${store.name}`} target="_blank" rel="noreferrer">{i18next.t("general:View")}</a>
                    </Space>
                  }
                  hoverable
                >
                  {Object.keys(wordCountMap).length > 0 ? (
                    <WordCloudChart wordCountMap={wordCountMap} height="300px" sizeRange={[10, 40]} gridSize={8} />
                  ) : (
                    <div style={{textAlign: "center", padding: "40px", color: "#999"}}>
                      {i18next.t("store:No message data available")}
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    );
  }
}

export default AnalysisListPage;
