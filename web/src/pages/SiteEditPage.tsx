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

import * as React from "react";
import i18next from "i18next";
import {useNavigate, useParams} from "react-router-dom";
import * as ProviderBackend from "@/backend/ProviderBackend";
import * as ResourceBackend from "@/backend/ResourceBackend";
import * as SiteBackend from "@/backend/SiteBackend";
import {Input} from "@/components/ui/input";
import {Switch} from "@/components/ui/switch";
import {CodeEditor} from "@/components/common/CodeEditor";
import {ImageUrlInput} from "@/components/common/ImageUrlInput";
import {Loading} from "@/components/common/Loading";
import {NavItemTree} from "@/components/common/NavItemTree";
import {PasswordInput} from "@/components/common/PasswordInput";
import {SearchableSelect} from "@/components/common/SearchableSelect";
import {UnauthorizedPage} from "@/components/common/UnauthorizedPage";
import {EditPageShell} from "@/components/crud/EditPageShell";
import {FormRow, FormSection} from "@/components/crud/FormRow";
import {useAccount} from "@/hooks/use-account";
import {useEditRecord} from "@/hooks/use-edit-record";
import {useSite} from "@/hooks/use-site";
import {submitEdit} from "@/lib/crud";
import * as Setting from "@/lib/setting";

const BuiltInSiteName = "site-built-in";

