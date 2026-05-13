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

import {AppTooltip} from "./components/ui/tooltip";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Badge, Button, Card, Col, Empty, Input, Modal, Row, Select, Spin, Tag, Typography} from "antd";
import {CheckCircleOutlined, CloudDownloadOutlined, SearchOutlined} from "@ant-design/icons";
import * as SkillBackend from "./backend/SkillBackend";
import * as Setting from "./Setting";
import i18next from "i18next";

const {Text, Paragraph} = Typography;
const {Search} = Input;
const {Option} = Select;

/**
 * SkillMarketplaceModal — Browse and install skills from external marketplaces.
 *
 * Props:
 *   open          {boolean}            Whether the modal is visible.
 *   onClose       {() => void}         Called when the modal should close.
 *   onInstalled   {(skillName) => void} Called after a successful install.
 *   installedNames {string[]}          Names of skills already installed (to show badge).
 */
function SkillMarketplaceModal({open, onClose, onInstalled, installedNames = []}) {
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [keyword, setKeyword] = useState("");
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState({}); // {skillName: true}
  const searchTimerRef = useRef(null);

  // Load marketplace sources once when modal opens.
  useEffect(() => {
    if (!open) {
      return;
    }
    SkillBackend.getMarketplaceSources()
      .then((res) => {
        if (res.status === "ok" && res.data) {
          setSources(res.data);
          if (res.data.length > 0 && !selectedSource) {
            setSelectedSource(res.data[0].id);
          }
        }
      });
  }, [open]); // eslint-disable-line

  const doSearch = useCallback((src, kw) => {
    setLoading(true);
    setSkills([]);
    SkillBackend.getMarketplaceSkills(src, kw)
      .then((res) => {
        setLoading(false);
        if (res.status === "ok") {
          setSkills(res.data || []);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      })
      .catch((err) => {
        setLoading(false);
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${err}`);
      });
  }, []);

  // Trigger search when source changes or on first source load.
  useEffect(() => {
    if (!open || !selectedSource) {
      return;
    }
    doSearch(selectedSource, keyword);
  }, [open, selectedSource]); // eslint-disable-line

  function handleKeywordChange(value) {
    setKeyword(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      doSearch(selectedSource, value);
    }, 500);
  }

  function handleInstall(item) {
    setInstalling((prev) => ({...prev, [item.name]: true}));
    SkillBackend.installMarketplaceSkill(item)
      .then((res) => {
        setInstalling((prev) => ({...prev, [item.name]: false}));
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          onInstalled && onInstalled(res.data.name);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch((err) => {
        setInstalling((prev) => ({...prev, [item.name]: false}));
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${err}`);
      });
  }

  function handleClose() {
    setKeyword("");
    setSkills([]);
    onClose();
  }

  const installedSet = new Set(installedNames);

  return (
    <Modal
      title={
        <span>
          <CloudDownloadOutlined style={{marginRight: 8}} />
          {i18next.t("skill:Skill Marketplace")}
        </span>
      }
      open={open}
      onCancel={handleClose}
      width={900}
      footer={[
        <Button key="close" onClick={handleClose}>
          {i18next.t("general:Close")}
        </Button>,
      ]}
      bodyStyle={{padding: "16px 24px"}}
    >
      {/* Toolbar: source selector + search */}
      <div style={{display: "flex", gap: 12, marginBottom: 16, alignItems: "center"}}>
        <Select
          style={{width: 200}}
          value={selectedSource}
          onChange={(val) => setSelectedSource(val)}
          loading={sources.length === 0}
        >
          {sources.map((src) => (
            <Option key={src.id} value={src.id}>{src.name}</Option>
          ))}
        </Select>
        <Search
          placeholder={i18next.t("skill:Search marketplace placeholder")}
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          onSearch={(val) => {
            clearTimeout(searchTimerRef.current);
            doSearch(selectedSource, val);
          }}
          prefix={<SearchOutlined />}
          allowClear
          style={{flex: 1}}
        />
        <Button
          onClick={() => doSearch(selectedSource, keyword)}
          loading={loading}
        >
          {i18next.t("general:Refresh")}
        </Button>
      </div>

      {/* Skill card grid */}
      {loading ? (
        <div style={{textAlign: "center", padding: "48px 0"}}>
          <Spin size="large" tip={i18next.t("general:Loading")} />
        </div>
      ) : skills.length === 0 ? (
        <Empty
          description={i18next.t("skill:No skills found")}
          style={{padding: "48px 0"}}
        />
      ) : (
        <div style={{maxHeight: 520, overflowY: "auto", paddingRight: 4}}>
          <Row gutter={[12, 12]}>
            {skills.map((item) => {
              const isInstalled = installedSet.has(item.name);
              const isInstalling = installing[item.name];
              return (
                <Col key={`${item.source}-${item.name}`} xs={24} sm={12} md={8}>
                  <Badge.Ribbon
                    text={i18next.t("skill:Installed")}
                    color="green"
                    style={{display: isInstalled ? undefined : "none"}}
                  >
                    <Card
                      size="small"
                      hoverable
                      style={{height: "100%", display: "flex", flexDirection: "column"}}
                      bodyStyle={{flex: 1, display: "flex", flexDirection: "column"}}
                    >
                      {/* Header row: emoji + name + type tag */}
                      <div style={{display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6}}>
                        {item.emoji && (
                          <span style={{fontSize: 20, lineHeight: 1, flexShrink: 0}}>{item.emoji}</span>
                        )}
                        <div style={{flex: 1, minWidth: 0}}>
                          <Text strong style={{display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                            {item.displayName || item.name}
                          </Text>
                          {item.type && (
                            <Tag color="blue" style={{marginTop: 2, fontSize: 11}}>{item.type}</Tag>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <Paragraph
                        ellipsis={{rows: 2}}
                        style={{fontSize: 12, color: "rgba(0,0,0,0.6)", flex: 1, marginBottom: 8}}
                      >
                        {item.description || "—"}
                      </Paragraph>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div style={{marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 4}}>
                          {item.tags.slice(0, 4).map((tag) => (
                            <Tag key={tag} style={{fontSize: 11, margin: 0}}>{tag}</Tag>
                          ))}
                        </div>
                      )}

                      {/* Footer: homepage + install button */}
                      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto"}}>
                        {item.homepage ? (
                          <AppTooltip title={item.homepage}>
                            <a href={item.homepage} target="_blank" rel="noopener noreferrer" style={{fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block"}}>
                              {item.homepage.replace(/^https?:\/\//, "")}
                            </a>
                          </AppTooltip>
                        ) : <span />}
                        <Button
                          type={isInstalled ? "default" : "primary"}
                          size="small"
                          icon={isInstalled ? <CheckCircleOutlined /> : <CloudDownloadOutlined />}
                          loading={isInstalling}
                          onClick={() => handleInstall(item)}
                        >
                          {isInstalled ? i18next.t("skill:Reinstall") : i18next.t("skill:Install")}
                        </Button>
                      </div>
                    </Card>
                  </Badge.Ribbon>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {/* Result count */}
      {!loading && skills.length > 0 && (
        <div style={{marginTop: 12, textAlign: "right", color: "rgba(0,0,0,0.45)", fontSize: 12}}>
          {i18next.t("general:{total} in total").replace("{total}", skills.length)}
        </div>
      )}
    </Modal>
  );
}

export default SkillMarketplaceModal;
