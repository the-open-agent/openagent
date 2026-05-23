// Copyright 2023 The OpenAgent Authors. All Rights Reserved.
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

import React, {useRef, useState} from "react";
import {Button, Modal, Table, Tag} from "antd";
import {DownloadOutlined, FullscreenOutlined} from "@ant-design/icons";
import i18next from "i18next";
import TaskAnalysisRadarChart from "./TaskAnalysisRadarChart";
import TaskAnalysisBarChart from "./TaskAnalysisBarChart";
import TaskAnalysisPieChart from "./TaskAnalysisPieChart";
import {downloadTaskAnalysisReportDocx} from "./taskReportDocx";
import {formatCategoryHeading} from "./taskResultFormat";
import {getScoreBandColor} from "./taskAnalysisScoreBands";
import * as Setting from "./Setting";

const taskChartCardStyle = {
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  border: "1px solid #ebeef2",
  borderRadius: "10px",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)",
  padding: "12px 14px 10px",
  overflow: "hidden",
};

const taskChartCaptionStyle = {
  fontSize: "16px",
  fontWeight: 600,
  marginBottom: "10px",
  paddingBottom: "10px",
  borderBottom: "1px solid #f0f0f0",
  color: "rgba(0, 0, 0, 0.85)",
  lineHeight: 1.45,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
};

