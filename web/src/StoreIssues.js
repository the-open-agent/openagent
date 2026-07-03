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
import {Button, Card, Empty, Input, Popconfirm, Segmented, Space, Spin, Tag, Typography} from "antd";
import {ArrowLeftOutlined, CheckCircleOutlined, CommentOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, PlusOutlined} from "@ant-design/icons";
import i18next from "i18next";
import * as IssueBackend from "./backend/IssueBackend";
import * as Setting from "./Setting";
import UserLabel from "./common/UserLabel";
import CommentArea from "./comment/CommentArea";

const {Text, Title, Paragraph} = Typography;

const STATUS_OPEN = "Open";
const STATUS_CLOSED = "Closed";

function StatusTag({status}) {
  if (status === STATUS_CLOSED) {
    return <Tag icon={<CheckCircleOutlined />} color="purple">{i18next.t("store:Closed")}</Tag>;
  }
  return <Tag icon={<ExclamationCircleOutlined />} color="green">{i18next.t("store:Open")}</Tag>;
}

class StoreIssues extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      issues: [],
      filter: "open",
      view: "list", // "list" | "form" | "detail"
      editing: false,
      currentIssue: null,
      formTitle: "",
      formContent: "",
      submitting: false,
    };
  }

  componentDidMount() {
    this.fetchIssues();
  }

  getStoreId() {
    const {store} = this.props;
    return `${store.owner}/${store.name}`;
  }

  fetchIssues(preserveView = false) {
    this.setState({loading: true});
    IssueBackend.getIssues(this.getStoreId())
      .then((res) => {
        if (res.status === "ok") {
          this.setState((prev) => {
            const next = {loading: false, issues: res.data || []};
            // Keep the currently open issue's counts fresh when refreshing in place.
            if (preserveView && prev.currentIssue) {
              const updated = (res.data || []).find((i) => i.owner === prev.currentIssue.owner && i.name === prev.currentIssue.name);
              if (updated) {next.currentIssue = updated;}
            }
            return next;
          });
        } else {
          this.setState({loading: false});
          Setting.showMessage("error", res.msg);
        }
      })
      .catch((err) => {
        this.setState({loading: false});
        Setting.showMessage("error", err.message || String(err));
      });
  }

  canManageIssue(issue) {
    const {account, store} = this.props;
    if (!account || !issue) {
      return false;
    }
    return account.name === issue.owner || account.name === store.owner || Setting.isAdminUser(account);
  }

  canCreate() {
    const {account} = this.props;
    return account && !Setting.isAnonymousUser(account);
  }

  openList = () => {
    this.setState({view: "list", currentIssue: null, editing: false});
    this.fetchIssues();
  };

  openNew = () => this.setState({view: "form", editing: false, currentIssue: null, formTitle: "", formContent: ""});

  openDetail = (issue) => this.setState({view: "detail", currentIssue: issue, editing: false});

  openEdit = (issue) => this.setState({view: "form", editing: true, currentIssue: issue, formTitle: issue.title, formContent: issue.content});

  submitForm = () => {
    const {editing, currentIssue, formTitle, formContent} = this.state;
    const title = formTitle.trim();
    if (title === "") {
      Setting.showMessage("error", i18next.t("store:Issue title cannot be empty"));
      return;
    }

    this.setState({submitting: true});
    const done = (res, onOk) => {
      this.setState({submitting: false});
      if (res.status === "ok") {
        onOk();
      } else {
        Setting.showMessage("error", res.msg);
      }
    };

    if (editing && currentIssue) {
      const updated = {...currentIssue, title, content: formContent};
      IssueBackend.updateIssue(currentIssue.owner, currentIssue.name, updated)
        .then((res) => done(res, () => {
          this.setState({currentIssue: updated});
          this.openDetail(updated);
          this.fetchIssues(true);
        }))
        .catch((err) => done({status: "error", msg: err.message || String(err)}));
    } else {
      IssueBackend.addIssue({store: this.getStoreId(), title, content: formContent})
        .then((res) => done(res, () => {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.openList();
        }))
        .catch((err) => done({status: "error", msg: err.message || String(err)}));
    }
  };

  toggleStatus = (issue) => {
    const newStatus = issue.status === STATUS_CLOSED ? STATUS_OPEN : STATUS_CLOSED;
    const updated = {...issue, status: newStatus};
    IssueBackend.updateIssue(issue.owner, issue.name, updated).then((res) => {
      if (res.status === "ok") {
        this.setState({currentIssue: updated});
        this.fetchIssues(true);
      } else {
        Setting.showMessage("error", res.msg);
      }
    }).catch((err) => Setting.showMessage("error", err.message || String(err)));
  };

  deleteIssue = (issue) => {
    IssueBackend.deleteIssue(issue.owner, issue.name).then((res) => {
      if (res.status === "ok") {
        Setting.showMessage("success", i18next.t("general:Successfully deleted"));
        this.openList();
      } else {
        Setting.showMessage("error", res.msg);
      }
    }).catch((err) => Setting.showMessage("error", err.message || String(err)));
  };

  getFilteredIssues() {
    const {issues, filter} = this.state;
    if (filter === "open") {return issues.filter((i) => i.status !== STATUS_CLOSED);}
    if (filter === "closed") {return issues.filter((i) => i.status === STATUS_CLOSED);}
    return issues;
  }

  renderList() {
    const {issues, filter} = this.state;
    const openCount = issues.filter((i) => i.status !== STATUS_CLOSED).length;
    const closedCount = issues.length - openCount;
    const filtered = this.getFilteredIssues();

    return (
      <div>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16}}>
          <Segmented
            value={filter}
            onChange={(v) => this.setState({filter: v})}
            options={[
              {value: "open", label: `${i18next.t("store:Open")} (${openCount})`},
              {value: "closed", label: `${i18next.t("store:Closed")} (${closedCount})`},
              {value: "all", label: `${i18next.t("store:All")} (${issues.length})`},
            ]}
          />
          {this.canCreate() && (
            <Button type="primary" icon={<PlusOutlined />} onClick={this.openNew}>
              {i18next.t("store:New issue")}
            </Button>
          )}
        </div>

        <Card size="small" styles={{body: {padding: 0}}}>
          {filtered.length === 0 ? (
            <Empty description={i18next.t("store:No issues yet")} style={{padding: "40px 0"}} />
          ) : (
            filtered.map((issue, idx) => (
              <div
                key={issue.name}
                onClick={() => this.openDetail(issue)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderTop: idx === 0 ? "none" : "1px solid var(--ant-color-border-secondary)",
                }}
              >
                {issue.status === STATUS_CLOSED
                  ? <CheckCircleOutlined style={{color: "#8250df", fontSize: 16, marginTop: 3}} />
                  : <ExclamationCircleOutlined style={{color: "#1a7f37", fontSize: 16, marginTop: 3}} />}
                <div style={{flex: 1, minWidth: 0}}>
                  <Text strong style={{fontSize: 15}} ellipsis={{tooltip: issue.title}}>{issue.title}</Text>
                  <div style={{display: "flex", alignItems: "center", gap: 6, marginTop: 2, color: "var(--ant-color-text-secondary)", fontSize: 12}}>
                    <span>{i18next.t("store:opened by")}</span>
                    <UserLabel user={issue.owner} account={this.props.account} showAvatar={false} nameStyle={{fontSize: 12}} />
                    <span>· {Setting.getFormattedDate(issue.createdTime)}</span>
                  </div>
                </div>
                {issue.commentCount > 0 && (
                  <Text type="secondary" style={{fontSize: 12, whiteSpace: "nowrap"}}>
                    <CommentOutlined /> {issue.commentCount}
                  </Text>
                )}
              </div>
            ))
          )}
        </Card>
      </div>
    );
  }

  renderForm() {
    const {editing, formTitle, formContent, submitting} = this.state;
    return (
      <Card size="small" title={editing ? i18next.t("store:Edit issue") : i18next.t("store:New issue")}>
        <Space direction="vertical" size="middle" style={{width: "100%"}}>
          <Input
            placeholder={i18next.t("store:Issue title")}
            value={formTitle}
            maxLength={200}
            onChange={(e) => this.setState({formTitle: e.target.value})}
          />
          <Input.TextArea
            placeholder={i18next.t("store:Leave a description")}
            value={formContent}
            autoSize={{minRows: 5, maxRows: 16}}
            maxLength={2000}
            onChange={(e) => this.setState({formContent: e.target.value})}
          />
          <Space>
            <Button type="primary" loading={submitting} onClick={this.submitForm}>
              {editing ? i18next.t("general:Save") : i18next.t("store:Submit new issue")}
            </Button>
            <Button onClick={() => (editing && this.state.currentIssue ? this.openDetail(this.state.currentIssue) : this.openList())}>
              {i18next.t("general:Cancel")}
            </Button>
          </Space>
        </Space>
      </Card>
    );
  }

  renderDetail() {
    const {currentIssue} = this.state;
    const {account, store} = this.props;
    if (!currentIssue) {
      return null;
    }
    const canManage = this.canManageIssue(currentIssue);
    const isClosed = currentIssue.status === STATUS_CLOSED;

    return (
      <div>
        <Button type="link" icon={<ArrowLeftOutlined />} style={{paddingLeft: 0, marginBottom: 8}} onClick={this.openList}>
          {i18next.t("store:Back to issues")}
        </Button>

        <div style={{display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap"}}>
          <Title level={4} style={{margin: 0, wordBreak: "break-word", flex: 1, minWidth: 0}}>{currentIssue.title}</Title>
          {canManage && (
            <Space>
              <Button size="small" onClick={() => this.toggleStatus(currentIssue)}>
                {isClosed ? i18next.t("store:Reopen") : i18next.t("store:Close issue")}
              </Button>
              <Button size="small" icon={<EditOutlined />} onClick={() => this.openEdit(currentIssue)}>
                {i18next.t("general:Edit")}
              </Button>
              <Popconfirm title={i18next.t("general:Sure to delete") + "?"} onConfirm={() => this.deleteIssue(currentIssue)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )}
        </div>

        <div style={{display: "flex", alignItems: "center", gap: 8, margin: "8px 0 16px", color: "var(--ant-color-text-secondary)", fontSize: 13}}>
          <StatusTag status={currentIssue.status} />
          <UserLabel user={currentIssue.owner} account={account} size={20} />
          <span>· {Setting.getFormattedDate(currentIssue.createdTime)}</span>
        </div>

        <Card size="small" style={{marginBottom: 16}}>
          {currentIssue.content ? (
            <Paragraph style={{margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word"}}>{currentIssue.content}</Paragraph>
          ) : (
            <Text type="secondary">{i18next.t("store:No description provided")}</Text>
          )}
        </Card>

        <CommentArea
          account={account}
          targetType="issue"
          targetKey={`${currentIssue.owner}/${currentIssue.name}`}
          targetOwner={store.owner}
        />
      </div>
    );
  }

  render() {
    const {loading, view, issues} = this.state;
    if (loading && issues.length === 0 && view === "list") {
      return <div style={{padding: 40, textAlign: "center"}}><Spin /></div>;
    }

    return (
      <Spin spinning={loading && view === "list"}>
        {view === "form" ? this.renderForm() : view === "detail" ? this.renderDetail() : this.renderList()}
      </Spin>
    );
  }
}

export default StoreIssues;