export default function SiteEditPage() {
  const {siteName = ""} = useParams();
  const navigate = useNavigate();
  const {account} = useAccount();
  const {reload: reloadSite} = useSite();
  const [saving, setSaving] = React.useState(false);
  const [modelProviders, setModelProviders] = React.useState<any[]>([]);
  React.useEffect(() => {
    ProviderBackend.getProviders("admin").then((res: any) => {
      if (res.status === "ok") {
        setModelProviders((res.data ?? []).filter((provider: any) => provider.category === "Model"));
      }
    });
  }, []);
  const {record: site, updateField, loading, denied} = useEditRecord<any>({
    fetch: () => SiteBackend.getSite("admin", siteName),
    deps: [siteName],
  });

  if (denied) {
    return <UnauthorizedPage />;
  }
  if (loading || site === null) {
    return <Loading />;
  }

  const text = (name: string, labelKey: string, extra?: {placeholder?: string; disabled?: boolean; block?: boolean}) => (
    <FormRow labelKey={labelKey} block={extra?.block}>
      <Input
        value={site[name] ?? ""}
        placeholder={extra?.placeholder}
        disabled={extra?.disabled}
        onChange={(e) => updateField(name, e.target.value)}
      />
    </FormRow>
  );

  const html = (name: string, labelKey: string) => (
    <FormRow labelKey={labelKey} block>
      <CodeEditor language="html" height={160} value={site[name] ?? ""} onChange={(value) => updateField(name, value)} />
    </FormRow>
  );

  const uploadImage = (file: File) => ResourceBackend.uploadResource("admin", "avatar", "site", site.name, file);

  const save = async(exitAfterSave: boolean) => {
    setSaving(true);
    await submitEdit({
      mode: "edit",
      record: Setting.deepCopy(site),
      add: SiteBackend.addSite,
      update: (record) => SiteBackend.updateSite(record.owner, siteName, record),
      onSaved: (saved) => {
        // the built-in site is the console's branding and menu, so show the change right away
        reloadSite();
        if (exitAfterSave) {
          navigate("/sites");
        } else if (saved.name !== siteName) {
          navigate(`/sites/${saved.name}`, {replace: true});
        }
      },
    });
    setSaving(false);
  };

  return (
    <EditPageShell
      title={`${i18next.t("site:Edit Site")} - ${site.displayName || site.name}`}
      mode="edit"
      backTo="/sites"
      onSave={save}
      saving={saving}
    >
      <div className="space-y-6">
        <FormSection title={i18next.t("general:General Settings")} description={i18next.t("general:General Settings desc")}>
          {text("name", "general:Name", {disabled: site.name === BuiltInSiteName})}
          {text("displayName", "general:Display name")}
          {text("htmlTitle", "general:HTML title")}
          <FormRow labelKey="store:Theme color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-16 cursor-pointer rounded-md border bg-background p-0.5"
                value={site.themeColor || "#000000"}
                onChange={(e) => updateField("themeColor", e.target.value)}
              />
              <span className="font-mono text-sm text-muted-foreground">{site.themeColor}</span>
            </div>
          </FormRow>
        </FormSection>

        <FormSection title={i18next.t("general:Branding")} description={i18next.t("general:Branding desc")}>
          {text("endpoint", "provider:Endpoint")}
          {text("staticBaseUrl", "general:Static base URL")}
          <FormRow labelKey="general:Favicon URL">
            <ImageUrlInput value={site.faviconUrl ?? ""} onChange={(value) => updateField("faviconUrl", value)} upload={uploadImage} />
          </FormRow>
          <FormRow labelKey="general:Logo URL">
            <ImageUrlInput value={site.logoUrl ?? ""} onChange={(value) => updateField("logoUrl", value)} upload={uploadImage} />
          </FormRow>
          {text("figureUrl", "figure:Virtual figure URL")}
          <FormRow label="安全护栏名称" tooltip="保护本实例的 AI 安全护栏名称。填写后护栏开始工作：拦截提示词注入和越狱、审核提问和回答、对手机号和身份证号脱敏、过滤文档和知识库里的隐藏指令，页脚、对话输入框下方和页面右侧也会显示安全护栏标识；留空则全部关闭">
            <Input value={site.guardrailName ?? ""} onChange={(e) => updateField("guardrailName", e.target.value)} />
          </FormRow>
          <FormRow label="安全护栏提供方" tooltip="提供安全护栏的单位，显示在安全护栏侧边栏里">
            <Input value={site.guardrailOwner ?? ""} onChange={(e) => updateField("guardrailOwner", e.target.value)} />
          </FormRow>
          <FormRow label="安全护栏标志" tooltip="显示在页脚徽标和安全护栏侧边栏里，留空则显示盾牌图标">
            <ImageUrlInput value={site.guardrailLogoUrl ?? ""} onChange={(value) => updateField("guardrailLogoUrl", value)} upload={uploadImage} />
          </FormRow>
          <FormRow label="安全护栏审核模型" tooltip="填写安全护栏名称后，每条提问和回答都会交给这个模型审核提示词注入、越狱、有害和不适合未成年人的内容；选快且便宜的模型。留空则用默认模型">
            <SearchableSelect
              value={site.guardrailProvider ?? ""}
              options={[{value: "", label: <span className="text-muted-foreground">默认模型</span>, keywords: "default"}, ...modelProviders.map((provider) => ({value: provider.name, label: `${provider.displayName || provider.name} (${provider.name})`, keywords: `${provider.name} ${provider.displayName ?? ""}`}))]}
              onChange={(value) => updateField("guardrailProvider", value)}
            />
          </FormRow>
          <FormRow label="在线客服挂件" tooltip="Casdesk 在线客服的 widget.js 地址，例如 https://chat.casdoor.cn/widget.js；和下面的站点都填了，页面右上角才显示在线客服按钮">
            <Input value={site.chatWidgetUrl ?? ""} onChange={(e) => updateField("chatWidgetUrl", e.target.value)} />
          </FormRow>
          <FormRow label="在线客服站点" tooltip="在线客服里这个网站的站点名">
            <Input value={site.chatSite ?? ""} onChange={(e) => updateField("chatSite", e.target.value)} />
          </FormRow>
        </FormSection>

        <FormSection title={i18next.t("general:Content")} description={i18next.t("general:Content desc")}>
          {text("hubDesc", "general:Hub description", {block: true})}
          {html("navbarHtml", "general:Navbar HTML")}
          {html("footerHtml", "general:Footer HTML")}
          <FormRow labelKey="store:Navbar items" block>
            <NavItemTree
              value={site.navItems}
              disabled={!Setting.isAdminUser(account)}
              casdoorAvailable={Setting.isCasdoorAvailable()}
              onEnableIdentity={() => {
                if (Setting.isCasdoorAvailable()) {
                  return true;
                }
                Setting.showMessage("warning", `${i18next.t("general:Identity requires Casdoor")}: ${i18next.t("general:Identity requires Casdoor - Tooltip")}`);
                return false;
              }}
              // Sites is where the menu is set, so it can never be hidden from it
              onChange={(keys) => updateField("navItems", keys.includes("/sites") ? keys : [...keys, "/sites"])}
            />
          </FormRow>
        </FormSection>

        <FormSection title={i18next.t("site:Authentication")} description={i18next.t("site:Authentication desc")}>
          {text("issuer", "site:OIDC issuer")}
          {text("clientId", "provider:Client ID")}
          <FormRow labelKey="provider:Client secret">
            <PasswordInput value={site.clientSecret ?? ""} onChange={(e) => updateField("clientSecret", e.target.value)} />
          </FormRow>
          <FormRow labelKey="site:Check user balance">
            <Switch checked={!!site.checkUserBalance} onCheckedChange={(value) => updateField("checkUserBalance", value)} />
          </FormRow>
        </FormSection>

        <FormSection title={i18next.t("site:Advanced")} description={i18next.t("site:Advanced desc")}>
          {text("ipParsingMode", "site:IP parsing mode")}
          {text("parentDbName", "site:Parent DB name")}
          {text("hubDbNames", "site:Hub DB names", {placeholder: "openagent-db1, openagent-db2"})}
          {text("socks5Proxy", "site:Socks5 proxy")}
          {text("logConfig", "site:Log config", {block: true})}
        </FormSection>
      </div>
    </EditPageShell>
  );
}
