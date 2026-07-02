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
import {Alert, Card, Col, Empty, List, Progress, Row, Spin, Statistic, Typography} from "antd";
import {EnvironmentOutlined, EyeOutlined, LinkOutlined, UserOutlined} from "@ant-design/icons";
import ReactEcharts from "echarts-for-react";
import i18next from "i18next";
import * as AnalysisBackend from "./backend/AnalysisBackend";

const VIEW_COLOR = "#1677ff";
const UNIQ_COLOR = "#f59e0b";

function dualLineOption(buckets) {
  return {
    grid: {top: 40, right: 24, bottom: 32, left: 40},
    tooltip: {trigger: "axis"},
    legend: {
      data: [i18next.t("store:Views"), i18next.t("store:Unique visitors")],
      top: 4,
    },
    xAxis: {
      type: "category",
      data: buckets.map(b => b.date),
      axisLabel: {fontSize: 11},
      boundaryGap: false,
    },
    yAxis: {type: "value", minInterval: 1},
    series: [
      {
        name: i18next.t("store:Views"),
        type: "line",
        data: buckets.map(b => b.views),
        smooth: true,
        showSymbol: false,
        lineStyle: {width: 2, color: VIEW_COLOR},
        areaStyle: {opacity: 0.15, color: VIEW_COLOR},
      },
      {
        name: i18next.t("store:Unique visitors"),
        type: "line",
        data: buckets.map(b => b.uniqueVisitors),
        smooth: true,
        showSymbol: false,
        lineStyle: {width: 2, color: UNIQ_COLOR},
      },
    ],
  };
}

function TopItemsList({items, iconRender}) {
  if (!items || items.length === 0) {
    return <Empty description={i18next.t("store:No data in this window")} />;
  }
  const max = items[0].count || 1;
  return (
    <List
      size="small"
      dataSource={items}
      renderItem={(it) => (
        <List.Item style={{padding: "6px 0"}}>
          <div style={{display: "grid", gridTemplateColumns: "1fr 100px 60px", gap: 12, alignItems: "center", width: "100%"}}>
            <div style={{display: "flex", alignItems: "center", gap: 8, minWidth: 0}}>
              {iconRender ? iconRender(it) : null}
              <Typography.Text ellipsis={{tooltip: it.label}}>{it.label}</Typography.Text>
            </div>
            <Progress percent={Math.round((it.count / max) * 100)} showInfo={false} strokeColor={VIEW_COLOR} size="small" />
            <Typography.Text type="secondary" style={{textAlign: "right"}}>{it.count}</Typography.Text>
          </div>
        </List.Item>
      )}
    />
  );
}

class InsightsTraffic extends React.Component {
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
    AnalysisBackend.getStoreTraffic(owner, storeName, period)
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
    // 24h buckets are hourly (see resolvePeriod), so the highest bucket there
    // is a peak hour, not a peak day — label it accordingly.
    const isHourly = data.period === "24h";
    const peak = (data.buckets || []).reduce(
      (acc, b) => (b.views > acc.views ? {date: b.date, views: b.views} : acc),
      {date: "—", views: 0}
    );
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title={<span><EyeOutlined /> {i18next.t("store:Total views")}</span>}
              value={data.totalViews}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title={<span><UserOutlined /> {i18next.t("store:Unique visitors")}</span>}
              value={data.totalUniqueVisitors}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic
              title={<span><EnvironmentOutlined /> {isHourly ? i18next.t("store:Peak hour") : i18next.t("store:Peak day")}</span>}
              value={peak.views}
              suffix={
                <Typography.Text type="secondary" style={{fontSize: 12, marginLeft: 6}}>
                  {peak.date}
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
        <div style={{height: 260}}>
          <ReactEcharts option={dualLineOption(data.buckets)} style={{height: "100%", width: "100%"}} notMerge={true} lazyUpdate={true} />
        </div>
      </Card>
    );
  }

  renderReferrersAndPaths(data) {
    return (
      <Row gutter={[16, 16]} style={{marginTop: 16}}>
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={<span><LinkOutlined /> {i18next.t("store:Top referrers")}</span>}
          >
            <TopItemsList items={data.topReferrers} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={<span><EnvironmentOutlined /> {i18next.t("store:Top paths")}</span>}
          >
            <TopItemsList items={data.topPaths} />
          </Card>
        </Col>
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
        {this.renderKpiRow(data)}
        {this.renderChart(data)}
        {this.renderReferrersAndPaths(data)}
      </div>
    );
  }
}

export default InsightsTraffic;
