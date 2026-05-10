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

import React from "react";
import {Col, Progress, Row, Tag, Tooltip} from "antd";
import SectionCard from "./components/ui/section-card";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CodeOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  GithubOutlined,
  GlobalOutlined,
  HddOutlined,
  LinkOutlined,
  SwapOutlined,
  ThunderboltOutlined,
  WifiOutlined
} from "@ant-design/icons";
import Loading from "./common/Loading";
import * as SystemBackend from "./backend/SystemInfo";
import * as Setting from "./Setting";
import i18next from "i18next";
import PrometheusInfoTable from "./table/PrometheusInfoTable";

function getUsageColor(percent) {
  if (percent >= 85) {return "#ff4d4f";}
  if (percent >= 60) {return "#fa8c16";}
  return "#52c41a";
}

function StatTitle({icon, text, live}) {
  return (
    <span style={{display: "flex", alignItems: "center", gap: 8}}>
      {icon}
      <span style={{fontWeight: 600, fontSize: 14}}>{text}</span>
      {live && (
        <span style={{display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 4}}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: "#52c41a",
            display: "inline-block",
            boxShadow: "0 0 0 0 rgba(82,196,26,0.7)",
            animation: "pulse-dot 1.8s ease-in-out infinite",
          }} />
        </span>
      )}
    </span>
  );
}

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
      this.setState({loading: false});
      if (res.status === "ok") {
        this.setState({systemInfo: res.data});
      } else {
        Setting.showMessage("error", res.msg);
        this.stopTimer();
      }

      const id = setInterval(() => {
        SystemBackend.getSystemInfo("").then(res => {
          this.setState({loading: false});
          if (res.status === "ok") {
            this.setState({systemInfo: res.data});
          } else {
            Setting.showMessage("error", res.msg);
            this.stopTimer();
          }
        }).catch(error => {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
          this.stopTimer();
        });

        SystemBackend.getPrometheusInfo().then(res => {
          this.setState({prometheusInfo: res.data});
        });
      }, 1000 * 2);

      this.setState({intervalId: id});
    }).catch(error => {
      Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
      this.stopTimer();
    });

    SystemBackend.getVersionInfo().then(res => {
      if (res.status === "ok") {
        this.setState({versionInfo: res.data});
      } else {
        Setting.showMessage("error", res.msg);
      }
    }).catch(err => {
      Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${err}`);
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
    const isDark = Setting.getIsDark();
    const isMobile = Setting.isMobile();

    const labelColor = isDark ? "#8b8fa8" : "#8c8c8c";
    const valueColor = isDark ? "#e8eaf0" : "#1a1a2e";
    const dividerColor = isDark ? "rgba(255,255,255,0.07)" : "#f5f5f5";

    const {systemInfo, prometheusInfo, versionInfo, loading} = this.state;

    // CPU
    const cpuUsages = systemInfo.cpuUsage || [];
    const avgCpu = cpuUsages.length > 0
      ? cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length
      : 0;

    const cpuUi = cpuUsages.length === 0
      ? <span style={{color: labelColor}}>{i18next.t("system:Failed to get CPU usage")}</span>
      : (
        <div>
          <div style={{textAlign: "center", marginBottom: 16}}>
            <Progress
              type="dashboard"
              percent={Number(avgCpu.toFixed(1))}
              strokeColor={getUsageColor(avgCpu)}
              trailColor={isDark ? "rgba(255,255,255,0.08)" : "#f0f0f0"}
              strokeWidth={8}
              width={100}
              format={p => (
                <span style={{color: valueColor, fontSize: 18, fontWeight: 700}}>{p}<span style={{fontSize: 12, fontWeight: 400}}>%</span></span>
              )}
            />
            <div style={{color: labelColor, fontSize: 12, marginTop: 4}}>
              {i18next.t("general:Average")} · {cpuUsages.length} {i18next.t("system:cores")}
            </div>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(cpuUsages.length, 4)}, 1fr)`,
            gap: 6,
          }}>
            {cpuUsages.map((usage, i) => {
              const pct = Number(usage.toFixed(1));
              const color = getUsageColor(pct);
              return (
                <Tooltip key={i} title={`Core ${i}: ${pct}%`}>
                  <div style={{textAlign: "center"}}>
                    <div style={{fontSize: 10, color: labelColor, marginBottom: 2}}>C{i}</div>
                    <div style={{
                      height: 48,
                      background: isDark ? "rgba(255,255,255,0.05)" : "#f5f5f5",
                      borderRadius: 4,
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${pct}%`,
                        background: color,
                        borderRadius: "0 0 4px 4px",
                        transition: "height 0.5s ease",
                        opacity: 0.85,
                      }} />
                    </div>
                    <div style={{fontSize: 10, color: labelColor, marginTop: 2}}>{pct}%</div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      );

    // Memory
    const memPct = systemInfo.memoryTotal > 0
      ? Number((systemInfo.memoryUsed / systemInfo.memoryTotal * 100).toFixed(1))
      : 0;

    const memUi = systemInfo.memoryTotal <= 0
      ? <span style={{color: labelColor}}>{i18next.t("system:Failed to get memory usage")}</span>
      : (
        <div style={{textAlign: "center"}}>
          <Progress
            type="circle"
            percent={memPct}
            strokeColor={getUsageColor(memPct)}
            trailColor={isDark ? "rgba(255,255,255,0.08)" : "#f0f0f0"}
            strokeWidth={8}
            width={120}
            format={p => (
              <span style={{color: valueColor, fontSize: 20, fontWeight: 700}}>{p}<span style={{fontSize: 12, fontWeight: 400}}>%</span></span>
            )}
          />
          <div style={{marginTop: 16, display: "flex", justifyContent: "space-around"}}>
            <div>
              <div style={{fontSize: 11, color: labelColor, marginBottom: 2}}>{i18next.t("system:Used")}</div>
              <div style={{fontSize: 14, fontWeight: 600, color: valueColor}}>{Setting.getFriendlyFileSize(systemInfo.memoryUsed)}</div>
            </div>
            <div style={{width: 1, background: dividerColor}} />
            <div>
              <div style={{fontSize: 11, color: labelColor, marginBottom: 2}}>{i18next.t("system:Total")}</div>
              <div style={{fontSize: 14, fontWeight: 600, color: valueColor}}>{Setting.getFriendlyFileSize(systemInfo.memoryTotal)}</div>
            </div>
          </div>
        </div>
      );

    // Disk
    const diskPct = systemInfo.diskTotal > 0
      ? Number((systemInfo.diskUsed / systemInfo.diskTotal * 100).toFixed(1))
      : 0;

    const diskUi = systemInfo.diskTotal <= 0
      ? <span style={{color: labelColor}}>{i18next.t("system:Failed to get disk usage")}</span>
      : (
        <div style={{textAlign: "center"}}>
          <Progress
            type="circle"
            percent={diskPct}
            strokeColor={getUsageColor(diskPct)}
            trailColor={isDark ? "rgba(255,255,255,0.08)" : "#f0f0f0"}
            strokeWidth={8}
            width={120}
            format={p => (
              <span style={{color: valueColor, fontSize: 20, fontWeight: 700}}>{p}<span style={{fontSize: 12, fontWeight: 400}}>%</span></span>
            )}
          />
          <div style={{marginTop: 16, display: "flex", justifyContent: "space-around"}}>
            <div>
              <div style={{fontSize: 11, color: labelColor, marginBottom: 2}}>{i18next.t("system:Used")}</div>
              <div style={{fontSize: 14, fontWeight: 600, color: valueColor}}>{Setting.getFriendlyFileSize(systemInfo.diskUsed)}</div>
            </div>
            <div style={{width: 1, background: dividerColor}} />
            <div>
              <div style={{fontSize: 11, color: labelColor, marginBottom: 2}}>{i18next.t("system:Total")}</div>
              <div style={{fontSize: 14, fontWeight: 600, color: valueColor}}>{Setting.getFriendlyFileSize(systemInfo.diskTotal)}</div>
            </div>
          </div>
        </div>
      );

    // Network
    const networkUi = systemInfo.networkTotal === undefined || systemInfo.networkTotal === null
      ? <span style={{color: labelColor}}>{i18next.t("system:Failed to get network usage")}</span>
      : (
        <div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 16,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: isDark ? "rgba(82,196,26,0.08)" : "rgba(82,196,26,0.06)",
              borderRadius: 8,
              border: isDark ? "1px solid rgba(82,196,26,0.15)" : "1px solid rgba(82,196,26,0.2)",
            }}>
              <span style={{display: "flex", alignItems: "center", gap: 6, color: "#52c41a", fontSize: 13}}>
                <ArrowUpOutlined />
                <span>{i18next.t("system:Sent")}</span>
              </span>
              <span style={{fontWeight: 600, color: valueColor, fontSize: 14}}>
                {Setting.getFriendlyFileSize(systemInfo.networkSent)}
              </span>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: isDark ? "rgba(22,119,255,0.08)" : "rgba(22,119,255,0.06)",
              borderRadius: 8,
              border: isDark ? "1px solid rgba(22,119,255,0.15)" : "1px solid rgba(22,119,255,0.2)",
            }}>
              <span style={{display: "flex", alignItems: "center", gap: 6, color: "#1677ff", fontSize: 13}}>
                <ArrowDownOutlined />
                <span>{i18next.t("system:Received")}</span>
              </span>
              <span style={{fontWeight: 600, color: valueColor, fontSize: 14}}>
                {Setting.getFriendlyFileSize(systemInfo.networkRecv)}
              </span>
            </div>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: isDark ? "rgba(255,255,255,0.04)" : "#fafafa",
            borderRadius: 8,
            border: `1px solid ${dividerColor}`,
          }}>
            <span style={{display: "flex", alignItems: "center", gap: 6, color: labelColor, fontSize: 13}}>
              <SwapOutlined />
              <span>{i18next.t("system:Total Throughput")}</span>
            </span>
            <span style={{fontWeight: 700, color: valueColor, fontSize: 16}}>
              {Setting.getFriendlyFileSize(systemInfo.networkTotal)}
            </span>
          </div>
        </div>
      );

    // Prometheus
    const latencyUi = !prometheusInfo?.apiLatency || prometheusInfo.apiLatency.length <= 0
      ? <Loading />
      : <PrometheusInfoTable prometheusInfo={prometheusInfo} table={"latency"} />;

    const throughputUi = !prometheusInfo?.apiThroughput || prometheusInfo.apiThroughput.length <= 0
      ? <Loading />
      : <PrometheusInfoTable prometheusInfo={prometheusInfo} table={"throughput"} />;

    // Version
    const link = versionInfo?.version ? `https://github.com/the-open-agent/openagent/releases/tag/${versionInfo.version}` : "";
    let versionText = versionInfo?.version || i18next.t("system:Unknown version");
    if (versionInfo?.commitOffset > 0) {
      versionText += ` (ahead+${versionInfo.commitOffset})`;
    }

    const iconColor = isDark ? "#7c8db5" : "#6b7280";

    const pulseStyle = `
      @keyframes pulse-dot {
        0% { box-shadow: 0 0 0 0 rgba(82,196,26,0.6); }
        70% { box-shadow: 0 0 0 6px rgba(82,196,26,0); }
        100% { box-shadow: 0 0 0 0 rgba(82,196,26,0); }
      }
    `;

    if (!isMobile) {
      return (
        <>
          <style>{pulseStyle}</style>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <SectionCard
                variant="bordered"
                id="cpu-card"
                title={<StatTitle icon={<DashboardOutlined style={{color: iconColor}} />} text={i18next.t("system:CPU Usage")} live />}
              >
                {loading ? <Loading /> : cpuUi}
              </SectionCard>
            </Col>
            <Col span={8}>
              <SectionCard
                variant="bordered"
                id="memory-card"
                title={<StatTitle icon={<DatabaseOutlined style={{color: iconColor}} />} text={i18next.t("system:Memory Usage")} live />}
              >
                {loading ? <Loading /> : memUi}
              </SectionCard>
            </Col>
            <Col span={8}>
              <SectionCard
                variant="bordered"
                id="disk-card"
                title={<StatTitle icon={<HddOutlined style={{color: iconColor}} />} text={i18next.t("system:Disk Usage")} live />}
              >
                {loading ? <Loading /> : diskUi}
              </SectionCard>
            </Col>
            <Col span={8}>
              <SectionCard
                variant="bordered"
                id="network-card"
                title={<StatTitle icon={<WifiOutlined style={{color: iconColor}} />} text={i18next.t("system:Network Usage")} live />}
              >
                {loading ? <Loading /> : networkUi}
              </SectionCard>
            </Col>
            <Col span={8}>
              <SectionCard
                variant="bordered"
                id="latency-card"
                title={<StatTitle icon={<ThunderboltOutlined style={{color: iconColor}} />} text={i18next.t("system:API Latency")} />}
              >
                {loading ? <Loading /> : latencyUi}
              </SectionCard>
            </Col>
            <Col span={8}>
              <SectionCard
                variant="bordered"
                id="throughput-card"
                title={<StatTitle icon={<SwapOutlined style={{color: iconColor}} />} text={i18next.t("system:API Throughput")} />}
              >
                {loading ? <Loading /> : throughputUi}
              </SectionCard>
            </Col>
            <Col span={24}>
              <SectionCard
                variant="bordered"
                id="about-card"
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, #1e1f22 0%, #1a1c2a 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)",
                }}
                title={<StatTitle icon={<CodeOutlined style={{color: iconColor}} />} text={i18next.t("system:About OpenAgent")} />}
              >
                <div style={{display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap"}}>
                  <div style={{flex: 1, minWidth: 260}}>
                    <div style={{
                      fontSize: 14,
                      color: isDark ? "#a0a8bf" : "#595959",
                      lineHeight: 1.7,
                      marginBottom: 16,
                    }}>
                      {i18next.t("system:🚀⚡️Next-generation personal AI assistant powered by LLM, RAG and agent loops,\n" +
                        "supporting computer-use, browser-use and coding agent")}
                    </div>
                    <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
                      <a target="_blank" rel="noreferrer" href="https://github.com/the-open-agent/openagent"
                        style={{display: "flex", alignItems: "center", gap: 5, textDecoration: "none"}}>
                        <Tag icon={<GithubOutlined />} color={isDark ? "default" : "default"}
                          style={{
                            cursor: "pointer", borderRadius: 6, padding: "2px 10px",
                            background: isDark ? "rgba(255,255,255,0.07)" : "#f5f5f5",
                            color: valueColor,
                          }}>
                          GitHub
                        </Tag>
                      </a>
                      <a target="_blank" rel="noreferrer" href={link}
                        style={{display: "flex", alignItems: "center", gap: 5, textDecoration: "none"}}>
                        <Tag icon={<LinkOutlined />} color="blue"
                          style={{cursor: "pointer", borderRadius: 6, padding: "2px 10px"}}>
                          {versionText}
                        </Tag>
                      </a>
                      <a target="_blank" rel="noreferrer" href="https://openagentai.org"
                        style={{display: "flex", alignItems: "center", gap: 5, textDecoration: "none"}}>
                        <Tag icon={<GlobalOutlined />} color="green"
                          style={{cursor: "pointer", borderRadius: 6, padding: "2px 10px"}}>
                          {i18next.t("system:Official website")}
                        </Tag>
                      </a>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </Col>
          </Row>
        </>
      );
    } else {
      return (
        <>
          <style>{pulseStyle}</style>
          <Row gutter={[12, 12]}>
            {[
              {id: "cpu-card", icon: <DashboardOutlined style={{color: iconColor}} />, title: i18next.t("system:CPU Usage"), ui: cpuUi, live: true},
              {id: "memory-card", icon: <DatabaseOutlined style={{color: iconColor}} />, title: i18next.t("system:Memory Usage"), ui: memUi, live: true},
              {id: "disk-card", icon: <HddOutlined style={{color: iconColor}} />, title: i18next.t("system:Disk Usage"), ui: diskUi, live: true},
              {id: "network-card", icon: <WifiOutlined style={{color: iconColor}} />, title: i18next.t("system:Network Usage"), ui: networkUi, live: true},
            ].map(({id, icon, title, ui, live}) => (
              <Col key={id} span={24}>
                <SectionCard
                  variant="bordered"
                  id={id}
                  title={<StatTitle icon={icon} text={title} live={live} />}
                >
                  {loading ? <Loading /> : ui}
                </SectionCard>
              </Col>
            ))}
            <Col span={24}>
              <SectionCard
                variant="bordered"
                id="about-card"
                title={<StatTitle icon={<CodeOutlined style={{color: iconColor}} />} text={i18next.t("system:About OpenAgent")} />}
              >
                <div style={{fontSize: 13, color: isDark ? "#a0a8bf" : "#595959", lineHeight: 1.7, marginBottom: 14}}>
                  {i18next.t("system:🚀⚡️Next-generation personal AI assistant powered by LLM, RAG and agent loops,\nsupporting computer-use, browser-use and coding agent")}
                </div>
                <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
                  <a target="_blank" rel="noreferrer" href="https://github.com/the-open-agent/openagent" style={{textDecoration: "none"}}>
                    <Tag icon={<GithubOutlined />} style={{cursor: "pointer", borderRadius: 6}}>GitHub</Tag>
                  </a>
                  <a target="_blank" rel="noreferrer" href={link} style={{textDecoration: "none"}}>
                    <Tag icon={<LinkOutlined />} color="blue" style={{cursor: "pointer", borderRadius: 6}}>{versionText}</Tag>
                  </a>
                  <a target="_blank" rel="noreferrer" href="https://openagentai.org" style={{textDecoration: "none"}}>
                    <Tag icon={<GlobalOutlined />} color="green" style={{cursor: "pointer", borderRadius: 6}}>{i18next.t("system:Official website")}</Tag>
                  </a>
                </div>
              </SectionCard>
            </Col>
          </Row>
        </>
      );
    }
  }
}

export default SystemInfo;
