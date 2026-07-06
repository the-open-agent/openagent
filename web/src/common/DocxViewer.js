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
import {renderAsync} from "docx-preview";
import {Spin} from "antd";
import i18next from "i18next";

// DocxViewer renders a .docx entirely in the browser (via docx-preview), so it
// works for local/private files — unlike the Office Online viewer, which needs a
// publicly reachable URL. The Word page is rendered at its natural width and
// then scaled down proportionally (CSS zoom) to fit the preview box, so the
// whole document is visible without changing its layout.
class DocxViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {loading: true, error: false};
    this.scrollRef = React.createRef();
    this.contentRef = React.createRef();
    this.reqId = 0;
    this.resizeObserver = null;
    this.applyScale = this.applyScale.bind(this);
  }

  componentDidMount() {
    this.load();
    if (typeof ResizeObserver !== "undefined" && this.scrollRef.current) {
      this.resizeObserver = new ResizeObserver(this.applyScale);
      this.resizeObserver.observe(this.scrollRef.current);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.url !== this.props.url) {
      this.load();
    }
  }

  componentWillUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  load() {
    const {url} = this.props;
    const content = this.contentRef.current;
    if (!url || !content) {
      return;
    }

    const reqId = ++this.reqId;
    this.setState({loading: true, error: false});
    content.style.zoom = "1";
    content.innerHTML = "";

    fetch(url, {method: "GET", credentials: "include"})
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => renderAsync(blob, content, undefined, {inWrapper: true, breakPages: true}))
      .then(() => {
        if (reqId === this.reqId) {
          this.setState({loading: false});
          this.applyScale();
        }
      })
      .catch(() => {
        if (reqId === this.reqId) {
          this.setState({loading: false, error: true});
        }
      });
  }

  // Scale the rendered Word page proportionally so the full page width fits the
  // preview box, preserving the document's original layout.
  applyScale() {
    const scrollBox = this.scrollRef.current;
    const content = this.contentRef.current;
    if (!scrollBox || !content) {
      return;
    }
    content.style.zoom = "1";
    const page = content.querySelector("section.docx");
    if (!page) {
      return;
    }
    const pageWidth = page.offsetWidth;
    const available = scrollBox.clientWidth - 24;
    if (pageWidth > 0 && available > 0) {
      content.style.zoom = String(Math.min(1, available / pageWidth));
    }
  }

  render() {
    return (
      <div ref={this.scrollRef} style={{height: this.props.height, overflow: "auto", border: "1px solid rgb(242,242,242)", borderRadius: "6px", background: "rgb(250,250,250)", position: "relative"}}>
        {this.state.loading ? (
          <div style={{position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center"}}>
            <Spin size="large" />
          </div>
        ) : null}
        {this.state.error ? (
          <div style={{padding: 24, textAlign: "center", color: "rgba(0,0,0,0.45)"}}>
            {i18next.t("general:Failed to get")}
          </div>
        ) : null}
        <div ref={this.contentRef} />
      </div>
    );
  }
}

export default DocxViewer;
