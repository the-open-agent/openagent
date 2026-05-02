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

import React from "react";
import {Button, Modal, Result, Spin} from "antd";
import {withRouter} from "react-router-dom";
import * as Setting from "./Setting";
import i18next from "i18next";

class AuthCallback extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      msg: null,
      errorDetails: null,
      showDetailsModal: false,
    };
  }

  UNSAFE_componentWillMount() {
    this.login();
  }

  getFromLink() {
    const from = sessionStorage.getItem("from");
    if (from === null) {
      return "/";
    }
    return from;
  }

  login() {
    Setting.signin().then((res) => {
      if (res.status === "ok") {
        Setting.showMessage("success", i18next.t("general:Successfully logged in"));

        const link = this.getFromLink();
        Setting.goToLink(link);
      } else {
        this.setState({
          msg: res.msg,
          errorDetails: res,
        });
      }
    });
  }

  handleHelp = () => {
    window.open("https://openagentai.org/help/", "_blank");
  };

  handleDetails = () => {
    this.setState({showDetailsModal: true});
  };

  handleCloseDetails = () => {
    this.setState({showDetailsModal: false});
  };

  renderErrorDetails() {
    const {errorDetails} = this.state;
    if (!errorDetails) {
      return null;
    }

    const details = [];

    if (errorDetails.msg) {
      details.push({
        label: i18next.t("login:Error Message"),
        value: errorDetails.msg,
      });
    }

    // Display additional error details for debugging purposes.
    // The backend should sanitize sensitive information before sending it.
    if (errorDetails.data) {
      details.push({
        label: i18next.t("login:Additional Information"),
        value: typeof errorDetails.data === "string" ? errorDetails.data : JSON.stringify(errorDetails.data, null, 2),
      });
    }

    if (errorDetails.data2) {
      details.push({
        label: i18next.t("login:More Details"),
        value: typeof errorDetails.data2 === "string" ? errorDetails.data2 : JSON.stringify(errorDetails.data2, null, 2),
      });
    }

    return (
      <div style={{textAlign: "left"}}>
        {details.map((detail, index) => (
          <div key={index} style={{marginBottom: "16px"}}>
            <strong>{detail.label}:</strong>
            <pre style={{
              marginTop: "8px",
              padding: "12px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {detail.value}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  render() {
    return (
      <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 120px)"}}>
        {this.state.msg === null ? (
          <Spin
            size="large"
            tip={i18next.t("login:Signing in...")}
          />
        ) : (
          <div style={{display: "inline"}}>
            <Result
              status="error"
              title={i18next.t("login:Login Error")}
              subTitle={this.state.msg}
              extra={[
                <Button type="primary" key="details" onClick={this.handleDetails}>
                  {i18next.t("login:Details")}
                </Button>,
                <Button key="help" onClick={this.handleHelp}>
                  {i18next.t("login:Help")}
                </Button>,
              ]}
            />
            <Modal
              title={i18next.t("login:Error Details")}
              open={this.state.showDetailsModal}
              onCancel={this.handleCloseDetails}
              footer={[
                <Button key="close" type="primary" onClick={this.handleCloseDetails}>
                  {i18next.t("general:Close")}
                </Button>,
              ]}
              width={700}
            >
              {this.renderErrorDetails()}
            </Modal>
          </div>
        )}
      </div>
    );
  }
}

export default withRouter(AuthCallback);
