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
import {Breadcrumb} from "antd";
import {Link} from "react-router-dom";
import i18next from "i18next";

const RESOURCE_LABELS = {
  "analysis": "store:Analysis",
  "agents": "general:Hub",
  "hub": "general:Hub",
  "stores": "general:Stores",
  "files": "general:Files",
  "providers": "general:Providers",
  "vectors": "general:Vectors",
  "chats": "general:Chats",
  "messages": "general:Messages",
  "scans": "general:Scans",
  "usages": "general:Usages",
  "visitors": "general:Visitors",
  "nodes": "general:Nodes",
  "machines": "general:Machines",
  "assets": "general:Assets",
  "images": "general:Images",
  "containers": "general:Containers",
  "pods": "general:Pods",
  "sessions": "general:Sessions",
  "connections": "general:Connections",
  "records": "general:Records",
  "templates": "general:Templates",
  "applications": "general:Applications",
  "application-store": "general:Application Store",
  "tasks": "general:Tasks",
  "scales": "general:Scales",
  "forms": "general:Forms",
  "sysinfo": "general:System Info",
  // Store detail tabs
  "overview": "store:Overview",
  "issues": "store:Issues",
  "insights": "store:Insights",
  "settings": "general:Settings",
  // Insights sub-tabs (deep-linked as the last path segment)
  "pulse": "store:Pulse",
  "contributors": "store:Contributors",
  "traffic": "store:Traffic",
  "wordcloud": "store:Word Cloud",
  "cost": "store:Cost",
};

function buildBreadcrumbItems(uri) {
  const pathSegments = (uri || "").split("/").filter(Boolean);

  const homeItem = {title: <Link to="/">{i18next.t("general:Home")}</Link>};

  if (pathSegments.length === 0) {
    return null;
  }

  const rootSegment = pathSegments[0];
  const listLabelKey = RESOURCE_LABELS[rootSegment];
  if (!listLabelKey) {
    return null;
  }

  if (pathSegments.length === 1) {
    return [
      homeItem,
      {title: i18next.t(listLabelKey)},
    ];
  }

  const lastSegment = pathSegments[pathSegments.length - 1];
  const lastLabelKey = RESOURCE_LABELS[lastSegment];
  const lastLabel = lastLabelKey ? i18next.t(lastLabelKey) : decodeURIComponent(lastSegment);

  const listPath = rootSegment === "agents" ? "/hub" : `/${rootSegment}`;

  return [
    homeItem,
    {title: <Link to={listPath}>{i18next.t(listLabelKey)}</Link>},
    {title: lastLabel},
  ];
}

const BreadcrumbBar = ({uri}) => {
  const items = buildBreadcrumbItems(uri);
  if (!items) {
    return null;
  }
  return <Breadcrumb items={items} style={{marginLeft: 8}} />;
};

export default BreadcrumbBar;
