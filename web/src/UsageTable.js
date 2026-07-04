// Copyright 2024 The OpenAgent Authors. All Rights Reserved.
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
import {Table, Tag} from "antd";
import i18next from "i18next";
import * as Setting from "./Setting";
import UserLabel from "./common/UserLabel";

const UsageTable = ({data, account}) => {
  let columns = [
    {
      title: i18next.t("general:User"),
      dataIndex: "user",
      key: "user",
      width: "12%",
      render: (text) => (text && !text.startsWith("u-") ? <UserLabel user={text} account={account} size={22} /> : text),
    },
    {
      title: i18next.t("general:Chats"),
      dataIndex: "chats",
      key: "chats",
      render: (text, record) => (
        <Tag
          color={"success"}
          onClick={() => {
            Setting.goToLink(`/chats?user=${record.user}`);
          }}
        >
          {text}
        </Tag>
      ),
      width: "15%",
      sorter: (a, b) => a.chats - b.chats,
    },
    {
      title: i18next.t("general:Messages"),
      dataIndex: "messageCount",
      key: "message",
      render: (text, record) => (
        <Tag
          color={"success"}
          onClick={() => {
            Setting.goToLink(`/messages?user=${record.user}`);
          }}
        >
          {text}
        </Tag>
      ),
      width: "15%",
      sorter: (a, b) => a.messageCount - b.messageCount,
    },
    {
      title: i18next.t("chat:Token count"),
      dataIndex: "tokenCount",
      key: "token",
      width: "15%",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.tokenCount - b.tokenCount,
    },
    {
      title: i18next.t("chat:Price"),
      dataIndex: "price",
      key: "price",
      width: "15%",
      sorter: (a, b) => a.price - b.price,
    },
  ];

  if (!account || account.name !== "admin") {
    columns = columns.filter(column => column.key !== "tokenCount" && column.key !== "price");
  }

  return (
    <div style={{margin: "20px", marginLeft: "60px", marginRight: "60px"}}>
      <span style={{display: "block", fontSize: "20px", marginBottom: "10px"}}>
        {i18next.t("general:Users")}
      </span>
      <Table
        columns={columns}
        dataSource={data}
        size="middle"
        bordered
        pagination={{pageSize: 100}}
        showSorterTooltip={{target: "sorter-icon"}}
        loading={{
          spinning: !data,
          size: "large",
        }}
      />
    </div>
  );
};

export default UsageTable;
