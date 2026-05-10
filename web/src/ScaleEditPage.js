// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import React from "react";
import Loading from "./common/Loading";
import {Button, Col, Input, Row, Select, Space} from "antd";
import SectionCard from "./components/ui/section-card";
import * as ScaleBackend from "./backend/ScaleBackend";
import * as Setting from "./Setting";
import i18next from "i18next";

const {TextArea} = Input;

class ScaleEditPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      owner: props.match.params.owner,
      scaleName: props.match.params.scaleName,
      isNewScale: props.location?.state?.isNewScale || false,
      scale: null,
    };
  }

  UNSAFE_componentWillMount() {
    this.getScale();
  }

  getScale() {
    ScaleBackend.getScale(this.state.owner, this.state.scaleName)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({scale: res.data});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  updateScaleField(key, value) {
    const scale = {...this.state.scale};
    scale[key] = value;
    this.setState({scale});
  }

  renderScaleField(label, control, span = 8) {
    return (
      <Col style={{marginTop: "12px"}} span={Setting.isMobile() ? 22 : span}>
        <div style={{marginBottom: "6px", color: "var(--ant-color-text-secondary)", fontWeight: 500, lineHeight: "22px", fontSize: "13px"}}>{label}</div>
        {control}
      </Col>
    );
  }

  renderScaleActions() {
    const btnStyle = {
      backgroundColor: "var(--ant-color-bg-container)",
      borderColor: "var(--ant-color-border)",
      border: "1px solid var(--ant-color-border)",
      borderRadius: "10px",
      padding: "6px 10px",
    };
    return (
      <Space wrap>
        <Button style={btnStyle} onClick={() => this.submitScaleEdit(false)}>{i18next.t("general:Save")}</Button>
        <Button style={btnStyle} onClick={() => this.submitScaleEdit(true)}>{i18next.t("general:Save & Exit")}</Button>
      </Space>
    );
  }

  renderScale() {
    const s = this.state.scale;
    const rowGutter = [16, 8];
    return (
      <div>
        <div style={{marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{fontSize: "22px", fontWeight: 600}}>{i18next.t("task:Edit Scale")}</span>
          <div style={{display: "flex", gap: "8px", marginRight: "4px"}}>
            {this.renderScaleActions()}
          </div>
        </div>

        <SectionCard title={i18next.t("general:General Settings")} desc={i18next.t("general:General Settings desc")}>
          <Row gutter={rowGutter}>
            {this.renderScaleField(
              Setting.getLabel(i18next.t("general:Name"), i18next.t("general:Name - Tooltip")),
              <Input value={s.name} onChange={(e) => this.updateScaleField("name", e.target.value)} />,
              8
            )}
            {this.renderScaleField(
              Setting.getLabel(i18next.t("general:Display name"), i18next.t("general:Display name - Tooltip")),
              <Input value={s.displayName} onChange={(e) => this.updateScaleField("displayName", e.target.value)} />,
              8
            )}
            {Setting.isAdminUser(this.props.account) ? this.renderScaleField(
              Setting.getLabel(i18next.t("general:State"), i18next.t("general:State - Tooltip")),
              <Select
                virtual={false}
                style={{width: "100%"}}
                value={s.state || "Public"}
                onChange={(value) => this.updateScaleField("state", value)}
                options={[
                  {value: "Public", label: i18next.t("video:Public")},
                  {value: "Hidden", label: i18next.t("video:Hidden")},
                ]}
              />,
              8
            ) : null}
          </Row>
        </SectionCard>

        <SectionCard title={i18next.t("general:Content")}>
          <Row gutter={rowGutter}>
            {this.renderScaleField(
              Setting.getLabel(i18next.t("general:Text"), i18next.t("task:Scale - Tooltip")),
              <TextArea rows={12} value={s.text} onChange={(e) => this.updateScaleField("text", e.target.value)} />,
              24
            )}
          </Row>
        </SectionCard>
      </div>
    );
  }

  submitScaleEdit(exitAfterSave) {
    const scale = Setting.deepCopy(this.state.scale);
    ScaleBackend.updateScale(this.state.owner, this.state.scaleName, scale)
      .then((res) => {
        if (res.status === "ok" && res.data) {
          Setting.showMessage("success", i18next.t("general:Successfully saved"));
          this.setState({isNewScale: false, scaleName: this.state.scale.name});
          if (exitAfterSave) {
            this.props.history.push("/scales");
          } else {
            this.props.history.push(`/scales/${this.state.scale.owner}/${this.state.scale.name}`);
          }
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
        }
      })
      .catch((error) => {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${error}`);
      });
  }

  render() {
    return (
      <div style={{background: "var(--ant-color-bg-layout)", padding: "16px 20px 32px", minHeight: "100vh"}}>
        {this.state.scale !== null ? this.renderScale() : <Loading type="page" tip={i18next.t("general:Loading")} />}
      </div>
    );
  }
}

export default ScaleEditPage;
