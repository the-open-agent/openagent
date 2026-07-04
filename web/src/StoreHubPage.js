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
import {Avatar, Button, Card, Col, Empty, Input, Row, Segmented, Select, Spin, Tag, Tooltip, Typography} from "antd";
import {CopyOutlined, InfoCircleOutlined, LinkOutlined, RobotOutlined, SortAscendingOutlined, SortDescendingOutlined} from "@ant-design/icons";
import * as StoreBackend from "./backend/StoreBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import StoreHubDrawer, {getChatUrl} from "./StoreHubDrawer";

const {Text, Paragraph} = Typography;

class StoreHubPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stores: [],
      loading: true,
      view: "all",
      favoredStores: [],
      favoredLoading: false,
      drawerVisible: false,
      selectedStore: null,
      searchText: "",
      filterSubject: "",
      filterGrade: "",
      filterTopic: "",
      sortField: "",
      sortOrder: "asc",
    };
  }

  componentDidMount() {
    this.getHubStores();
  }

  isSignedIn() {
    const {account} = this.props;
    return account && !Setting.isAnonymousUser(account);
  }

  getActiveStores() {
    const {view, stores, favoredStores} = this.state;
    return view === "all" ? stores : favoredStores;
  }

  handleViewChange(view) {
    this.setState({view});
    if (view === "star" || view === "watch") {
      this.setState({favoredLoading: true});
      StoreBackend.getFavoredStores(view)
        .then((res) => {
          if (res.status === "ok") {
            this.setState({favoredStores: res.data || [], favoredLoading: false});
          } else {
            Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
            this.setState({favoredLoading: false});
          }
        })
        .catch(() => this.setState({favoredLoading: false}));
    }
  }

  getHubStores() {
    StoreBackend.getHubStores()
      .then((res) => {
        if (res.status === "ok") {
          this.setState({stores: res.data || [], loading: false});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          this.setState({loading: false});
        }
      })
      .catch(() => {
        this.setState({loading: false});
      });
  }

  getUniqueValues(field) {
    return [...new Set(this.getActiveStores().map(s => s[field]).filter(Boolean))].sort();
  }

  getFilteredStores() {
    const {searchText, filterSubject, filterGrade, filterTopic, sortField, sortOrder} = this.state;
    let result = [...this.getActiveStores()];

    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(s =>
        (s.displayName || s.name || "").toLowerCase().includes(q) ||
        (s.author || s.owner || "").toLowerCase().includes(q) ||
        (s.affiliation || "").toLowerCase().includes(q)
      );
    }

    if (filterSubject) {
      result = result.filter(s => s.subject === filterSubject);
    }
    if (filterGrade) {
      result = result.filter(s => s.grade === filterGrade);
    }
    if (filterTopic) {
      result = result.filter(s => s.topic === filterTopic);
    }

    if (sortField) {
      result.sort((a, b) => {
        let va, vb;
        if (sortField === "displayName") {
          va = (a.displayName || a.name || "").toLowerCase();
          vb = (b.displayName || b.name || "").toLowerCase();
        } else if (sortField === "author") {
          va = (a.author || a.owner || "").toLowerCase();
          vb = (b.author || b.owner || "").toLowerCase();
        } else {
          va = (a[sortField] || "").toLowerCase();
          vb = (b[sortField] || "").toLowerCase();
        }
        if (va < vb) {return sortOrder === "asc" ? -1 : 1;}
        if (va > vb) {return sortOrder === "asc" ? 1 : -1;}
        return 0;
      });
    }

    return result;
  }

  hasActiveFilters() {
    const {searchText, filterSubject, filterGrade, filterTopic, sortField} = this.state;
    return !!(searchText || filterSubject || filterGrade || filterTopic || sortField);
  }

  resetFilters() {
    this.setState({
      searchText: "",
      filterSubject: "",
      filterGrade: "",
      filterTopic: "",
      sortField: "",
      sortOrder: "asc",
    });
  }

  openDrawer(store) {
    this.setState({drawerVisible: true, selectedStore: store});
  }

  closeDrawer() {
    this.setState({drawerVisible: false, selectedStore: null});
  }

  handleStartChat(store) {
    const chatPath = `/stores/${store.owner}/${store.name}/chat`;
    if (store.endpoint) {
      window.open(getChatUrl(store), "_blank", "noopener,noreferrer");
    } else {
      this.closeDrawer();
      this.props.history.push(chatPath);
    }
  }

  handleViewAgent(store) {
    this.closeDrawer();
    this.props.history.push(`/agents/${store.owner}/${store.name}`);
  }

  handleCopyLink(store) {
    const url = getChatUrl(store);
    navigator.clipboard.writeText(url).then(() => {
      Setting.showMessage("success", i18next.t("general:Successfully copied"));
    }).catch(() => {
      Setting.showMessage("error", i18next.t("general:Failed to get"));
    });
  }

  renderFilterBar() {
    const {searchText, filterSubject, filterGrade, filterTopic, sortField, sortOrder} = this.state;
    const activeStores = this.getActiveStores();
    const subjects = this.getUniqueValues("subject");
    const grades = this.getUniqueValues("grade");
    const topics = this.getUniqueValues("topic");
    const allLabel = i18next.t("store:All");
    const filteredCount = this.getFilteredStores().length;
    const isFiltered = this.hasActiveFilters();

    const sortFieldOptions = [
      {value: "", label: i18next.t("general:Sort")},
      {value: "displayName", label: i18next.t("general:Display name")},
      {value: "author", label: i18next.t("general:Author")},
      {value: "affiliation", label: i18next.t("store:Affiliation")},
      {value: "subject", label: i18next.t("store:Subject")},
      {value: "grade", label: i18next.t("store:Grade")},
      {value: "topic", label: i18next.t("store:Topic")},
    ];

    return (
      <div style={{marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center"}}>
        {this.isSignedIn() ? (
          <Segmented
            value={this.state.view}
            onChange={(v) => this.handleViewChange(v)}
            options={[
              {value: "all", label: i18next.t("store:All agents")},
              {value: "star", label: i18next.t("store:Starred")},
              {value: "watch", label: i18next.t("store:Watching")},
            ]}
          />
        ) : null}
        <Input.Search
          placeholder={i18next.t("store:Please input your search term")}
          value={searchText}
          onChange={e => this.setState({searchText: e.target.value})}
          allowClear
          style={{width: 220}}
        />
        {subjects.length > 0 ? (
          <Select
            value={filterSubject || ""}
            onChange={v => this.setState({filterSubject: v})}
            style={{minWidth: 130}}
            options={[
              {value: "", label: `${i18next.t("store:Subject")}: ${allLabel}`},
              ...subjects.map(s => ({value: s, label: s})),
            ]}
          />
        ) : null}
        {grades.length > 0 ? (
          <Select
            value={filterGrade || ""}
            onChange={v => this.setState({filterGrade: v})}
            style={{minWidth: 130}}
            options={[
              {value: "", label: `${i18next.t("store:Grade")}: ${allLabel}`},
              ...grades.map(g => ({value: g, label: g})),
            ]}
          />
        ) : null}
        {topics.length > 0 ? (
          <Select
            value={filterTopic || ""}
            onChange={v => this.setState({filterTopic: v})}
            style={{minWidth: 130}}
            options={[
              {value: "", label: `${i18next.t("store:Topic")}: ${allLabel}`},
              ...topics.map(t => ({value: t, label: t})),
            ]}
          />
        ) : null}
        <Select
          value={sortField}
          onChange={v => this.setState({sortField: v})}
          style={{minWidth: 150}}
          options={sortFieldOptions}
        />
        {sortField ? (
          <Tooltip title={sortOrder === "asc" ? i18next.t("general:Click to sort descending") : i18next.t("general:Click to sort ascending")}>
            <Button
              icon={sortOrder === "asc" ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
              onClick={() => this.setState({sortOrder: sortOrder === "asc" ? "desc" : "asc"})}
            />
          </Tooltip>
        ) : null}
        {isFiltered ? (
          <Button onClick={() => this.resetFilters()}>{i18next.t("general:Reset")}</Button>
        ) : null}
        {isFiltered ? (
          <Text type="secondary" style={{fontSize: 13}}>
            {filteredCount} / {activeStores.length}
          </Text>
        ) : null}
      </div>
    );
  }

  renderStoreCard(store) {
    const initials = (store.displayName || store.name || "?")[0].toUpperCase();
    const description = store.brief || store.welcomeText || store.prompt || "";
    const authorName = store.author || store.owner;
    const chatUrl = getChatUrl(store);
    const isExternal = !!store.hubDbName;

    return (
      <Col xs={24} sm={12} md={8} lg={6} key={`${store.owner}/${store.name}/${store.hubDbName}`}>
        <Card
          hoverable
          style={{
            borderRadius: 12,
            height: "100%",
            cursor: "pointer",
            borderColor: "var(--ant-color-border)",
          }}
          bodyStyle={{padding: "20px"}}
          onClick={() => this.openDrawer(store)}
        >
          <div style={{display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12}}>
            {store.avatar ? (
              <Avatar size={52} src={store.avatar} style={{flexShrink: 0}} />
            ) : (
              <Avatar size={52} style={{backgroundColor: Setting.getAvatarColor(store.name), flexShrink: 0}}>
                {initials}
              </Avatar>
            )}
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display: "flex", alignItems: "center", gap: 6, marginBottom: 2}}>
                <div style={{fontWeight: 600, fontSize: 15, lineHeight: "22px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1}}>
                  {store.displayName || store.name}
                </div>
                {isExternal ? (
                  <Tooltip title={`${i18next.t("store:External store from")}: ${store.hubDbName}`}>
                    <Tag color="orange" style={{fontSize: 11, padding: "0 4px", lineHeight: "18px", margin: 0, flexShrink: 0}}>
                      {i18next.t("store:External")}
                    </Tag>
                  </Tooltip>
                ) : null}
              </div>
              <Text type="secondary" style={{fontSize: 12}}>
                {i18next.t("store:By")} {authorName}
              </Text>
              {store.affiliation ? (
                <div style={{fontSize: 11, color: "var(--ant-color-text-tertiary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                  {store.affiliation}
                </div>
              ) : null}
              <div style={{marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4}}>
                {store.subject ? <Tag color="purple" style={{fontSize: 11, padding: "0 4px", lineHeight: "18px", margin: 0}}>{store.subject}</Tag> : null}
                {store.grade ? <Tag color="cyan" style={{fontSize: 11, padding: "0 4px", lineHeight: "18px", margin: 0}}>{store.grade}</Tag> : null}
                {store.topic ? <Tag color="geekblue" style={{fontSize: 11, padding: "0 4px", lineHeight: "18px", margin: 0}}>{store.topic}</Tag> : null}
              </div>
            </div>
          </div>
          {description ? (
            <Paragraph
              ellipsis={{rows: 3}}
              style={{color: "var(--ant-color-text-secondary)", marginBottom: 12, fontSize: 13}}
            >
              {description}
            </Paragraph>
          ) : (
            <div style={{height: 60}} />
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 8px",
              background: "var(--ant-color-fill-quaternary)",
              borderRadius: 6,
              border: "1px solid var(--ant-color-border-secondary)",
              marginBottom: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <LinkOutlined style={{color: "var(--ant-color-primary)", fontSize: 11, flexShrink: 0}} />
            <Typography.Link
              href={chatUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{flex: 1, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}
              onClick={(e) => e.stopPropagation()}
            >
              {chatUrl}
            </Typography.Link>
            <Tooltip title={i18next.t("general:Copy")}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                style={{flexShrink: 0, height: 20, width: 20, minWidth: 20, padding: 0}}
                onClick={(e) => {e.stopPropagation(); this.handleCopyLink(store);}}
              />
            </Tooltip>
          </div>
          <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
            <div style={{display: "flex", alignItems: "center", gap: 4, color: "var(--ant-color-primary)", fontSize: 13}}>
              <InfoCircleOutlined />
              <span>{i18next.t("store:View Details")}</span>
            </div>
            <div
              style={{display: "flex", alignItems: "center", gap: 4, color: "var(--ant-color-text-secondary)", fontSize: 13, cursor: "pointer"}}
              onClick={(e) => {e.stopPropagation(); this.handleViewAgent(store);}}
            >
              <RobotOutlined />
              <span>{i18next.t("store:Enter Agent")}</span>
            </div>
          </div>
        </Card>
      </Col>
    );
  }

  renderEmptyForView() {
    const {view} = this.state;
    if (view === "star") {
      return <Empty description={i18next.t("store:No starred agents yet")} style={{marginTop: 60}} />;
    }
    if (view === "watch") {
      return <Empty description={i18next.t("store:No watched agents yet")} style={{marginTop: 60}} />;
    }
    return <Empty description={i18next.t("general:No published agents yet")} style={{marginTop: 60}} />;
  }

  render() {
    const {loading, favoredLoading, drawerVisible, selectedStore} = this.state;
    const filteredStores = this.getFilteredStores();
    const activeStores = this.getActiveStores();

    return (
      <div style={{padding: "24px 32px", minHeight: "100vh", background: "var(--ant-color-bg-layout)"}}>
        <div style={{marginBottom: 24}}>
          <h2 style={{fontWeight: 700, fontSize: 24, marginBottom: 4}}>{i18next.t("general:Hub")}</h2>
          <p style={{color: "var(--ant-color-text-secondary)", margin: 0}}>
            {this.props.site?.hubDesc || i18next.t("general:Hub desc")}
          </p>
        </div>
        {loading ? (
          <div style={{textAlign: "center", padding: "80px 0"}}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {this.renderFilterBar()}
            {favoredLoading ? (
              <div style={{textAlign: "center", padding: "80px 0"}}>
                <Spin size="large" />
              </div>
            ) : activeStores.length === 0 ? (
              this.renderEmptyForView()
            ) : filteredStores.length === 0 ? (
              <Empty description={i18next.t("general:No data")} style={{marginTop: 60}} />
            ) : (
              <Row gutter={[16, 16]}>
                {filteredStores.map(store => this.renderStoreCard(store))}
              </Row>
            )}
          </>
        )}
        <StoreHubDrawer
          store={selectedStore}
          visible={drawerVisible}
          onClose={() => this.closeDrawer()}
          onStartChat={(store) => this.handleStartChat(store)}
          onCopyLink={(store) => this.handleCopyLink(store)}
          onViewAgent={(store) => this.handleViewAgent(store)}
        />
      </div>
    );
  }
}

export default StoreHubPage;
