// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
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

import {Card, Col, Progress, Row} from "antd";
import Loading from "./common/Loading";
import * as SystemBackend from "./backend/SystemInfo";
import React from "react";
import * as Setting from "./Setting";
import i18next from "i18next";
import PrometheusInfoTable from "./table/PrometheusInfoTable";

class SystemInfo extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      systemInfo: {cpuUsage: [], memoryUsed: 0, memoryTotal: 0, diskUsed: 0, diskTotal: 0, networkSent: 0, networkRecv: 0, networkTotal: 0},
      versionInfo: {},
      prometheusInfo: {apiThroughput: [], apiLatency: [], totalThroughput: 0},
      intervalId: null,
      loading: true,
    };
  }

  UNSAFE_componentWillMount() {
    SystemBackend.getSystemInfo("").then(res => {
      this.setState({
        loading: false,
      });

      if (res.status === "ok") {
        this.setState({
          systemInfo: res.data,
        });
      } else {
        Setting.showMessage("error", res.msg);
        this.stopTimer();
      }

      const id = setInterval(() => {
        SystemBackend.getSystemInfo("").then(res => {
          this.setState({
            loading: false,
          });

          if (res.status === "ok") {
            this.setState({
              systemInfo: res.data,
            });
          } else {
            Setting.showMessage("error", res.msg);
            this.stopTimer();
          }
        }).catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
          this.stopTimer();
        });
        SystemBackend.getPrometheusInfo().then(res => {
          this.setState({
            prometheusInfo: res.data,
          });
        });
      }, 1000 * 2);

      this.setState({intervalId: id});
    }).catch(error => {
      Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
      this.stopTimer();
    });

    SystemBackend.getVersionInfo().then(res => {
      if (res.status === "ok") {
        this.setState({
          versionInfo: res.data,
        });
      } else {
        Setting.showMessage("error", res.msg);
        this.stopTimer();
      }
    }).catch(err => {
      Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${err}`);
      this.stopTimer();
    });
  }

  componentDidMount() {
    window.addEventListener("storageTourChanged", this.handleTourChange);
  }

  stopTimer() {
    if (this.state.intervalId !== null) {
      clearInterval(this.state.intervalId);
    }
  }

  componentWillUnmount() {
    this.stopTimer();
    window.removeEventListener("storageTourChanged", this.handleTourChange);
  }

  render() {
    const cpuUi = this.state.systemInfo.cpuUsage?.length <= 0 ? i18next.t("system:Failed to get CPU usage") :
      this.state.systemInfo.cpuUsage.map((usage, i) => {
        return (
          <Progress key={i} percent={Number(usage.toFixed(1))} />
        );
      });

    const memUi = this.state.systemInfo.memoryTotal <= 0 ? i18next.t("system:Failed to get memory usage") :
      <div>
        {Setting.getFriendlyFileSize(this.state.systemInfo.memoryUsed)} / {Setting.getFriendlyFileSize(this.state.systemInfo.memoryTotal)}
        <br /> <br />
        <Progress type="circle" percent={Number((Number(this.state.systemInfo.memoryUsed) / Number(this.state.systemInfo.memoryTotal) * 100).toFixed(2))} />
      </div>;

    const diskUi = this.state.systemInfo.diskTotal <= 0 ? i18next.t("system:Failed to get disk usage") :
      <div>
        {Setting.getFriendlyFileSize(this.state.systemInfo.diskUsed)} / {Setting.getFriendlyFileSize(this.state.systemInfo.diskTotal)}
        <br /> <br />
        <Progress type="circle" percent={Number((Number(this.state.systemInfo.diskUsed) / Number(this.state.systemInfo.diskTotal) * 100).toFixed(2))} />
      </div>;

    const networkUi = this.state.systemInfo.networkTotal === undefined || this.state.systemInfo.networkTotal === null ? i18next.t("system:Failed to get network usage") :
      <div>
        {i18next.t("system:Sent")}: {Setting.getFriendlyFileSize(this.state.systemInfo.networkSent)}
        <br />
        {i18next.t("system:Received")}: {Setting.getFriendlyFileSize(this.state.systemInfo.networkRecv)}
        <br /> <br />
        <div style={{fontSize: "16px", fontWeight: "600", color: "rgba(0, 0, 0, 0.85)"}}>
          {i18next.t("system:Total Throughput")}: {Setting.getFriendlyFileSize(this.state.systemInfo.networkTotal)}
        </div>
      </div>;

    const latencyUi = this.state.prometheusInfo?.apiLatency === null || this.state.prometheusInfo?.apiLatency?.length <= 0 ? <Loading /> :
      <PrometheusInfoTable prometheusInfo={this.state.prometheusInfo} table={"latency"} />;
    const throughputUi = this.state.prometheusInfo?.apiThroughput === null || this.state.prometheusInfo?.apiThroughput?.length <= 0 ? <Loading /> :
      <PrometheusInfoTable prometheusInfo={this.state.prometheusInfo} table={"throughput"} />;
    const link = this.state.versionInfo?.version !== "" ? `https://github.com/the-open-agent/openagent/releases/tag/${this.state.versionInfo?.version}` : "";
    let versionText = this.state.versionInfo?.version !== "" ? this.state.versionInfo?.version : i18next.t("system:Unknown version");
    if (this.state.versionInfo?.commitOffset > 0) {
      versionText += ` (ahead+${this.state.versionInfo?.commitOffset})`;
    }

    if (!Setting.isMobile()) {
      return (
        <>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card id="network-card" title={i18next.t("system:Network Usage")} bordered={true} style={{textAlign: "center", height: "100%"}}>
                {this.state.loading ? <Loading /> : networkUi}
              </Card>
            </Col>
            <Col span={6}>
              <Card id="cpu-card" title={i18next.t("system:CPU Usage")} bordered={true} style={{textAlign: "center", height: "100%"}}>
                {this.state.loading ? <Loading /> : cpuUi}
              </Card>
            </Col>
            <Col span={6}>
              <Card id="memory-card" title={i18next.t("system:Memory Usage")} bordered={true} style={{textAlign: "center", height: "100%"}}>
                {this.state.loading ? <Loading /> : memUi}
              </Card>
            </Col>
            <Col span={6}>
              <Card id="disk-card" title={i18next.t("system:Disk Usage")} bordered={true} style={{textAlign: "center", height: "100%"}}>
                {this.state.loading ? <Loading /> : diskUi}
              </Card>
            </Col>
            <Col span={12}>
              <Card id="latency-card" title={i18next.t("system:API Latency")} bordered={true} style={{textAlign: "center", height: "100%"}}>
                {this.state.loading ? <Loading /> : latencyUi}
              </Card>
            </Col>
            <Col span={12}>
              <Card id="throughput-card" title={i18next.t("system:API Throughput")} bordered={true} style={{textAlign: "center", height: "100%"}}>
                {this.state.loading ? <Loading /> : throughputUi}
              </Card>
            </Col>
            <Col span={24}>
              <Card id="about-card" title={i18next.t("system:About OpenAgent")} bordered={true} style={{textAlign: "center"}}>
                <div>{i18next.t("system:🚀⚡️Next-generation personal AI assistant powered by LLM, RAG and agent loops,\n" +
                  "supporting computer-use, browser-use and coding agent")}</div>
                GitHub: <a target="_blank" rel="noreferrer" href="https://github.com/the-open-agent/openagent">OpenAgent</a>
                <br />
                {i18next.t("general:Version")}: <a target="_blank" rel="noreferrer" href={link}>{versionText}</a>
                <br />
                {i18next.t("system:Official website")}: <a target="_blank" rel="noreferrer" href="https://openagentai.org">https://openagentai.org</a>
                <br />
                {i18next.t("system:Community")}: <a target="_blank" rel="noreferrer" href="https://openagentai.org/#:~:text=OpenAgent%20API-,Community,-GitHub">Get in Touch!</a>
              </Card>
            </Col>
          </Row>
        </>
      );
    } else {
      return (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title={i18next.t("system:Network Usage")} bordered={true} style={{textAlign: "center", width: "100%"}}>
              {this.state.loading ? <Loading /> : networkUi}
            </Card>
          </Col>
          <Col span={24}>
            <Card title={i18next.t("system:CPU Usage")} bordered={true} style={{textAlign: "center", width: "100%"}}>
              {this.state.loading ? <Loading /> : cpuUi}
            </Card>
          </Col>
          <Col span={24}>
            <Card title={i18next.t("system:Memory Usage")} bordered={true} style={{textAlign: "center", width: "100%"}}>
              {this.state.loading ? <Loading /> : memUi}
            </Card>
          </Col>
          <Col span={24}>
            <Card title={i18next.t("system:Disk Usage")} bordered={true} style={{textAlign: "center", width: "100%"}}>
              {this.state.loading ? <Loading /> : diskUi}
            </Card>
          </Col>
          <Col span={24}>
            <Card title={i18next.t("system:About OpenAgent")} bordered={true} style={{textAlign: "center"}}>
              <div>{i18next.t("system:🚀⚡️Open-Source LangChain-like AI Knowledge Database & Chat Bot with Admin UI and multi-model support (ChatGPT, Claude, Llama 3, DeepSeek R1, HuggingFace, etc.)")}</div>
              GitHub: <a target="_blank" rel="noreferrer" href="https://github.com/the-open-agent/openagent">OpenAgent</a>
              <br />
              {i18next.t("general:Version")}: <a target="_blank" rel="noreferrer" href={link}>{versionText}</a>
              <br />
              {i18next.t("system:Official website")}: <a target="_blank" rel="noreferrer" href="https://openagentai.org">https://openagentai.org</a>
              <br />
              {i18next.t("system:Community")}: <a target="_blank" rel="noreferrer" href="https://openagentai.org/#:~:text=OpenAgent%20API-,Community,-GitHub">Get in Touch!</a>
            </Card>
          </Col>
        </Row>
      );
    }
  }
}

export default SystemInfo;
