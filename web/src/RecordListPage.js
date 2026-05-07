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
import {Link} from "react-router-dom";
import {Alert, Button, Popconfirm, Popover, Switch, Table, Tooltip, Typography} from "antd";
import moment from "moment";
import * as Setting from "./Setting";
import * as RecordBackend from "./backend/RecordBackend";
import * as ProviderBackend from "./backend/ProviderBackend";
import i18next from "i18next";
import BaseListPage from "./BaseListPage";
import {CloseCircleFilled, DeleteOutlined, EditOutlined, SearchOutlined, UploadOutlined} from "@ant-design/icons";
import Editor from "./common/Editor";
import CommitResultWidget from "./component/record/CommitResultWidget";

class RecordListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      providerMap: {},
      enableCrossChain: this.getEnableCrossChainFromStorage(),
      enableDecoding: this.getEnableDecodingFromStorage(),
      queryResult: "",
      isComparing: false,
    };
  }

  componentDidMount() {
    this.getProviders();
  }

  getEnableCrossChainFromStorage() {
    const saved = localStorage.getItem("enableCrossChain");
    if (saved === null || saved === undefined) {
      return false;
    }
    return JSON.parse(saved) === true;
  }

  getEnableDecodingFromStorage() {
    const saved = localStorage.getItem("enableDecoding");
    if (saved === null || saved === undefined) {
      return false;
    }
    return JSON.parse(saved) === true;
  }

  toggleEnableCrossChain = () => {
    const newValue = !this.state.enableCrossChain;
    this.setState({
      enableCrossChain: newValue,
    });
    localStorage.setItem("enableCrossChain", JSON.stringify(newValue));
  };

  toggleEnableDecoding = () => {
    const newValue = !this.state.enableDecoding;
    this.setState({
      enableDecoding: newValue,
    });
    localStorage.setItem("enableDecoding", JSON.stringify(newValue));
  };

  getProviders() {
    ProviderBackend.getProviders(this.props.account.owner)
      .then((res) => {
        if (res.status === "ok") {
          const providerMap = {};
          for (const provider of res.data) {
            providerMap[provider.name] = provider;
          }
          this.setState({
            providerMap: providerMap,
          });
        } else {
          Setting.showMessage("error", res.msg);
        }
      });
  }

  newRecord() {
    return {
      owner: this.props.account.owner,
      name: Setting.GenerateId(),
      createdTime: moment().format(),
      provider: "",
      organization: this.props.account.owner,
      clientIp: "::1",
      user: this.props.account.name,
      method: "POST",
      requestUri: "/api/get-account",
      action: "login",
      count: 1,
      isTriggered: false,
    };
  }

  addRecord() {
    const newRecord = this.newRecord();
    RecordBackend.addRecord(newRecord)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/records/${newRecord.owner}/${newRecord.id}`, mode: "add"});
          Setting.showMessage("success", i18next.t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  deleteItem = async(i) => {
    return RecordBackend.deleteRecord(this.state.data[i]);
  };

  deleteRecord(i) {
    RecordBackend.deleteRecord(this.state.data[i])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully deleted"));
          this.setState({
            data: Setting.deleteRow(this.state.data, i),
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

  commitRecord(i, isFirst = true) {
    const commitMethod = isFirst ? RecordBackend.commitRecord : RecordBackend.commitRecordSecond;
    commitMethod(this.state.data[i])
      .then((res) => {
        if (res.status === "ok") {
          Setting.showMessage("success", i18next.t("general:Successfully committed"));
          this.fetch({
            pagination: this.state.pagination,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to commit")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to commit")}: ${error}`);
      });
  }

  queryRecord = (record, isFirst = true) => {
    const queryMethod = isFirst ? RecordBackend.queryRecord : RecordBackend.queryRecordSecond;
    this.setState({
      isComparing: true,
      queryResult: "",
    });
    queryMethod(record.owner, record.name).then((res) => {
      if (res.status === "ok") {
        const queryResult = res.data;
        this.setState({
          queryResult: queryResult,
          isComparing: false,
        });
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to query")}: ${res.msg}`);
        this.setState({
          isComparing: false,
        });
      }
    }).catch(error => {
      Setting.showMessage("error", `${i18next.t("general:Failed to query")}: ${error}`);
      this.setState({
        isComparing: false,
      });
    });
  };

  renderTable(records) {
    const actionIconButtonStyle = {
      minWidth: "28px",
      width: "28px",
      height: "28px",
      padding: 0,
      borderRadius: "6px",
    };

    const columns = [
      {
        title: i18next.t("general:Organization"),
        dataIndex: "organization",
        key: "organization",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("organization"),
        render: (text, record, index) => {
          return (
            <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.props.account).replace("/account", `/organizations/${text}`)}>
              {text}
            </a>
          );
        },
      },
      {
        title: i18next.t("general:ID"),
        dataIndex: "id",
        key: "id",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("id"),
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "300px",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/records/${record.organization}/${record.id}`}>{text}</Link>
          );
        },
      },
      {
        title: i18next.t("general:Client IP"),
        dataIndex: "clientIp",
        key: "clientIp",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("clientIp"),
        render: (text, record, index) => {
          return (
            <a target="_blank" rel="noreferrer" href={`https://db-ip.com/${text}`}>
              {text}
            </a>
          );
        },
      },
      // {
      //   title: i18next.t("general:User agent"),
      //   dataIndex: "userAgent",
      //   key: "userAgent",
      //   width: "150px",
      //   sorter: true,
      //   ...this.getColumnSearchProps("userAgent"),
      //   render: (text, record, index) => {
      //     return text;
      //   },
      // },
      {
        title: i18next.t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "150px",
        sorter: true,
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: i18next.t("general:Provider"),
        dataIndex: "provider",
        key: "provider",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("provider"),
        render: (text, record, index) => {
          return (
            <Link to={`/providers/${text}`}>
              {
                Setting.getShortText(text, 25)
              }
            </Link>
          );
        },
      },
      (this.state.enableCrossChain ? {
        title: i18next.t("general:Provider 2"),
        dataIndex: "provider2",
        key: "provider2",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("provider2"),
        render: (text, record, index) => {
          return (
            <Link to={`/providers/${text}`}>
              {
                Setting.getShortText(text, 25)
              }
            </Link>
          );
        },
      } : {
        title: i18next.t("general:Provider 2"),
        hidden: true,
      }),
      {
        title: i18next.t("general:User"),
        dataIndex: "user",
        key: "user",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("user"),
        render: (text, record, index) => {
          return (
            <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.props.account).replace("/account", `/users/${record.organization}/${record.user}`)}>
              {text}
            </a>
          );
        },
      },
      {
        title: i18next.t("general:Method"),
        dataIndex: "method",
        key: "method",
        width: "110px",
        sorter: true,
        filterMultiple: false,
        filters: [
          {text: "GET", value: "GET"},
          {text: "HEAD", value: "HEAD"},
          {text: "POST", value: "POST"},
          {text: "PUT", value: "PUT"},
          {text: "DELETE", value: "DELETE"},
          {text: "CONNECT", value: "CONNECT"},
          {text: "OPTIONS", value: "OPTIONS"},
          {text: "TRACE", value: "TRACE"},
          {text: "PATCH", value: "PATCH"},
        ],
      },
      {
        title: i18next.t("general:Request URI"),
        dataIndex: "requestUri",
        key: "requestUri",
        width: "200px",
        sorter: true,
        ...this.getColumnSearchProps("requestUri"),
      },
      {
        title: i18next.t("general:Language"),
        dataIndex: "language",
        key: "language",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("language"),
      },
      {
        title: i18next.t("general:Query"),
        dataIndex: "query",
        key: "query",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("query"),
      },
      // TODO i18n
      {
        title: i18next.t("general:Region"),
        dataIndex: "region",
        key: "region",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("region"),
      },
      {
        title: i18next.t("general:City"),
        dataIndex: "city",
        key: "city",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("city"),
      },
      {
        title: i18next.t("general:Unit"),
        dataIndex: "unit",
        key: "unit",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("unit"),
      },
      {
        title: i18next.t("general:Section"),
        dataIndex: "section",
        key: "section",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("section"),
      },
      {
        title: i18next.t("general:Count"),
        dataIndex: "count",
        key: "count",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("count"),
        render: (text, record, index) => {
          // Show 1 for zero values (backward compatibility)
          return text === 0 || !text ? 1 : text;
        },
      },
      {
        title: i18next.t("general:Response"),
        dataIndex: "response",
        key: "response",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("response"),
      },
      {
        title: i18next.t("general:Object"),
        dataIndex: "object",
        key: "object",
        width: "200px",
        sorter: true,
        ...this.getColumnSearchProps("object"),
        render: (text, record, index) => {
          if (!text || text === "") {
            return (
              <div style={{maxWidth: "200px"}}>
                {Setting.getShortText(text, 50)}
              </div>
            );
          }

          if (!this.state.enableDecoding) {
            return (
              <div style={{maxWidth: "200px"}}>
                ***
              </div>
            );
          }

          let formattedText;
          let isValidJson = false;
          let errorMessage;

          try {
            // Try to parse and format JSON
            const parsedJson = JSON.parse(text);
            formattedText = JSON.stringify(parsedJson, null, 2);
            isValidJson = true;
          } catch (error) {
            // If parsing fails, use original text
            formattedText = text;
            isValidJson = false;
            errorMessage = error.message;
          }

          return (
            <Popover
              placement="right"
              content={
                <div style={{width: "600px", height: "400px", display: "flex", flexDirection: "column", gap: "12px"}}>
                  {!isValidJson && (
                    <Alert type="error" showIcon message={
                      <Typography.Paragraph ellipsis={{expandable: "collapsible"}} style={{margin: 0}}>{errorMessage}</Typography.Paragraph>}
                    />)}
                  <Editor
                    value={formattedText}
                    lang={isValidJson ? "json" : "text"}
                    fillHeight
                    dark
                    readOnly
                  />
                </div>
              }
              trigger="hover"
            >
              <div style={{maxWidth: "200px", cursor: "pointer"}}>
                {Setting.getShortText(text, 50)}
              </div>
            </Popover>
          );
        },
      },
      {
        title: i18next.t("message:Error text"),
        dataIndex: "errorText",
        key: "errorText",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("errorText"),
        render: (text, record, index) => {
          return (text !== "" ? <Alert description={text} type="error" showIcon style={{padding: "4px"}} icon={<CloseCircleFilled style={{fontSize: "16px", margin: "4px 8px 0 4px"}} />} /> : null);
        },
      },
      {
        title: i18next.t("general:Is triggered"),
        dataIndex: "isTriggered",
        key: "isTriggered",
        width: "140px",
        sorter: true,
        render: (text, record, index) => {
          if (!["signup", "login", "logout", "update-user"].includes(record.action)) {
            return null;
          }

          return (
            <Switch disabled checkedChildren={i18next.t("general:ON")} unCheckedChildren={i18next.t("general:OFF")} checked={text} />
          );
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "150px",
        sorter: true,
        ...this.getColumnSearchProps("action"),
        fixed: "right",
        render: (text, record, index) => {
          return text;
        },
      },
      {
        title: i18next.t("general:Block"),
        dataIndex: "block",
        key: "block",
        width: "110px",
        sorter: true,
        fixed: "right",
        ...this.getColumnSearchProps("block"),
        render: (text, record, index) => {
          return Setting.getBlockBrowserUrl(this.state.providerMap, record, text, true);
        },
      },
      (this.state.enableCrossChain ? {
        title: i18next.t("general:Block 2"),
        dataIndex: "block2",
        key: "block2",
        width: "110px",
        sorter: true,
        fixed: "right",
        ...this.getColumnSearchProps("block2"),
        render: (text, record, index) => {
          return Setting.getBlockBrowserUrl(this.state.providerMap, record, text, false);
        },
      } : {
        title: i18next.t("general:Block 2"),
        hidden: true,
      }),
      {
        title: i18next.t("general:Action"),
        dataIndex: "recordAction",
        key: "recordAction",
        width: this.state.enableCrossChain ? "180px" : "140px",
        fixed: "right",
        render: (text, record, index) => {
          return (
            <div style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: "2px",
              alignItems: "center",
            }}>
              {
                <>
                  {(record.block === "") ? (
                    <Tooltip title={i18next.t("record:Commit")}>
                      <Button
                        disabled={record.block !== ""}
                        type="text"
                        danger
                        size="small"
                        icon={<UploadOutlined />}
                        onClick={() => this.commitRecord(index, true)}
                        style={actionIconButtonStyle}
                      />
                    </Tooltip>
                  ) : (
                    <Popover
                      placement="left"
                      title={i18next.t("general:Result")}
                      content={
                        <div style={{width: "800px", maxHeight: "600px", overflow: "auto"}}>
                          {this.state.isComparing ? (
                            <div style={{textAlign: "center", padding: "40px"}}>
                              <div style={{fontSize: "24px", marginBottom: "16px"}}>🔄</div>
                              <div>{i18next.t("general:Loading...")}</div>
                            </div>
                          ) : (
                            <CommitResultWidget
                              queryResult={this.state.queryResult}
                            />
                          )}
                        </div>
                      }
                      trigger="click"
                    >
                      <Tooltip title={i18next.t("general:Query")}>
                        <Button
                          disabled={record.block === ""}
                          type="text"
                          size="small"
                          icon={<SearchOutlined />}
                          onClick={() => {
                            this.queryRecord(record, true);
                          }}
                          style={actionIconButtonStyle}
                        />
                      </Tooltip>
                    </Popover>
                  )}
                  {this.state.enableCrossChain && (
                    (record.block2 === "") ? (
                      <Tooltip title={record.provider2 === "" ? i18next.t("general:Error") : ""}>
                        <Button
                          disabled={record.provider2 === ""}
                          type="text"
                          danger
                          size="small"
                          icon={<UploadOutlined />}
                          onClick={() => this.commitRecord(index, false)}
                          style={actionIconButtonStyle}
                        />
                      </Tooltip>
                    ) : (
                      <Popover
                        placement="left"
                        title={i18next.t("general:Result") + " 2"}
                        content={
                          <div style={{width: "800px", maxHeight: "600px", overflow: "auto"}}>
                            {this.state.isComparing ? (
                              <div style={{textAlign: "center", padding: "40px"}}>
                                <div style={{fontSize: "24px", marginBottom: "16px"}}>🔄</div>
                                <div>{i18next.t("general:Loading...")}</div>
                              </div>
                            ) : (
                              <CommitResultWidget
                                queryResult={this.state.queryResult}
                              />
                            )}
                          </div>
                        }
                        trigger="click"
                      >
                        <Tooltip title={i18next.t("general:Query") + " 2"}>
                          <Button
                            disabled={record.block2 === ""}
                            type="text"
                            size="small"
                            icon={<SearchOutlined />}
                            onClick={() => {
                              this.queryRecord(record, false);
                            }}
                            style={actionIconButtonStyle}
                          />
                        </Tooltip>
                      </Popover>
                    )
                  )}
                </>
              }
              <Tooltip title={i18next.t("general:View")}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => this.props.history.push(`/records/${record.owner}/${record.id}`)}
                  style={actionIconButtonStyle}
                />
              </Tooltip>
              <Tooltip title={i18next.t("general:Delete")}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled
                  style={actionIconButtonStyle}
                />
              </Tooltip>
            </div>
          );
        },
      },
    ];
    const filteredColumns = Setting.filterTableColumns(columns, this.props.formItems ?? this.state.formItems, "recordAction");
    const paginationProps = {
      pageSize: this.state.pagination.pageSize,
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100", "1000", "10000", "100000"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={filteredColumns} dataSource={records} rowKey={(record) => `${record.owner}/${record.name}`} rowSelection={this.getRowSelection()} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Logs")}
              {Setting.isAdminUser(this.props.account) && (
                <>
                  <span style={{marginLeft: 32}}>
                    {i18next.t("record:Enable cross-chain")}:
                    <Switch checked={this.state.enableCrossChain} onChange={this.toggleEnableCrossChain} style={{marginLeft: 8}} />
                  </span>
                  <span style={{marginLeft: 32}}>
                    {i18next.t("record:Enable decoding")}:
                    <Switch checked={this.state.enableDecoding} onChange={this.toggleEnableDecoding} style={{marginLeft: 8}} />
                  </span>
                </>
              )}
              {this.state.selectedRowKeys.length > 0 && (
                <Popconfirm title={`${i18next.t("general:Sure to delete")}: ${this.state.selectedRowKeys.length} ${i18next.t("general:items")} ?`} onConfirm={() => this.performBulkDelete(this.state.selectedRows, this.state.selectedRowKeys)} okText={i18next.t("general:OK")} cancelText={i18next.t("general:Cancel")}>
                  <Button type="primary" danger size="small" icon={<DeleteOutlined />} style={{marginLeft: 8}}>
                    {i18next.t("general:Delete")} ({this.state.selectedRowKeys.length})
                  </Button>
                </Popconfirm>
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
    let field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    if (params.type !== undefined && params.type !== null) {
      field = "type";
      value = params.type;
    }
    this.setState({loading: true});
    RecordBackend.getRecords(Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
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

export default RecordListPage;
