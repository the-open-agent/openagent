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
import {Alert, Avatar, Card, Col, Empty, Row, Spin, Statistic, Typography} from "antd";
import {TeamOutlined} from "@ant-design/icons";
import ReactEcharts from "echarts-for-react";
import i18next from "i18next";
import * as AnalysisBackend from "./backend/AnalysisBackend";
import * as Setting from "./Setting";

const LINE_COLOR = "#1677ff";

function totalSeriesOption(series) {
  return {
    grid: {top: 24, right: 16, bottom: 32, left: 40},
    tooltip: {trigger: "axis"},
    xAxis: {
      type: "category",
      data: series.map(p => p.date),
      axisLabel: {fontSize: 11},
      boundaryGap: false,
    },
    yAxis: {type: "value", minInterval: 1},
    series: [{
      name: i18next.t("general:Messages"),
      type: "line",
      data: series.map(p => p.messageCount),
      smooth: true,
      showSymbol: false,
      lineStyle: {width: 2, color: LINE_COLOR},
      areaStyle: {opacity: 0.15, color: LINE_COLOR},
    }],
  };
}

function miniSparkOption(series) {
  return {
    grid: {top: 4, right: 4, bottom: 4, left: 4},
    xAxis: {type: "category", show: false, data: series.map((_, i) => i)},
    yAxis: {type: "value", show: false},
    tooltip: {trigger: "axis", formatter: (params) => `${params[0].value}`},
    series: [{
      type: "line",
      data: series.map(p => p.messageCount),
      smooth: true,
      showSymbol: false,
      lineStyle: {width: 2, color: LINE_COLOR},
      areaStyle: {opacity: 0.15, color: LINE_COLOR},
    }],
  };
}

class InsightsContributors extends React.Component {
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
    AnalysisBackend.getStoreContributors(owner, storeName, period, 20)
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

  renderTotalChart(data) {
    return (
      <Card
        title={
          <span>
            <TeamOutlined /> {i18next.t("store:Activity over time")}
            <Typography.Text type="secondary" style={{fontSize: 13, marginLeft: 12}}>
              {i18next.t("store:{n} active users").replace("{n}", data.totalActiveUsers)}
            </Typography.Text>
          </span>
        }
        size="small"
      >
        <div style={{height: 220}}>
          <ReactEcharts
            option={totalSeriesOption(data.totalSeries)}
            style={{height: "100%", width: "100%"}}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </Card>
    );
  }

  renderContributorCards(data) {
    const {contributors} = data;
    if (!contributors || contributors.length === 0) {
      return (
        <Card style={{marginTop: 16}} size="small">
          <Empty description={i18next.t("store:No activity in this window")} />
        </Card>
      );
    }
    return (
      <Row gutter={[16, 16]} style={{marginTop: 16}}>
        {contributors.map((c) => (
          <Col key={c.user} xs={24} sm={12} lg={8} xl={6}>
            <Card size="small" styles={{body: {padding: 14}}}>
              <div style={{display: "flex", alignItems: "center", gap: 10, marginBottom: 8, minWidth: 0}}>
                <Avatar
                  size="default"
                  style={{backgroundColor: Setting.getAvatarColor(c.user), flexShrink: 0}}
                >
                  {c.user[0].toUpperCase()}
                </Avatar>
                <Typography.Text strong ellipsis={{tooltip: c.user}} style={{minWidth: 0, flex: 1}}>
                  {c.user}
                </Typography.Text>
              </div>
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic
                    title={i18next.t("general:Messages")}
                    value={c.messageCount}
                    valueStyle={{fontSize: 18}}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={i18next.t("general:Chats")}
                    value={c.chatCount}
                    valueStyle={{fontSize: 18}}
                  />
                </Col>
              </Row>
              <div style={{height: 44, marginTop: 8}}>
                <ReactEcharts
                  option={miniSparkOption(c.series)}
                  style={{height: "100%", width: "100%"}}
                  notMerge={true}
                  lazyUpdate={true}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
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
        {this.renderTotalChart(data)}
        {this.renderContributorCards(data)}
      </div>
    );
  }
}

export default InsightsContributors;
