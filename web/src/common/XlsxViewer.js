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
import xlsx from "xlsx";
import {Spin, Tabs} from "antd";
import i18next from "i18next";

// XlsxViewer renders a spreadsheet (.xlsx / .xls) in the browser with SheetJS,
// so it works for local/private files — unlike the Office Online viewer, which
// needs a publicly reachable URL. Each sheet is a scrollable HTML table, with
// tabs to switch sheets.
class XlsxViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {loading: true, error: false, sheetNames: [], activeSheet: "", html: ""};
    this.reqId = 0;
    this.workbook = null;
  }

  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.url !== this.props.url) {
      this.load();
    }
  }

  load() {
    const {url} = this.props;
    if (!url) {
      return;
    }

    const reqId = ++this.reqId;
    this.setState({loading: true, error: false});

    fetch(url, {method: "GET", credentials: "include"})
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.arrayBuffer();
      })
      .then((buf) => {
        if (reqId !== this.reqId) {
          return;
        }
        this.workbook = xlsx.read(new Uint8Array(buf), {type: "array"});
        const names = this.workbook.SheetNames || [];
        const active = names[0] || "";
        this.setState({loading: false, error: false, sheetNames: names, activeSheet: active, html: this.sheetToHtml(active)});
      })
      .catch(() => {
        if (reqId === this.reqId) {
          this.setState({loading: false, error: true});
        }
      });
  }

  sheetToHtml(name) {
    const sheet = this.workbook && name ? this.workbook.Sheets[name] : null;
    if (!sheet) {
      return "";
    }
    return xlsx.utils.sheet_to_html(sheet, {editable: false});
  }

  onSheetChange = (name) => {
    this.setState({activeSheet: name, html: this.sheetToHtml(name)});
  };

  render() {
    const {loading, error, sheetNames, activeSheet, html} = this.state;
    return (
      <div style={{height: this.props.height, display: "flex", flexDirection: "column", border: "1px solid rgb(242,242,242)", borderRadius: "6px", overflow: "hidden", background: "#fff", position: "relative"}}>
        {loading ? (
          <div style={{position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center"}}>
            <Spin size="large" />
          </div>
        ) : null}
        {error ? (
          <div style={{padding: 24, textAlign: "center", color: "rgba(0,0,0,0.45)"}}>
            {i18next.t("general:Failed to get")}
          </div>
        ) : null}
        {!loading && !error ? (
          <React.Fragment>
            <div className="xlsxContainer" style={{flex: 1, minHeight: 0, overflow: "auto"}} dangerouslySetInnerHTML={{__html: html}} />
            {sheetNames.length > 1 ? (
              <Tabs
                size="small"
                activeKey={activeSheet}
                onChange={this.onSheetChange}
                items={sheetNames.map((n) => ({key: n, label: n}))}
                tabBarStyle={{margin: 0, padding: "0 8px"}}
                style={{flexShrink: 0, borderTop: "1px solid rgba(0, 0, 0, 0.08)"}}
              />
            ) : null}
          </React.Fragment>
        ) : null}
      </div>
    );
  }
}

export default XlsxViewer;
