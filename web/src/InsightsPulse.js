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
import {Alert, Avatar, Card, Col, Empty, Progress, Row, Spin, Statistic, Typography} from "antd";
import {CommentOutlined, FileOutlined, MessageOutlined, TeamOutlined, ThunderboltOutlined} from "@ant-design/icons";
import ReactEcharts from "echarts-for-react";
import i18next from "i18next";
import * as AnalysisBackend from "./backend/AnalysisBackend";
import * as Setting from "./Setting";

const SPARK_COLOR = "#1677ff";

function sparklineOption(values) {
  return {
    grid: {top: 4, right: 4, bottom: 4, left: 4},
    xAxis: {type: "category", show: false, data: values.map((_, i) => i)},
    yAxis: {type: "value", show: false},
    tooltip: {trigger: "axis", axisPointer: {type: "line"}, formatter: (params) => `${params[0].value}`},
    series: [{
      type: "line",
      data: values,
      smooth: true,
      showSymbol: false,
      lineStyle: {width: 2, color: SPARK_COLOR},
      areaStyle: {opacity: 0.15, color: SPARK_COLOR},
    }],
  };
}

class InsightsPulse extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      data: null,
    };
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.period !== this.props.period || prevProps.refreshTick !== this.props.refreshTick) {
      this.fetch();
    }
  }

  fetch() {
    const {owner, storeName, period, onLoaded} = this.props;
    this.setState({loading: true, error: null});
    AnalysisBackend.getStoreInsightsSummary(owner, storeName, period)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({loading: false, data: res.data});
          if (onLoaded) {onLoaded(res.data.asOf);}
        } else {
          this.setState({loading: false, error: res.msg});
        }
      })
      .catch((err) => this.setState({loading: false, error: err.message || String(err)}));
  }

  renderHeadline(data) {
    const parts = [
      i18next.t("store:{n} active users").replace("{n}", data.activeUsers),
      i18next.t("store:{n} chats").replace("{n}", data.chatCount),
      i18next.t("store:{n} messages").replace("{n}", data.messageCount),
      i18next.t("store:{n} files added").replace("{n}", data.filesAdded),
      i18next.t("store:{n} vectors added").replace("{n}", data.vectorsAdded),
    ];
    return (
      <div style={{marginBottom: 16, fontSize: 14, color: "var(--ant-color-text-secondary)"}}>
        {parts.join(" · ")}
      </div>
    );
  }

  renderStatCards(data) {
    const cards = [
      {label: i18next.t("general:Chats"), value: data.chatCount, series: data.buckets.map(b => b.chats), icon: <CommentOutlined />},
      {label: i18next.t("general:Messages"), value: data.messageCount, series: data.buckets.map(b => b.messages), icon: <MessageOutlined />},
      {label: i18next.t("store:Files added"), value: data.filesAdded, series: data.buckets.map(b => b.filesAdded), icon: <FileOutlined />},
      {label: i18next.t("store:Vectors added"), value: data.vectorsAdded, series: data.buckets.map(b => b.vectorsAdded), icon: <ThunderboltOutlined />},
    ];
    return (
      <Row gutter={[16, 16]}>
        {cards.map((c) => (
          <Col key={c.label} xs={24} sm={12} lg={6}>
            <Card size="small" styles={{body: {padding: 16}}}>
              <Statistic
                title={<span>{c.icon} {c.label}</span>}
                value={c.value}
              />
              <div style={{height: 44, marginTop: 8}}>
                <ReactEcharts option={sparklineOption(c.series)} style={{height: "100%", width: "100%"}} notMerge={true} lazyUpdate={true} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  renderTopUsers(data) {
    const {topUsers} = data;
    if (!topUsers || topUsers.length === 0) {
      return (
        <Card
          title={<span><TeamOutlined /> {i18next.t("store:Active users")}</span>}
          style={{marginTop: 16}}
          size="small"
        >
          <Empty description={i18next.t("store:No activity in this window")} />
        </Card>
      );
    }
    const max = topUsers[0].messageCount || 1;
    return (
      <Card
        title={<span><TeamOutlined /> {i18next.t("store:Active users")}</span>}
        style={{marginTop: 16}}
        size="small"
      >
        <div style={{display: "grid", rowGap: 10}}>
          {topUsers.map((u) => (
            <div key={u.user} style={{display: "grid", gridTemplateColumns: "180px 1fr 80px", gap: 12, alignItems: "center"}}>
              <div style={{display: "flex", alignItems: "center", gap: 8, minWidth: 0}}>
                <Avatar size="small" style={{backgroundColor: Setting.getAvatarColor(u.user), flexShrink: 0}}>
                  {u.user[0].toUpperCase()}
                </Avatar>
                <Typography.Text ellipsis={{tooltip: u.user}} style={{minWidth: 0}}>{u.user}</Typography.Text>
              </div>
              <Progress
                percent={Math.round((u.messageCount / max) * 100)}
                showInfo={false}
                strokeColor={SPARK_COLOR}
                size="small"
              />
              <Typography.Text type="secondary" style={{textAlign: "right"}}>
                {u.messageCount} · {u.chatCount} {i18next.t("store:chats").toLowerCase()}
              </Typography.Text>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  render() {
    const {loading, error, data} = this.state;
    if (loading && !data) {
      return <div style={{padding: 40, textAlign: "center"}}><Spin /></div>;
    }
    if (error) {
      return <Alert type="error" message={error} />;
    }
    if (!data) {return null;}

    return (
      <div>
        {this.renderHeadline(data)}
        {this.renderStatCards(data)}
        {this.renderTopUsers(data)}
      </div>
    );
  }
}

export default InsightsPulse;