export default function TaskAnalysisReport({result, downloadFileName}) {
  const radarRef = useRef(null);
  const barRef = useRef(null);
  const pieRef = useRef(null);
  const lowScoreBarRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(null);
  if (!result) {
    return null;
  }
  const categories = result.categories || [];

  const metaItems = [
    {label: i18next.t("task:Unit Name"), value: result.title},
    {label: i18next.t("task:Designer"), value: result.designer},
    {label: i18next.t("video:Stage"), value: result.stage},
    {label: i18next.t("task:Participants"), value: result.participants},
    {label: i18next.t("store:Grade"), value: result.grade},
    {label: i18next.t("task:Instructor"), value: result.instructor},
    {label: i18next.t("store:Subject"), value: result.subject},
    {label: i18next.t("video:School"), value: result.school},
    {label: i18next.t("task:Other Subjects"), value: result.otherSubjects},
    {label: i18next.t("task:Textbook"), value: result.textbook},
  ];

  const reportColumns = [
    {title: i18next.t("task:Sub-criteria"), dataIndex: "name", key: "name", width: "12%"},
    {
      title: i18next.t("task:Score"),
      dataIndex: "score",
      key: "score",
      width: "8%",
      render: (score) => {
        const text = `${score}${i18next.t("task:Score Unit")}`;
        const hex = getScoreBandColor(score, categories);
        if (!hex) {
          return text;
        }
        return (
          <Tag color={hex} style={{margin: 0}}>
            {text}
          </Tag>
        );
      },
    },
    {title: i18next.t("task:Advantages"), dataIndex: "advantage", key: "advantage", width: "27%"},
    {title: i18next.t("task:Disadvantages"), dataIndex: "disadvantage", key: "disadvantage", width: "27%"},
    {title: i18next.t("task:Suggestion"), dataIndex: "suggestion", key: "suggestion", width: "26%"},
  ];
  const radarAxis = (() => {
    if (categories.length === 0) {
      return {min: 0, max: 5};
    }
    const scores = [];
    (categories || []).forEach((c) => {
      (c.items || []).forEach((item) => {
        scores.push(Number(item.score) || 0);
      });
    });
    if (scores.length === 0) {
      (categories || []).forEach((c) => {
        scores.push(Number(c.score) || 0);
      });
    }
    if (scores.length === 0) {
      return {min: 0, max: 5};
    }
    const maxScore = Math.max(...scores);
    if (maxScore <= 5) {
      return {min: 0, max: 5};
    }
    if (maxScore <= 10) {
      return {min: 0, max: 10};
    }
    // Percentage scale: fixed 50–100 axis range for clearer between-dimension contrast
    return {min: 50, max: 100};
  })();

  const hasCharts = categories.length > 0;

  const getChartDataUrl = (ref) => {
    const comp = ref?.current;
    if (!comp || typeof comp.getEchartsInstance !== "function") {
      return null;
    }
    const inst = comp.getEchartsInstance();
    if (!inst) {
      return null;
    }
    const opts = {type: "png", pixelRatio: 2, backgroundColor: "#fff"};
    try {
      return inst.getDataURL(opts);
    } catch {
      return null;
    }
  };

  const handleDownloadReport = async() => {
    setDownloading(true);
    try {
      const chartImages = {};
      const r = getChartDataUrl(radarRef);
      if (r) {
        chartImages.radar = r;
      }
      const b = getChartDataUrl(barRef);
      if (b) {
        chartImages.bar = b;
      }
      const p = getChartDataUrl(pieRef);
      if (p) {
        chartImages.pie = p;
      }
      const lb = getChartDataUrl(lowScoreBarRef);
      if (lb) {
        chartImages.lowScoreBar = lb;
      }
      await downloadTaskAnalysisReportDocx(result, {
        fileName: downloadFileName || "task_report.docx",
        chartImages,
      });
      Setting.showMessage("success", i18next.t("general:Successfully downloaded"));
    } catch (err) {
      Setting.showMessage("error", err?.message || String(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{marginTop: "16px"}}>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", marginBottom: "16px", padding: "12px", border: "1px solid #f0f0f0", borderRadius: "6px", background: "#fafafa"}}>
        {metaItems.map((item, idx) => (
          <div key={idx} style={{display: "flex", gap: "8px"}}>
            <span style={{fontWeight: 600, whiteSpace: "nowrap"}}>{item.label}：</span>
            <span>{item.value || "-"}</span>
          </div>
        ))}
      </div>
      <div style={{marginBottom: "12px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap"}}>
        <div style={{fontSize: "16px", fontWeight: 600}}>
          {i18next.t("task:Overall Score")}：<span style={{color: "#1677ff", fontSize: "20px"}}>{result.score}</span>
        </div>
        <Button type="primary" icon={<DownloadOutlined />} loading={downloading} onClick={handleDownloadReport}>
          {i18next.t("task:Download report")}
        </Button>
      </div>
      {hasCharts && (
        <div
          style={{
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "repeat(2, minmax(400px, auto))",
            gap: "24px",
          }}
        >
          <div style={taskChartCardStyle}>
            <div style={taskChartCaptionStyle}>
              {i18next.t("task:Chart caption radar")}
              <Button type="text" size="small" icon={<FullscreenOutlined />} style={{position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", color: "#8c8c8c"}} onClick={() => setFullscreenChart("radar")} />
            </div>
            <div style={{flex: 1, minHeight: 0}}>
              <TaskAnalysisRadarChart categories={categories} radarMin={radarAxis.min} radarMax={radarAxis.max} chartRef={radarRef} />
            </div>
          </div>
          <div style={taskChartCardStyle}>
            <div style={taskChartCaptionStyle}>
              {i18next.t("task:Chart caption bar ranked")}
              <Button type="text" size="small" icon={<FullscreenOutlined />} style={{position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", color: "#8c8c8c"}} onClick={() => setFullscreenChart("bar")} />
            </div>
            <div style={{flex: 1, minHeight: 0}}>
              <TaskAnalysisBarChart categories={categories} chartRef={barRef} />
            </div>
          </div>
          <div style={taskChartCardStyle}>
            <div style={taskChartCaptionStyle}>
              {i18next.t("task:Chart caption pie")}
              <Button type="text" size="small" icon={<FullscreenOutlined />} style={{position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", color: "#8c8c8c"}} onClick={() => setFullscreenChart("pie")} />
            </div>
            <div style={{flex: 1, minHeight: 0}}>
              <TaskAnalysisPieChart categories={categories} chartRef={pieRef} />
            </div>
          </div>
          <div style={taskChartCardStyle}>
            <div style={taskChartCaptionStyle}>
              {i18next.t("task:Chart caption priority dimensions")}
              <Button type="text" size="small" icon={<FullscreenOutlined />} style={{position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", color: "#8c8c8c"}} onClick={() => setFullscreenChart("lowscore")} />
            </div>
            <div style={{flex: 1, minHeight: 0}}>
              <TaskAnalysisBarChart categories={categories} chartRef={lowScoreBarRef} orientation="vertical" maxScoreExclusive={70} />
            </div>
          </div>
        </div>
      )}
      <Modal
        open={fullscreenChart !== null}
        footer={null}
        onCancel={() => setFullscreenChart(null)}
        width="95vw"
        style={{top: 20, maxWidth: "95vw"}}
        styles={{body: {height: "80vh", padding: "16px", display: "flex", flexDirection: "column"}}}
        title={
          fullscreenChart === "radar" ? i18next.t("task:Chart caption radar") :
            fullscreenChart === "bar" ? i18next.t("task:Chart caption bar ranked") :
              fullscreenChart === "pie" ? i18next.t("task:Chart caption pie") :
                fullscreenChart === "lowscore" ? i18next.t("task:Chart caption priority dimensions") : ""
        }
      >
        <div style={{flex: 1, minHeight: 0}}>
          {fullscreenChart === "radar" && <TaskAnalysisRadarChart categories={categories} radarMin={radarAxis.min} radarMax={radarAxis.max} />}
          {fullscreenChart === "bar" && <TaskAnalysisBarChart categories={categories} />}
          {fullscreenChart === "pie" && <TaskAnalysisPieChart categories={categories} />}
          {fullscreenChart === "lowscore" && <TaskAnalysisBarChart categories={categories} orientation="vertical" maxScoreExclusive={70} />}
        </div>
      </Modal>
      {categories.map((cat, idx) => (
        <div key={idx} style={{marginBottom: "24px"}}>
          <div style={{fontWeight: 600, marginBottom: "8px", fontSize: "14px"}}>
            {formatCategoryHeading(cat, idx)}（{i18next.t("task:Score")}：{cat.score}{i18next.t("task:Score Unit")}）
          </div>
          <Table
            size="small"
            bordered
            pagination={false}
            columns={reportColumns}
            dataSource={(cat.items || []).map((item, i) => ({...item, key: i}))}
          />
        </div>
      ))}
    </div>
  );
}
