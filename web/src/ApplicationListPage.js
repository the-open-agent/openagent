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
import {Link} from "react-router-dom";
import {Alert, Button, Dropdown, Modal, Popconfirm, Table, Tag, Tooltip} from "antd";
import {CloudUploadOutlined, DeleteOutlined, EditOutlined, EyeOutlined, LinkOutlined, MoreOutlined} from "@ant-design/icons";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as ApplicationBackend from "./backend/ApplicationBackend";
import i18next from "i18next";
import * as TemplateBackend from "./backend/TemplateBackend";

class ApplicationListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      templates: [],
      k8sStatus: null,
      k8sError: null,
      deploying: {},
    };
  }

  componentDidMount() {
    this.getTemplates();
    this.getK8sStatus();
  }

  getTemplates() {
    TemplateBackend.getTemplates(this.props.account.name)
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            templates: res.data || [],
          });
        }
      });
  }

  getK8sStatus() {
    TemplateBackend.getK8sStatus()
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            k8sStatus: res.data,
            k8sError: null,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          this.setState({
            k8sError: res.msg,
          });
        }
      })
      .catch(error => {
        this.setState({
          k8sError: error.toString(),
        });
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${error}`);
      });
  }

  deployApplication(record, index) {
    this.setState(prevState => ({
      deploying: {
        ...prevState.deploying,
        [index]: true,
      },
    }));

    ApplicationBackend.deployApplication(record)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deployed"));
          this.setState({
            data: this.state.data.map((item) =>
              item.name === record.name ? {...item, ...res.data} : item
            ),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to deploy")}: ${res.msg}`);
        }
        this.setState(prevState => ({
          deploying: {
            ...prevState.deploying,
            [index]: false,
          },
        }));
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to deploy")}: ${error}`);
        this.setState(prevState => ({
          deploying: {
            ...prevState.deploying,
            [index]: false,
          },
        }));
      });
  }

  undeployApplication(record, index) {
    this.setState(prevState => ({
      deploying: {
        ...prevState.deploying,
        [index]: true,
      },
    }));

    ApplicationBackend.undeployApplication(record.owner, record.name)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully undeployed"));
          this.setState({
            data: this.state.data.map((item) =>
              item.name === record.name ? {...item, status: i18next.t("application:Not Deployed")} : item
            ),
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to undeploy")}: ${res.msg}`);
        }
        this.setState(prevState => ({
          deploying: {
            ...prevState.deploying,
            [index]: false,
          },
        }));
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to undeploy")}: ${error}`);
        this.setState(prevState => ({
          deploying: {
            ...prevState.deploying,
            [index]: false,
          },
        }));
      });
  }

  newApplication() {
    const randomName = Setting.getRandomName();
    const defaultParameters = "";

    return {
      owner: this.props.account.name,
      name: `application_${randomName}`,
      createdTime: moment().format(),
      displayName: `${i18next.t("application:New Application")} - ${randomName}`,
      description: "",
      template: this.state.templates[0]?.name || "",
      namespace: `openagent-application-${randomName}`,
      parameters: defaultParameters,
      status: "Not Deployed",
    };
  }

  addApplication() {
    const newApplication = this.newApplication();
    ApplicationBackend.addApplication(newApplication)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully added"));
          this.props.history.push({
            pathname: `/applications/${newApplication.name}`,
            state: {isNewApplication: true},
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  deleteItem = async(i) => {
    return ApplicationBackend.deleteApplication(this.state.data[i]);
  };

  deleteApplication(record) {
    ApplicationBackend.deleteApplication(record)
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          this.setState({
            data: this.state.data.filter((item) => item.name !== record.name),
            pagination: {
              ...this.state.pagination,
              total: this.state.pagination.total - 1,
            },
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to delete")}: ${error}`);
      });
  }

  renderTable(applications) {
    const columns = [
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "160px",
        sorter: (a, b) => a.name.localeCompare(b.name),
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/applications/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "200px",
        sorter: (a, b) => a.displayName.localeCompare(b.displayName),
        ...this.getColumnSearchProps("displayName"),
      },
      {
        title: i18next.t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "160px",
        sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: i18next.t("general:Description"),
        dataIndex: "description",
        key: "description",
        width: "250px",
        sorter: (a, b) => a.description.localeCompare(b.description),
        ...this.getColumnSearchProps("description"),
        render: (text, record, index) => {
          return (
            <Tooltip placement="left" title={Setting.getShortText(text, 1000)}>
              <div style={{maxWidth: "250px"}}>
                {Setting.getShortText(text, 100)}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: i18next.t("general:Template"),
        dataIndex: "template",
        key: "template",
        width: "150px",
        sorter: (a, b) => a.template.localeCompare(b.template),
        ...this.getColumnSearchProps("template"),
        render: (text, record, index) => {
          if (text === "") {
            return null;
          }
          return (
            <Link to={`/templates/${text}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("template:Basic config"),
        dataIndex: "basicConfigOptions",
        key: "basicConfigOptions",
        width: "200px",
        render: (text, record, index) => {
          return (
            text?.length > 0 ? text.map((option, i) => {
              if (option.parameter === "host") {
                return <Tag key={i}>{option.parameter}: <a href={"http://" + option.setting} style={{textDecoration: "underline"}}>{option.setting}</a></Tag>;
              } else {
                return <Tag key={i}>{option.parameter}: {option.setting}</Tag>;
              }
            }) : null
          );
        },
      },
      {
        title: i18next.t("general:Status"),
        dataIndex: "status",
        key: "status",
        width: "120px",
        sorter: (a, b) => a.status.localeCompare(b.status),
        ...this.getColumnSearchProps("status"),
        render: (text, record, index) => {
          return Setting.getApplicationStatusTag(text);
        },
      },
      {
        title: i18next.t("general:URL"),
        dataIndex: "url",
        key: "url",
        width: "140px",
        render: (text, record, index) => {
          if (!text || record.status === "Not Deployed") {
            return null;
          }
          return (
            <a target="_blank" rel="noreferrer" href={text} style={{display: "flex", alignItems: "center"}}>
              <LinkOutlined style={{marginRight: 4}} />
              <Tooltip title={text}>
                {text}
              </Tooltip>
            </a>
          );
        },
      },
      {
        title: i18next.t("general:Namespace"),
        dataIndex: "namespace",
        key: "namespace",
        width: "150px",
        sorter: (a, b) => a.namespace.localeCompare(b.namespace),
        ...this.getColumnSearchProps("namespace"),
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "150px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (text, record, index) => {
          const moreMenuItems = [];
          if (record.status === "Not Deployed") {
            moreMenuItems.push({
              key: "deploy",
              icon: <CloudUploadOutlined />,
              label: i18next.t("application:Deploy"),
              disabled: this.state.deploying[index],
            });
          } else {
            moreMenuItems.push({
              key: "view",
              icon: <EyeOutlined />,
              label: i18next.t("general:View"),
            });
            moreMenuItems.push({
              key: "undeploy",
              label: i18next.t("application:Undeploy"),
              danger: true,
              disabled: this.state.deploying[index],
            });
          }
          return (
            <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
              <Button
                style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                type="default"
                icon={<EditOutlined />}
                onClick={() => this.props.history.push(`/applications/${record.name}`)}
                title={i18next.t("general:Edit")}
              />
              <Popconfirm
                title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
                onConfirm={() => this.deleteApplication(record)}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
              >
                <Button
                  style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
              <Dropdown
                menu={{
                  items: moreMenuItems,
                  onClick: ({key}) => {
                    if (key === "deploy") {this.deployApplication(record, index);}
                    if (key === "undeploy") {
                      Modal.confirm({
                        title: `${i18next.t("general:Sure to undeploy")}: ${record.name} ?`,
                        okText: i18next.t("general:OK"),
                        cancelText: i18next.t("general:Cancel"),
                        onOk: () => this.undeployApplication(record, index),
                      });
                    }
                    if (key === "view") {this.props.history.push(`/applications/${record.name}/view`, {application: record});}
                  },
                }}
                trigger={["click"]}
              >
                <Button
                  style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                  icon={<MoreOutlined />}
                />
              </Dropdown>
            </div>
          );
        },
      },
    ];

    const paginationProps = {
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100", "1000", "10000", "100000"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={applications} rowKey="name" rowSelection={this.getRowSelection()} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Applications")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addApplication.bind(this)}>{i18next.t("general:Add")}</Button>
              <Button type="default" size="small" onClick={() => this.props.history.push("/application-store")} style={{marginLeft: 8}}>{i18next.t("general:Add from application store")}</Button>
              {this.state.selectedRowKeys.length > 0 && (
                <Popconfirm title={`${i18next.t("general:Sure to delete")}: ${this.state.selectedRowKeys.length} ${i18next.t("general:items")} ?`} onConfirm={() => this.performBulkDelete(this.state.selectedRows, this.state.selectedRowKeys)} okText={i18next.t("general:OK")} cancelText={i18next.t("general:Cancel")}>
                  <Button type="primary" danger size="small" icon={<DeleteOutlined />} style={{marginLeft: 8}}>
                    {i18next.t("general:Delete")} ({this.state.selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              )}
                       &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              {i18next.t("general:Status")}:
              &nbsp;
              {this.state.k8sStatus === "Connected" ? Setting.getDisplayTag(i18next.t("general:Active"), "green") : Setting.getDisplayTag(i18next.t("general:Inactive"), "red")}
              {this.state.k8sStatus !== "Connected" && this.state.k8sError && (
                <Alert message={this.state.k8sError} type="error" size="small" style={{marginLeft: "8px", display: "inline-flex", alignItems: "center", minHeight: "unset", padding: "2px 8px"}} showIcon closable />
              )}
            </div>
          )}
          loading={this.getTableLoading()}
          onChange={this.handleTableChange}
        />
      </div>
    );
  }

  fetch = (params = {}) => {
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    ApplicationBackend.getApplications(this.props.account.name, params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
      .then((res) => {
        this.setState({
          loading: false,
        });
        if (res.status === "ok") {
          this.setState({
            data: res.data,
            pagination: {
              ...params.pagination,
              total: res.data2,
            },
            searchText: params.searchText,
            searchedColumn: params.searchedColumn,
          });
        } else {
          if (Setting.isResponseDenied(res)) {
            this.setState({
              isAuthorized: false,
            });
          } else {
            Setting.showMessage("error", res.msg);
          }
        }
      });
  };
}

export default ApplicationListPage;
