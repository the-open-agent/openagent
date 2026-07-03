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
import {Button, Layout, Menu, Segmented, Space, Tooltip, Typography} from "antd";
import {CloudOutlined, DollarOutlined, EnvironmentOutlined, ReloadOutlined, TeamOutlined, ThunderboltOutlined} from "@ant-design/icons";
import i18next from "i18next";
import InsightsPulse from "./InsightsPulse";
import InsightsContributors from "./InsightsContributors";
import InsightsTraffic from "./InsightsTraffic";
import InsightsWordCloud from "./InsightsWordCloud";
import InsightsCost from "./InsightsCost";

const {Sider, Content} = Layout;
const {Text} = Typography;

const PERIOD_OPTIONS = [
  {value: "24h", i18nKey: "store:24h"},
  {value: "7d", i18nKey: "store:7d"},
  {value: "30d", i18nKey: "store:30d"},
];

const SUB_TABS = [
  {key: "pulse", icon: <ThunderboltOutlined />, i18nKey: "store:Pulse"},
  {key: "contributors", icon: <TeamOutlined />, i18nKey: "store:Contributors"},
  {key: "traffic", icon: <EnvironmentOutlined />, i18nKey: "store:Traffic"},
  {key: "wordcloud", icon: <CloudOutlined />, i18nKey: "store:Word Cloud"},
  {key: "cost", icon: <DollarOutlined />, i18nKey: "store:Cost"},
];

function formatAsOf(iso) {
  if (!iso) {return "—";}
  const d = new Date(iso);
  if (isNaN(d.getTime())) {return iso;}
  return d.toLocaleString();
}

class StoreInsights extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      period: "7d",
      refreshTick: 0,
      asOf: null,
    };
  }

  componentDidUpdate(prevProps) {
    // Sub-tab switched via URL — clear the previously displayed asOf so the
    // shell shows "—" until the newly-mounted sub-tab reports its own fetch time.
    if (prevProps.activeSub !== this.props.activeSub) {
      this.setState({asOf: null});
    }
  }

  handleSubTabChange = (key) => {
    if (this.props.onSubTabChange) {
      this.props.onSubTabChange(key);
    }
  };

  handlePeriodChange = (period) => {
    this.setState({period, asOf: null});
  };

  handleRefresh = () => {
    this.setState((s) => ({refreshTick: s.refreshTick + 1, asOf: null}));
  };

  handleChildLoaded = (asOf) => {
    this.setState({asOf});
  };

  renderSubTabContent() {
    const {period, refreshTick} = this.state;
    const {owner, storeName} = this.props;
    const activeSub = this.props.activeSub || "pulse";
    const common = {owner, storeName, period, refreshTick, onLoaded: this.handleChildLoaded};

    switch (activeSub) {
    case "pulse": return <InsightsPulse {...common} />;
    case "contributors": return <InsightsContributors {...common} />;
    case "traffic": return <InsightsTraffic {...common} />;
    case "wordcloud": return <InsightsWordCloud {...common} />;
    case "cost": return <InsightsCost {...common} />;
    default: return null;
    }
  }

  render() {
    const {period, asOf} = this.state;
    const activeSub = this.props.activeSub || "pulse";

    return (
      <Layout style={{background: "transparent"}}>
        <Sider
          width={220}
          style={{background: "transparent", borderRight: "1px solid var(--ant-color-border-secondary)"}}
        >
          <Menu
            mode="inline"
            selectedKeys={[activeSub]}
            onClick={({key}) => this.handleSubTabChange(key)}
            style={{background: "transparent", border: "none"}}
            items={SUB_TABS.map((t) => ({
              key: t.key,
              icon: t.icon,
              label: i18next.t(t.i18nKey),
            }))}
          />
        </Sider>
        <Content style={{padding: "0 0 0 20px"}}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Space size="middle">
              <Segmented
                options={PERIOD_OPTIONS.map((o) => ({value: o.value, label: i18next.t(o.i18nKey)}))}
                value={period}
                onChange={this.handlePeriodChange}
              />
              <Tooltip title={i18next.t("general:Refresh")}>
                <Button icon={<ReloadOutlined />} onClick={this.handleRefresh}>
                  {i18next.t("general:Refresh")}
                </Button>
              </Tooltip>
            </Space>
            <Text type="secondary" style={{fontSize: 13}}>
              {i18next.t("store:Data as of")}: {formatAsOf(asOf)}
            </Text>
          </div>
          {this.renderSubTabContent()}
        </Content>
      </Layout>
    );
  }
}

export default StoreInsights;
