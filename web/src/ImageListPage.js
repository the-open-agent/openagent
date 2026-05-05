// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from "react";
import {Link} from "react-router-dom";
import {Button, Dropdown, Popconfirm, Table} from "antd";
import BaseListPage from "./BaseListPage";
import moment from "moment";
import * as Setting from "./Setting";
import * as ImageBackend from "./backend/ImageBackend";
import i18next from "i18next";
import * as MachineBackend from "./backend/MachineBackend";
import {DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined} from "@ant-design/icons";

class ImageListPage extends BaseListPage {
  constructor(props) {
    super(props);
  }

  newImage() {
    return {
      owner: this.props.account.owner,
      name: `image_${Setting.getRandomName()}`,
      category: "Private Image",
      imageId: "",
      state: "Available",
      tag: "",
      description: "",
      os: "Ubuntu_64",
      platform: "Ubuntu",
      systemArchitecture: "64bits",
      size: "5 GiB",
      bootMode: "BIOS",
      progress: "100%",
      createdTime: moment().format(),
      updatedTime: moment().format(),
    };
  }

  addImage() {
    const newImage = this.newImage();
    ImageBackend.addImage(newImage)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/images/${newImage.owner}/${newImage.name}`, mode: "add"});
          Setting.showMessage("success", i18next.t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  deleteItem = async(index) => {
    return ImageBackend.deleteImage(this.state.data[index]);
  };

  deleteImage(i) {
    ImageBackend.deleteImage(this.state.data[i])
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

  createMachine(image) {
    const newMachine = {
      owner: image.owner,
      name: image.name,
      provider: "",
      createdTime: image.createdTime,
      updatedTime: image.updatedTime,
      expireTime: "",
      displayName: image.imageId,
      region: "West US 2",
      zone: "Zone 1",
      category: "Standard",
      type: "Pay As You Go",
      size: image.size,
      tag: image.tag,
      state: "Inactive",
      image: image.os,
      publicIp: "",
      privateIp: "",
    };
    MachineBackend.addMachine(newMachine)
      .then((res) => {
        if (res.status === "ok") {
          this.props.history.push({pathname: `/machines/${newMachine.owner}/${newMachine.name}`, mode: "add"});
          Setting.showMessage("success", i18next.t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${error}`);
      });
  }

  renderTable(images) {
    const columns = [
      {
        title: i18next.t("general:Organization"),
        dataIndex: "owner",
        key: "owner",
        width: "110px",
        sorter: true,
        ...this.getColumnSearchProps("owner"),
        render: (text, image, index) => {
          return (
            <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.props.account).replace("/account", `/organizations/${text}`)}>
              {text}
            </a>
          );
        },
      },
      {
        title: i18next.t("general:Name"),
        dataIndex: "name",
        key: "name",
        width: "120px",
        sorter: true,
        ...this.getColumnSearchProps("name"),
        render: (text, record, index) => {
          return (
            <Link to={`/images/${record.owner}/${record.name}`}>{text}</Link>
          );
        },
      },
      {
        title: i18next.t("general:Category"),
        dataIndex: "category",
        key: "category",
        width: "120px",
        sorter: (a, b) => a.category.localeCompare(b.category),
      },
      {
        title: i18next.t("general:ID"),
        dataIndex: "imageId",
        key: "imageId",
        width: "120px",
        sorter: (a, b) => a.imageId.localeCompare(b.imageId),
      },
      {
        title: i18next.t("general:State"),
        dataIndex: "state",
        key: "state",
        width: "90px",
        sorter: (a, b) => a.state.localeCompare(b.state),
      },
      {
        title: i18next.t("general:Tag"),
        dataIndex: "tag",
        key: "tag",
        width: "90px",
        sorter: (a, b) => a.tag.localeCompare(b.tag),
      },
      {
        title: i18next.t("general:Description"),
        dataIndex: "description",
        key: "description",
        width: "90px",
        sorter: (a, b) => a.description.localeCompare(b.description),
      },
      {
        title: i18next.t("node:OS"),
        dataIndex: "os",
        key: "os",
        width: "90px",
        sorter: (a, b) => a.os.localeCompare(b.os),
      },
      {
        title: i18next.t("image:Platform"),
        dataIndex: "platform",
        key: "platform",
        width: "90px",
        sorter: (a, b) => a.platform.localeCompare(b.platform),
      },
      {
        title: i18next.t("image:Arch"),
        dataIndex: "systemArchitecture",
        key: "systemArchitecture",
        width: "90px",
        sorter: (a, b) => a.systemArchitecture.localeCompare(b.systemArchitecture),
      },
      {
        title: i18next.t("general:Size"),
        dataIndex: "size",
        key: "size",
        width: "90px",
        sorter: (a, b) => a.size.localeCompare(b.size),
      },
      {
        title: i18next.t("image:Boot mode"),
        dataIndex: "bootMode",
        key: "bootMode",
        width: "90px",
        sorter: (a, b) => a.bootMode.localeCompare(b.bootMode),
      },
      {
        title: i18next.t("general:Progress"),
        dataIndex: "progress",
        key: "progress",
        width: "90px",
        sorter: (a, b) => a.progress.localeCompare(b.progress),
      },
      {
        title: i18next.t("general:Created time"),
        dataIndex: "createdTime",
        key: "createdTime",
        width: "160px",
        // sorter: true,
        sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        render: (text, image, index) => {
          return Setting.getFormattedDate(text);
        },
      },
      {
        title: i18next.t("general:Action"),
        dataIndex: "action",
        key: "action",
        width: "150px",
        fixed: (Setting.isMobile()) ? "false" : "right",
        render: (text, image, index) => {
          return (
            <div style={{display: "flex", alignItems: "center", gap: "2px", flexWrap: "nowrap"}}>
              <Button
                style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                type="default"
                icon={<EditOutlined />}
                onClick={() => this.props.history.push(`/images/${image.owner}/${image.name}`)}
                title={i18next.t("general:Edit")}
              />
              <Popconfirm
                title={i18next.t("general:Sure to delete") + `: ${image.name} ?`}
                onConfirm={() => this.deleteImage(index)}
                disabled={image.owner !== this.props.account.owner}
                okText={i18next.t("general:OK")}
                cancelText={i18next.t("general:Cancel")}
              >
                <Button
                  style={{minWidth: "28px", width: "28px", height: "28px", padding: 0, borderRadius: "6px"}}
                  type="primary"
                  danger
                  disabled={image.owner !== this.props.account.owner}
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "create-machine",
                      icon: <PlusOutlined />,
                      label: i18next.t("image:Create machine"),
                    },
                  ],
                  onClick: ({key}) => {
                    if (key === "create-machine") {this.createMachine(image);}
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
      pageSize: this.state.pagination.pageSize,
      total: this.state.pagination.total,
      showQuickJumper: true,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100", "1000", "10000", "100000"],
      showTotal: () => i18next.t("general:{total} in total").replace("{total}", this.state.pagination.total),
    };

    return (
      <div>
        <Table scroll={{x: "max-content"}} columns={columns} dataSource={images} rowKey={(image) => `${image.owner}/${image.name}`} rowSelection={this.getRowSelection()} size="middle" bordered pagination={paginationProps}
          title={() => (
            <div>
              {i18next.t("general:Images")}&nbsp;&nbsp;&nbsp;&nbsp;
              <Button type="primary" size="small" onClick={this.addImage.bind(this)}>{i18next.t("general:Add")}</Button>
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
    ImageBackend.getImages(Setting.getRequestOrganization(this.props.account), params.pagination.current, params.pagination.pageSize, field, value, sortField, sortOrder)
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

export default ImageListPage;
