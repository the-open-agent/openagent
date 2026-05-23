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

import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  Paragraph,
  TextRun
} from "docx";
import {saveAs} from "file-saver";
import i18next from "i18next";
import {formatCategoryTitleForDocx} from "./taskResultFormat";

const BODY_SIZE = 24;
const LABEL_SIZE = 24;

function dataUrlToUint8Array(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return null;
  }
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  try {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function isZhLocale() {
  const lang = i18next.language || "";
  return lang === "zh" || lang.indexOf("zh-") === 0;
}

function displayOrDash(value) {
  if (value === undefined || value === null) {
    return "—";
  }
  const s = String(value).trim();
  return s.length ? s : "—";
}

function bodyParagraph(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({
      text: String(text ?? ""),
      size: opts.size ?? BODY_SIZE,
      italics: opts.italics,
    })],
    spacing: {
      after: opts.after ?? 160,
      line: opts.line ?? 360,
      lineRule: LineRuleType.AUTO,
    },
    indent: opts.firstLineIndent ? {firstLine: 480} : undefined,
  });
}

function labeledLine(label, value, spacingAfter = 140) {
  return new Paragraph({
    children: [
      new TextRun({text: `${label}：`, bold: true, size: LABEL_SIZE}),
      new TextRun({text: displayOrDash(value), size: LABEL_SIZE}),
    ],
    spacing: {after: spacingAfter, line: 360, lineRule: LineRuleType.AUTO},
  });
}

function imageParagraphFromDataUrl(dataUrl, widthEmu, heightEmu) {
  const data = dataUrlToUint8Array(dataUrl);
  if (!data) {
    return null;
  }
  return new Paragraph({
    children: [
      new ImageRun({
        type: "png",
        data,
        transformation: {width: widthEmu, height: heightEmu},
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: {after: 280},
  });
}

function buildMetaSection(result) {
  const pairs = [
    [i18next.t("task:Unit Name"), result.title],
    [i18next.t("task:Designer"), result.designer],
    [i18next.t("video:Stage"), result.stage],
    [i18next.t("task:Participants"), result.participants],
    [i18next.t("store:Grade"), result.grade],
    [i18next.t("task:Instructor"), result.instructor],
    [i18next.t("store:Subject"), result.subject],
    [i18next.t("video:School"), result.school],
    [i18next.t("task:Other Subjects"), result.otherSubjects],
    [i18next.t("task:Textbook"), result.textbook],
  ];
  return pairs.map(([label, value]) => labeledLine(label, value, 160));
}

/**
 * @param {object} result
 * @param {{ fileName: string, chartImages?: { radar?: string, bar?: string, pie?: string, lowScoreBar?: string } }} options
 */
export async function downloadTaskAnalysisReportDocx(result, options) {
  const fileName = options.fileName || "task_report.docx";
  const chartImages = options.chartImages || {};
  const su = i18next.t("task:Score Unit");
  const zh = isZhLocale();

  const children = [];

  const titleText = result.title
    ? `${i18next.t("task:Report")} — ${result.title}`
    : i18next.t("task:Report");

  children.push(new Paragraph({
    children: [new TextRun({text: titleText, bold: true, size: 36})],
    alignment: AlignmentType.CENTER,
    spacing: {before: 120, after: 480, line: 400, lineRule: LineRuleType.AUTO},
  }));

  children.push(new Paragraph({
    text: i18next.t("task:I. Basic Information"),
    heading: HeadingLevel.HEADING_2,
    spacing: {before: 200, after: 240},
  }));
  children.push(...buildMetaSection(result));

  children.push(new Paragraph({
    text: i18next.t("task:II. Overall Score"),
    heading: HeadingLevel.HEADING_2,
    spacing: {before: 360, after: 240},
  }));
  children.push(bodyParagraph(
    `${i18next.t("task:Overall Score")}：${displayOrDash(result.score)}${su}。`,
    {firstLineIndent: true, after: 320}
  ));

  const hasAnyChart = chartImages.radar || chartImages.bar || chartImages.pie || chartImages.lowScoreBar;
  if (hasAnyChart) {
    children.push(new Paragraph({
      text: i18next.t("task:III. Chart Analysis"),
      heading: HeadingLevel.HEADING_2,
      spacing: {before: 360, after: 200},
    }));

    const chartBlocks = [
      {key: "radar", cap: i18next.t("task:Radar chart"), url: chartImages.radar},
      {key: "bar", cap: i18next.t("task:Bar chart"), url: chartImages.bar},
      {key: "pie", cap: i18next.t("task:Pie chart"), url: chartImages.pie},
      {key: "lowScoreBar", cap: i18next.t("task:Low score vertical bar chart"), url: chartImages.lowScoreBar},
    ];
    chartBlocks.forEach(({cap, url}) => {
      if (!url) {
        return;
      }
      children.push(new Paragraph({
        text: cap,
        heading: HeadingLevel.HEADING_3,
        spacing: {before: 200, after: 160},
      }));
      const img = imageParagraphFromDataUrl(url, 480, 320);
      if (img) {
        children.push(img);
      }
    });
  }

  const categories = result.categories || [];
  if (categories.length > 0) {
    children.push(new Paragraph({
      text: i18next.t("task:IV. Detailed Evaluation"),
      heading: HeadingLevel.HEADING_2,
      spacing: {before: 400, after: 240},
    }));

    categories.forEach((cat, catIdx) => {
      const baseName = formatCategoryTitleForDocx(cat, catIdx, zh);
      const catTitle = zh
        ? `${baseName}（${i18next.t("task:Score")}：${displayOrDash(cat.score)}${su}）`
        : `${baseName} (${i18next.t("task:Score")}: ${displayOrDash(cat.score)}${su})`;

      children.push(new Paragraph({
        text: catTitle,
        heading: HeadingLevel.HEADING_3,
        spacing: {before: catIdx === 0 ? 120 : 360, after: 200},
      }));

      const items = cat.items || [];
      items.forEach((item, itemIdx) => {
        const itemHead = zh
          ? `（${itemIdx + 1}）${item.name || "—"}（${i18next.t("task:Score")}：${displayOrDash(item.score)}${su}）`
          : `${itemIdx + 1}. ${item.name || "—"} (${i18next.t("task:Score")}: ${displayOrDash(item.score)}${su})`;

        children.push(new Paragraph({
          text: itemHead,
          heading: HeadingLevel.HEADING_4,
          spacing: {before: 240, after: 160},
        }));

        children.push(labeledLine(i18next.t("task:Advantages"), item.advantage, 180));
        children.push(labeledLine(i18next.t("task:Disadvantages"), item.disadvantage, 180));
        children.push(labeledLine(i18next.t("task:Suggestion"), item.suggestion, 360));
      });
    });
  }

  const doc = new Document({
    title: titleText,
    sections: [{
      properties: {
        page: {
          margin: {top: 1440, right: 1440, bottom: 1440, left: 1800},
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}
