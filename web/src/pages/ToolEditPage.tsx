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

import i18next from "i18next";
import {Info} from "lucide-react";
import {useParams} from "react-router-dom";
import * as ToolBackend from "@/backend/ToolBackend";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {getProviderSubTypeSelectOptions, getProviderTypeSelectOptions} from "@/components/common/ProviderLogo";
import {TestToolWidget} from "@/components/common/TestToolWidget";
import {SimpleEditPage, type EditField} from "@/components/crud/SimpleEditPage";
import {getToolFunctions} from "@/lib/tool-functions";

// picking a type starts from that type's usual sub type
const DEFAULT_SUB_TYPES: Record<string, string> = {
  time: "Default",
  web_search: "DuckDuckGo",
  shell: "Default",
  local_file: "Default",
  office: "All",
  web_fetch: "Default",
  web_browser: "Default",
  gui: "Windows UIA",
  video_download: "Default",
  browser_use: "Default",
};

function ChromeExtensionSetup() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>{i18next.t("tool:OpenAgent Chrome Extension - Setup title")}</AlertTitle>
      <AlertDescription>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            {i18next.t("tool:OpenAgent Chrome Extension - Step 1 prefix")}{" "}
            <a className="underline" href="https://github.com/the-open-agent/openagent-chrome" target="_blank" rel="noopener noreferrer">
              {i18next.t("tool:OpenAgent Chrome Extension - Step 1 link")}
            </a>
          </li>
          <li>{i18next.t("tool:OpenAgent Chrome Extension - Step 2")}</li>
          <li>{i18next.t("tool:OpenAgent Chrome Extension - Step 3")}</li>
          <li>{i18next.t("tool:OpenAgent Chrome Extension - Step 4")}</li>
        </ol>
      </AlertDescription>
    </Alert>
  );
}

export default function ToolEditPage() {
  const {toolName = ""} = useParams();

  const fields: EditField[] = [
    {type: "text", name: "name", labelKey: "general:Name", required: true},
    {
      type: "select",
      name: "type",
      labelKey: "general:Type",
      options: () => getProviderTypeSelectOptions("Tool"),
      onChange: (value, _ctx, updateFields) => updateFields({type: value, subType: DEFAULT_SUB_TYPES[value] ?? ""}),
    },
    {
      type: "select",
      name: "subType",
      labelKey: "provider:Sub type",
      options: (ctx) => getProviderSubTypeSelectOptions("Tool", ctx.record.type),
    },
    {
      type: "text",
      name: "clientId",
      labelKey: "provider:Search engine ID (cx)",
      when: (ctx) => ctx.record.type === "web_search" && ctx.record.subType === "Google",
    },
    {
      type: "password",
      name: "clientSecret",
      labelKey: "general:API key",
      when: (ctx) => ctx.record.type === "web_search" && ["Google", "Baidu", "Keenable"].includes(ctx.record.subType),
    },
    {
      type: "text",
      name: "providerUrl",
      labelKey: "general:Provider URL",
      when: (ctx) => ["web_search", "web_fetch", "web_browser", "local_file"].includes(ctx.record.type),
    },
    {
      type: "switch",
      name: "enableProxy",
      labelKey: "provider:Enable proxy",
      when: (ctx) => ["web_search", "web_fetch", "web_browser", "browser_use"].includes(ctx.record.type),
    },
    {
      type: "select",
      name: "mode",
      labelKey: "tool:Chrome mode",
      when: (ctx) => ctx.record.type === "browser_use",
      options: () => ["User Chrome", "Chrome for Testing", "OpenAgent Chrome Extension"].map((value) => ({value, label: i18next.t(`tool:${value}`)})),
    },
    {
      type: "custom",
      name: "extensionSetup",
      label: "",
      block: true,
      when: (ctx) => ctx.record.type === "browser_use" && ctx.record.mode === "OpenAgent Chrome Extension",
      render: () => <ChromeExtensionSetup />,
    },
    {
      type: "select",
      name: "state",
      labelKey: "general:State",
      options: () => [
        {value: "Active", label: i18next.t("general:Active")},
        {value: "Inactive", label: i18next.t("general:Inactive")},
      ],
    },
  ];

  return (
    <SimpleEditPage
      titleKey="tool:Edit Tool"
      backTo="/tools"
      deps={[toolName]}
      fields={fields}
      fetch={() => ToolBackend.getTool("admin", toolName)}
      add={(record) => ToolBackend.addTool(record)}
      update={(record) => ToolBackend.updateTool("admin", toolName, record)}
      editUrl={(record) => `/tools/${record.name}`}
      transform={(record) => ({...record, mode: record.mode || (record.type === "browser_use" ? "User Chrome" : record.mode)})}
    >
      {(ctx, update) => {
        const functions = getToolFunctions(ctx.record);
        return (
          <div className="mt-6 space-y-4">
            {functions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{i18next.t("tool:Functions")}</CardTitle>
                  <CardDescription>{i18next.t("tool:Functions desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[280px]">{i18next.t("tool:Function name")}</TableHead>
                        <TableHead>{i18next.t("general:Description")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {functions.map((fn) => (
                        <TableRow key={fn.name}>
                          <TableCell><Badge variant="outline" className="font-mono">{fn.name}</Badge></TableCell>
                          <TableCell>{fn.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            {ctx.mode !== "add" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{i18next.t("general:Test")}</CardTitle>
                  <CardDescription>{i18next.t("general:Test desc")}</CardDescription>
                </CardHeader>
                <CardContent><TestToolWidget tool={ctx.record} onUpdateTool={update} /></CardContent>
              </Card>
            )}
          </div>
        );
      }}
    </SimpleEditPage>
  );
}
