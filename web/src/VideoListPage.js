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
import {Button, Dropdown, List, Popconfirm, Table, Tooltip, Upload} from "antd";
import {DeleteOutlined, DownloadOutlined, EditOutlined, ExportOutlined, MoreOutlined, UploadOutlined} from "@ant-design/icons";
import moment from "moment";
import BaseListPage from "./BaseListPage";
import * as Setting from "./Setting";
import * as VideoBackend from "./backend/VideoBackend";
import i18next from "i18next";
import * as Conf from "./Conf";

class VideoListPage extends BaseListPage {
  constructor(props) {
    super(props);
    this.state.pagination = {
      current: 1,
      pageSize: 1000,
    };
  }

  newVideo() {
    const randomName = Setting.getRandomName();
    return {
      owner: this.props.account.name,
      name: `video_${randomName}`,
      createdTime: moment().format(),
      displayName: `New Video - ${randomName}`,
      videoId: "",
      coverUrl: "",
      labels: [],
      dataUrls: [],
      dataUrl: "",
      playAuth: "",
      tableTitleHeight: "100%",
    };
  }

  deleteVideo(record) {
    VideoBackend.deleteVideo(record)
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

  uploadFile(info) {
    this.setState({
      tableTitleHeight: "80px",
    });

    const {status, response: res} = info.file;
    // if (status !== "uploading") {
    //   console.log(info.file, info.fileList);
    // }
    if (status === "done") {
      if (res.status === "ok") {
        Setting.showMessage("success", i18next.t("general:Successfully uploaded"));
        const videoName = res.data;
        this.props.history.push(`/videos/${this.props.account.name}/${videoName}`);
        this.setState({
          tableTitleHeight: "100%",
        });
      } else {
        Setting.showMessage("error", `${i18next.t("general:Failed to save")}: ${res.msg}`);
      }
    } else if (status === "error") {
      Setting.showMessage("success", i18next.t("general:Failed to save"));
    }
  }

  renderUpload() {
    const isUploadDisabled = this.state.data.filter((video) => video.owner === this.props.account.name).length >= 2;
    const isDisabled = isUploadDisabled || this.requireUserOrAdmin();

    const props = {
      name: "file",
      accept: ".mp4",
      method: "post",
      action: `${Setting.ServerUrl}/api/upload-video`,
      disabled: isDisabled,
      withCredentials: true,
      progress: {
        strokeColor: {
          "0%": "#108ee9",
          "100%": "#87d068",
        },
        strokeWidth: 3,
        format: (percent) => percent && `${parseFloat(percent.toFixed(2))}%`,
      },
      onChange: (info) => {
        this.uploadFile(info);
      },
    };

    return (
      <Upload {...props}>
        <Button type="primary" size="small" disabled={isDisabled}>
          <UploadOutlined /> {i18next.t("video:Upload Video")} (.mp4)
        </Button>
      </Upload>
    );
  }

  requireUserOrAdmin(video) {
    if (!this.requireAdmin()) {
      return false;
    } else if (this.props.account.type !== "video-normal-user") {
      return true;
    }

    if (!video) {
      return false;
    } else {
      return video.remarks && video.remarks.length > 0 || video.remarks2 && video.remarks2.length > 0 || video.state !== "Draft";
    }
  }

  requireReviewerOrAdmin() {
    return !(!this.requireAdmin() || this.props.account.type === "video-reviewer1-user" || this.props.account.type === "video-reviewer2-user");
  }

  requireReviewer() {
    return !(this.props.account.type === "video-reviewer1-user" || this.props.account.type === "video-reviewer2-user");
  }

  requireAdmin() {
    if (Setting.isAdminUser(this.props.account)) {
      return false;
    }

    return !(this.props.account.type === "video-admin-user");
  }

  filterReviewer1(remarks) {
    if (this.props.account.type === "video-reviewer1-user") {
      return remarks.filter(remark => remark.user === this.props.account.name);
    } else {
      return remarks;
    }
  }

  renderTable(videos) {
    if (this.props.account.type === "video-normal-user") {
      videos = videos.filter((video) => video.owner === this.props.account.name);
    } else if (this.props.account.type === "video-reviewer1-user") {
      videos = videos.filter((video) => (video.state === "Draft" || video.state === "In Review 1"));

      videos = videos.map(video => {
        video.reviewState = video.remarks.filter((row) => row.user === this.props.account.name).length > 0 ? "Reviewed" : "Unreviewed";
        return video;
      });
      videos = videos.sort((a, b) => b.reviewState.localeCompare(a.reviewState));
    } else if (this.props.account.type === "video-reviewer2-user") {
      videos = videos.filter((video) => (video.state === "In Review 2"));

      videos = videos.map(video => {
        video.reviewState = video.remarks2.filter((row) => row.user === this.props.account.name).length > 0 ? "Reviewed" : "Unreviewed";
        return video;
      });
      videos = videos.sort((a, b) => b.reviewState.localeCompare(a.reviewState));
    }

    let columns = [
      {
        title: i18next.t("general:User"),
        dataIndex: "owner",
        key: "owner",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("owner"),
        render: (text, record, index) => {
          return (
            <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.props.account).replace("/account", `/users/${Conf.AuthConfig.organizationName}/${text}`)}>
              {text}
            </a>
          );
        },
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "180px",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          text = text.replace(".MP4", ".mp4");
          return (
            <Link to={`/videos/${record.owner}/${record.name}`}>
              {text}
            </Link>
          );
        },
      },
      {
        title: i18next.t("general:Display name"),
        dataIndex: "displayName",
        key: "displayName",
        width: "180px",
        sorter: true,
      },
      {
        title: i18next.t("general:Description"),
        dataIndex: "description",
        key: "description",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("description"),
        render: (text, record, index) => {
          return Setting.getShortText(text, 50);
        },
      },
      {
        title: i18next.t("video:Grade"),
        dataIndex: "grade",
        key: "grade",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("grade"),
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
        title: i18next.t("video:Lesson"),
        dataIndex: "lesson",
        key: "lesson",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("lesson"),
      },
      // {
      //   title: i18next.t("video:Video ID"),
      //   dataIndex: "videoId",
      //   key: "videoId",
      //   width: "250px",
      //   sorter: (a, b) => a.videoId.localeCompare(b.videoId),
      // },
      {
        title: i18next.t("video:Cover"),
        dataIndex: "coverUrl",
        key: "coverUrl",
        width: "170px",
        render: (text, record, index) => {
          return (
            <a target="_blank" rel="noreferrer" href={text}>
              <img src={text} alt={text} width={150} />
            </a>
          );
        },
      },
      {
        title: i18next.t("video:Remarks"),
        dataIndex: "remarks",
        key: "remarks",
        // width: "210px",
        render: (text, record, index) => {
          if ((record.remarks === null || record.remarks.length === 0) && (record.remarks2 === null || record.remarks2.length === 0)) {
            return `(${i18next.t("general:empty")})`;
          }

          if (this.requireReviewerOrAdmin()) {
            if (record.state === "Published") {
              return (
                <div>
                  {i18next.t("video:Remarks2")}:
                  <List
                    size="small"
                    locale={{emptyText: " "}}
                    dataSource={record.remarks2}
                    renderItem={(remark, i) => {
                      return (
                        <List.Item>
                          <div style={{display: "inline"}}>
                            {
                              Setting.getRemarkTag(remark.score)
                            }
                            <Tooltip placement="left" title={remark.text}>
                              {Setting.getShortText(remark.text, 25)}
                            </Tooltip>
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                </div>
              );
            } else {
              return null;
            }
          }

          return (
            <div>
              {i18next.t("video:Remarks1")}:
              <List
                size="small"
                locale={{emptyText: " "}}
                dataSource={this.filterReviewer1(record.remarks)}
                renderItem={(remark, i) => {
                  return (
                    <List.Item>
                      <div style={{display: "inline"}}>
                        {
                          Setting.getRemarkTag(remark.score)
                        }
                        <Tooltip placement="left" title={remark.text}>
                          {Setting.getShortText(remark.text, 25)}
                        </Tooltip>
                      </div>
                    </List.Item>
                  );
                }}
              />
              <br />
              {i18next.t("video:Remarks2")}:
              <List
                size="small"
                locale={{emptyText: " "}}
                dataSource={record.remarks2}
                renderItem={(remark, i) => {
                  return (
                    <List.Item>
                      <div style={{display: "inline"}}>
                        {
                          Setting.getRemarkTag(remark.score)
                        }
                        <Tooltip placement="left" title={remark.text}>
                          {Setting.getShortText(remark.text, 25)}
                        </Tooltip>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </div>
          );
        },
      },
      // {
      //   title: i18next.t("task:Labels"),
      //   dataIndex: "labels",
      //   key: "labels",
      //   width: "120px",
      //   sorter: (a, b) => a.factors.localeCompare(b.factors),
      //   render: (text, record, index) => {
      //     return Setting.getLabelTags(text);
      //   },
      // },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "90px",
        sorter: true,
        ...this.getColumnSearchProps("state"),
        render: (text, record, index) => {
          if (text === "Draft") {
            return i18next.t("video:Draft");
          } else if (text === "In Review 1") {
            if (this.props.account.type === "video-normal-user") {
              return i18next.t("video:In Review");
            }

            return i18next.t("video:In Review 1");
          } else if (text === "In Review 2") {
            if (this.props.account.type === "video-normal-user") {
              return i18next.t("video:In Review");
            }

            return i18next.t("video:In Review 2");
          } else if (text === "Published") {
            return i18next.t("video:Published");
          }
        },
      },
      {
        title: i18next.t("video:Review state"),
        dataIndex: "reviewState",
        key: "reviewState",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("reviewState"),
        render: (text, record, index) => {
          if (text === "Reviewed") {
            return i18next.t("video:Reviewed");
          } else if (text === "Unreviewed") {
            return i18next.t("video:Unreviewed");
          } else {
            return "";
          }
        },
      },
      {
        title: i18next.t("video:Is public"),
        dataIndex: "isPublic",
        key: "isPublic",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("isPublic"),
        render: (text, record, index) => {
          if (text === true) {
            return i18next.t("video:Public");
          } else {
            return i18next.t("video:Hidden");
          }
        },
      },
      {
        title: i18next.t("general:Download"),
        dataIndex: "downloadUrl",
        key: "downloadUrl",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("downloadUrl"),
        render: (text, record, index) => {
          if (!text) {
            return null;
          }

          return (
            <a target="_blank" rel="noreferrer" href={text}>
              <Button icon={<DownloadOutlined />} style={{marginRight: "10px"}} type="primary">{i18next.t("general:Download")}</Button>
            </a>
          );
        },
      },
      // {
      //   title: i18next.t("video:Label count"),
      //   dataIndex: "labelCount",
      //   key: "labelCount",
      //   width: "90px",
      //   sorter: true,
      // },
      // {
      //   title: i18next.t("video:Segment count"),
      //   dataIndex: "segmentCount",
      //   key: "segmentCount",
      //   width: "110px",
      //   sorter: true,
      // },
      {
        title: i18next.t("video:Excellent count"),
        dataIndex: "excellentCount",
        key: "excellentCount",
        width: "110px",
        sorter: (a, b) => a.excellentCount - b.excellentCount,
        // sorter: true,
        // ...this.getColumnSearchProps("excellentCount"),
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "150px",
        fixed: "right",
        render: (text, record, index) => {
          const editLabel = (this.requireUserOrAdmin(record)) ? i18next.t("general:View") : i18next.t("general:Edit");
          return (
            <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
              <Button
                style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                type="default"
                icon={<EditOutlined />}
                onClick={() => this.props.history.push(`/videos/${record.owner}/${record.name}`)}
                title={editLabel}
              />
              <Popconfirm
                disabled={this.requireUserOrAdmin(record)}
                title={`${i18next.t("general:Sure to delete")}: ${record.name} ?`}
                onConfirm={() => this.deleteVideo(record)}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
              >
                <Button
                  style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                  type="primary"
                  danger
                  disabled={this.requireUserOrAdmin(record)}
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "open",
                      icon: <ExportOutlined />,
                      label: i18next.t("general:Open"),
                    },
                  ],
                  onClick: ({key}) => {
                    if (key === "open") {
                      Setting.openLink(`/videos/${record.owner}/${record.name}`);
                    }
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
    columns = Setting.filterTableColumns(columns, this.props.formItems ?? this.state.formItems);
    const paginationProps = {
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSize: "1000",
      pageSizeOptions: ["10", "20", "50", "100", "1000", "10000", "100000"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    if (this.requireReviewerOrAdmin()) {
      columns = columns.filter(column => column.key !== "excellentCount");
    }

    if (this.requireReviewer()) {
      columns = columns.filter(column => column.key !== "reviewState");
    }

    if (this.requireAdmin()) {
      columns = columns.filter(column => column.key !== "downloadUrl");
    }

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={videos} rowKey="name" size="middle" rowSelection={this.getRowSelection()} bordered pagination={paginationProps}
          title={() => (
            <div style={{height: this.state.tableTitleHeight}}>
              {i18next.t("general:Videos")}
              {/* &nbsp;&nbsp;&nbsp;&nbsp;*/}
              {/* <Button type="primary" size="small" onClick={this.addVideo.bind(this)}>{i18next.t("general:Add")}</Button>*/}
                   &nbsp;&nbsp;&nbsp;&nbsp;
              {
                this.renderUpload()
              }
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
    const field = params.searchedColumn, value = params.searchText;
    const sortField = params.sortField, sortOrder = params.sortOrder;
    this.setState({loading: true});
    VideoBackend.getVideos("admin", params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
    // VideoBackend.getVideos("admin", "", "", field, value, sortField, sortOrder)
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

export default VideoListPage;
