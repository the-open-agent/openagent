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

import {AppTooltip} from "../../components/ui/tooltip";
import i18next from "i18next";
import {Tree} from "antd";

export const NavItemTree = ({disabled, casdoorAvailable, checkedKeys, defaultExpandedKeys, onCheck}) => {
  const casdoorTooltip = (title) => casdoorAvailable ? title : (
    <AppTooltip title={i18next.t("general:Requires Casdoor to be installed")}>{title}</AppTooltip>
  );

  const NavItemNodes = [
    {
      title: i18next.t("store:All"),
      key: "all",
      children: [
        {title: i18next.t("general:Chat"), key: "/chat"},
        {
          title: i18next.t("general:Basic"),
          key: "/basic",
          children: [
            {title: i18next.t("general:Stores"), key: "/stores"},
            {title: i18next.t("general:Chats"), key: "/chats"},
            {title: i18next.t("general:Messages"), key: "/messages"},
          ],
        },
        {
          title: i18next.t("general:Knowledge Base"),
          key: "/knowledge-base",
          children: [
            {title: i18next.t("general:Files"), key: "/files"},
            {title: i18next.t("general:Vectors"), key: "/vectors"},
          ],
        },
        {
          title: i18next.t("general:Connectors"),
          key: "/connectors",
          children: [
            {title: i18next.t("general:Providers"), key: "/providers"},
            {title: i18next.t("general:Pipes"), key: "/pipes"},
            {title: i18next.t("general:Skills"), key: "/skills"},
            {title: i18next.t("general:Tools"), key: "/tools"},
            {title: i18next.t("general:MCP Servers"), key: "/servers"},
          ],
        },
        {
          title: i18next.t("general:Multimedia"),
          key: "/multimedia",
          children: [
            {title: i18next.t("general:Tasks"), key: "/tasks"},
            {title: i18next.t("general:Scales"), key: "/scales"},
            {title: i18next.t("general:Forms"), key: "/forms"},
          ],
        },
        {
          title: i18next.t("general:Auditing Logs"),
          key: "/logs",
          children: [
            {title: i18next.t("general:Logs"), key: "/records"},
            {title: i18next.t("general:Sessions"), key: "/sessions"},
          ],
        },
        {
          title: casdoorTooltip(i18next.t("general:Identity")),
          key: "/identity",
          children: [
            {title: casdoorTooltip(i18next.t("general:Users")), key: "/users"},
            {title: casdoorTooltip(i18next.t("general:Resources")), key: "/casdoor-resources"},
            {title: casdoorTooltip(i18next.t("general:Permissions")), key: "/permissions"},
          ],
        },
        {
          title: i18next.t("general:Admin"),
          key: "/admin",
          children: [
            {title: i18next.t("general:Sites"), key: "/sites", disableCheckbox: true},
            {title: i18next.t("general:Resources"), key: "/resources"},
            {title: i18next.t("general:Usages"), key: "/usages"},
            {title: i18next.t("general:Visitors"), key: "/visitors"},
            {title: i18next.t("general:System Info"), key: "/sysinfo"},
            {title: i18next.t("general:Swagger"), key: "/swagger"},
          ],
        },
      ],
    },
  ];

  return (
    <Tree
      disabled={disabled}
      checkable
      checkedKeys={checkedKeys}
      defaultExpandedKeys={defaultExpandedKeys}
      onCheck={onCheck}
      treeData={NavItemNodes}
    />
  );
};
