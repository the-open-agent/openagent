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
import {Alert, Card, Col, Row, Spin, Statistic, Typography} from "antd";
import {DollarOutlined, MessageOutlined, ThunderboltOutlined, TrophyOutlined} from "@ant-design/icons";
import ReactEcharts from "echarts-for-react";
import i18next from "i18next";
import * as AnalysisBackend from "./backend/AnalysisBackend";

const TOKEN_COLOR = "#1677ff";
const PRICE_COLOR = "#10b981";

function costChartOption(buckets, currency) {
  return {
    grid: {top: 40, right: 60, bottom: 32, left: 60},
    tooltip: {trigger: "axis"},
    legend: {
      data: [i18next.t("general:Tokens"), i18next.t("store:Cost")],
      top: 4,
    },
    xAxis: {
      type: "category",
      data: buckets.map(b => b.date),
      axisLabel: {fontSize: 11},
      boundaryGap: false,
    },
    yAxis: [
      {
        type: "value",
        name: i18next.t("general:Tokens"),
        position: "left",
        minInterval: 1,
        axisLabel: {color: TOKEN_COLOR},
        nameTextStyle: {color: TOKEN_COLOR, fontSize: 11},
      },
      {
        type: "value",
        name: currency ? `${i18next.t("store:Cost")} (${currency})` : i18next.t("store:Cost"),
        position: "right",
        axisLabel: {color: PRICE_COLOR},
        nameTextStyle: {color: PRICE_COLOR, fontSize: 11},
      },
    ],
    series: [
      {
        name: i18next.t("general:Tokens"),
        type: "line",
        yAxisIndex: 0,
        data: buckets.map(b => b.tokenCount),
        smooth: true,
        showSymbol: false,
        lineStyle: {width: 2, color: TOKEN_COLOR},
        areaStyle: {opacity: 0.15, color: TOKEN_COLOR},
      },
      {
        name: i18next.t("store:Cost"),
        type: "line",
        yAxisIndex: 1,
        data: buckets.map(b => b.price),
        smooth: true,
        showSymbol: false,
        lineStyle: {width: 2, color: PRICE_COLOR},
      },
    ],
  };
}

function formatPrice(v, currency) {
  if (v === undefined || v === null) {return "—";}
  const num = Number(v).toFixed(4);
  return currency ? `${num} ${currency}` : num;
}

class InsightsCost extends React.Component {
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
    AnalysisBackend.getStoreCostSeries(owner, storeName, period)
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

  renderKpiRow(data) {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title={<span><ThunderboltOutlined /> {i18next.t("store:Total tokens")}</span>}
              value={data.totalTokenCount}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title={<span><DollarOutlined /> {i18next.t("store:Total cost")}</span>}
              value={formatPrice(data.totalPrice, data.currency)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title={<span><MessageOutlined /> {i18next.t("store:Avg per message")}</span>}
              value={formatPrice(data.avgPricePerMsg, data.currency)}
              suffix={
                <Typography.Text type="secondary" style={{fontSize: 12, marginLeft: 6}}>
                  {`~${Math.round(data.avgTokensPerMsg || 0)} tok`}
                </Typography.Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title={<span><TrophyOutlined /> {i18next.t("store:Peak day")}</span>}
              value={data.peakTokenCount}
              suffix={
                <Typography.Text type="secondary" style={{fontSize: 12, marginLeft: 6}}>
                  {data.peakDate || "—"}
                </Typography.Text>
              }
            />
          </Card>
        </Col>
      </Row>
    );
  }

  renderChart(data) {
    return (
      <Card size="small" style={{marginTop: 16}}>
        <div style={{height: 300}}>
          <ReactEcharts
            option={costChartOption(data.buckets, data.currency)}
            style={{height: "100%", width: "100%"}}
            notMerge={true}
            lazyUpdate={true}
          />
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
      <Spin spinning={loading}>
        <div>
          {this.renderKpiRow(data)}
          {this.renderChart(data)}
        </div>
      </Spin>
    );
  }
}

export default InsightsCost;
