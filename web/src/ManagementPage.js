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

import React, {useEffect, useRef, useState} from "react";
import {Link, Redirect, Route, Switch, withRouter} from "react-router-dom";
import {Avatar, Button, Card, Drawer, Dropdown, Layout, Menu, Result} from "antd";
import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BarsOutlined,
  BulbOutlined,
  CommentOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DownOutlined,
  FolderOpenOutlined,
  FormOutlined,
  FundOutlined,
  HistoryOutlined,
  HomeOutlined,
  InboxOutlined,
  LayoutOutlined,
  LineChartOutlined,
  LockOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  OrderedListOutlined,
  RocketOutlined,
  SafetyOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  UserOutlined,
  WalletOutlined
} from "@ant-design/icons";
import "./App.less";
import * as Setting from "./Setting";
import AuthCallback from "./AuthCallback";
import i18next from "i18next";
import LanguageSelect from "./LanguageSelect";
import ThemeSelect from "./ThemeSelect";
import StoreSelect from "./StoreSelect";
import BreadcrumbBar from "./common/BreadcrumbBar";
import HomePage from "./HomePage";
import StoreListPage from "./StoreListPage";
import StoreEditPage from "./StoreEditPage";
import AnalysisEditPage from "./AnalysisEditPage";
import AnalysisListPage from "./AnalysisListPage";
import FileListPage from "./FileListPage";
import FileTreePage from "./FileTreePage";
import ProviderListPage from "./ProviderListPage";
import ProviderEditPage from "./ProviderEditPage";
import PipeListPage from "./PipeListPage";
import PipeEditPage from "./PipeEditPage";
import SkillListPage from "./SkillListPage";
import SkillEditPage from "./SkillEditPage";
import ToolListPage from "./ToolListPage";
import ToolEditPage from "./ToolEditPage";
import ServerListPage from "./ServerListPage";
import ServerEditPage from "./ServerEditPage";
import ServerStorePage from "./ServerStorePage";
import VectorListPage from "./VectorListPage";
import VectorEditPage from "./VectorEditPage";
import SigninPage from "./SigninPage";
import AccountPage from "./AccountPage";
import ChatEditPage from "./ChatEditPage";
import ChatListPage from "./ChatListPage";
import MessageListPage from "./MessageListPage";
import MessageEditPage from "./MessageEditPage";
import SessionListPage from "./SessionListPage";
import SnapshotListPage from "./SnapshotListPage";
import RecordListPage from "./RecordListPage";
import RecordEditPage from "./RecordEditPage";
import TaskListPage from "./TaskListPage";
import TaskEditPage from "./TaskEditPage";
import ScaleListPage from "./ScaleListPage";
import ScaleEditPage from "./ScaleEditPage";
import FormListPage from "./FormListPage";
import FormEditPage from "./FormEditPage";
import FormDataPage from "./FormDataPage";
import ChatPage from "./ChatPage";
import QuickSetupPage from "./QuickSetupPage";
import StoreHubPage from "./StoreHubPage";
import StoreViewPage from "./StoreViewPage";
import UsagePage from "./UsagePage";
import VisitorPage from "./VisitorPage";
import SystemInfo from "./SystemInfo";
import ResourceListPage from "./ResourceListPage";
import SiteListPage from "./SiteListPage";
import SiteEditPage from "./SiteEditPage";
import CommentListPage from "./CommentListPage";
import CommentEditPage from "./CommentEditPage";
const {Header, Footer, Content, Sider} = Layout;

function getMenuParentKey(uri) {
  if (!uri) {return null;}
  if (uri.includes("/chats") || uri.includes("/messages") || uri.includes("/stores")) {return "/basic";}
  if (uri.includes("/providers") || uri.includes("/pipes") || uri.includes("/tools") || uri.includes("/servers")) {return "/connectors";}
  if (uri.includes("/files") || uri.includes("/vectors") || uri.includes("/resources")) {return "/knowledge-base";}
  if (uri.includes("/tasks") || uri.includes("/scales") || uri.includes("/forms")) {return "/multimedia";}
  if (uri.includes("/sessions") || uri.includes("/records") || uri.includes("/snapshots")) {return "/logs";}
  if (uri.includes("/users") || uri.includes("/casdoor-resources") || uri.includes("/permissions")) {return "/identity";}
  if (uri.includes("/sysinfo") || uri.includes("/swagger") || uri.includes("/visitors") || uri.includes("/sites") || uri.includes("/usages") || uri.includes("/comments")) {return "/admin";}
  return null;
}

const siderMenuOpenKeysLsKey = "siderMenuOpenKeys";

const defaultMenuOpenKeys = ["/basic", "/knowledge-base", "/connectors", "/admin"];

function readSavedMenuOpenKeys() {
  try {
    const raw = localStorage.getItem(siderMenuOpenKeysLsKey);
    if (!raw) {
      return defaultMenuOpenKeys;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : defaultMenuOpenKeys;
  } catch {
    return defaultMenuOpenKeys;
  }
}

function persistMenuOpenKeys(keys) {
  try {
    localStorage.setItem(siderMenuOpenKeysLsKey, JSON.stringify(keys));
  } catch {
    // ignore quota / private mode
  }
}

function ManagementPage(props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [siderCollapsed, setSiderCollapsed] = useState(() => localStorage.getItem("siderCollapsed") === "true");
  const siderWasCollapsedRef = useRef(false);
  const [menuOpenKeys, setMenuOpenKeys] = useState(() => {
    if (localStorage.getItem("siderCollapsed") === "true") {
      return [];
    }
    const saved = readSavedMenuOpenKeys();
    const parentKey = getMenuParentKey(props.uri || location.pathname);
    const next = new Set(saved);
    if (parentKey) {
      next.add(parentKey);
    }
    return [...next];
  });

  useEffect(() => {
    if (siderCollapsed) {
      siderWasCollapsedRef.current = true;
      setMenuOpenKeys([]);
      return;
    }
    const justExpanded = siderWasCollapsedRef.current;
    siderWasCollapsedRef.current = false;
    const parentKey = getMenuParentKey(props.uri);
    setMenuOpenKeys(prev => {
      if (justExpanded) {
        const saved = readSavedMenuOpenKeys();
        const next = new Set(saved);
        if (parentKey) {
          next.add(parentKey);
        }
        return [...next];
      }
      if (parentKey && !prev.includes(parentKey)) {
        return [...prev, parentKey];
      }
      return prev;
    });
  }, [props.uri, siderCollapsed]);

  useEffect(() => {
    if (!siderCollapsed) {
      persistMenuOpenKeys(menuOpenKeys);
    }
  }, [menuOpenKeys, siderCollapsed]);
  const {
    account,
    site,
    forms,
    themeAlgorithm,
    logo,
    uri,
    onUpdateSite,
    setLogoAndThemeAlgorithm,
    signout,
    onMenuClick,
    history,
  } = props;

  const currentUri = uri || location.pathname;
  const firstSeg = currentUri.split("/").filter(Boolean)[0] || "";
  const selectedLeafKey = (firstSeg === "" || firstSeg === "home") ? "/chat" : ("/" + firstSeg);

  const isDark = themeAlgorithm.includes("dark");
  const textColor = isDark ? "white" : "black";
  const siderLogo = logo || Setting.getLogo(themeAlgorithm, site?.logoUrl);
  const navbarHtml = Setting.getNavbarHtml(themeAlgorithm, site?.navbarHtml);

  const toggleSider = () => {
    const next = !siderCollapsed;
    setSiderCollapsed(next);
    localStorage.setItem("siderCollapsed", String(next));
  };

  const onClose = () => setMenuVisible(false);
  const showMenu = () => setMenuVisible(true);

  function isStoreSelectEnabled() {
    const currentUri = uri || window.location.pathname;
    if (currentUri.includes("/chat")) {
      return true;
    }
    const enabledStartsWith = ["/stores", "/providers", "/vectors", "/chats", "/messages", "/usages", "/files"];
    if (enabledStartsWith.some(prefix => currentUri.startsWith(prefix))) {
      return true;
    }
    if (currentUri === "/" || currentUri === "/home") {
      if (
        Setting.isAnonymousUser(account) ||
        Setting.isChatUser(account) ||
        Setting.isAdminUser(account) ||
        Setting.isChatAdminUser(account) ||
        Setting.getUrlParam("isRaw") !== null
      ) {
        return true;
      }
    }
    return false;
  }

  function renderAvatar() {
    const avatarStyle = {verticalAlign: "middle", flexShrink: 0};
    if (account.avatar === "") {
      return (
        <Avatar style={{...avatarStyle, backgroundColor: Setting.getAvatarColor(account.name)}} size={32}>
          {Setting.getShortName(account.name)}
        </Avatar>
      );
    } else {
      return (
        <Avatar src={account.avatar} style={avatarStyle} size={32}>
          {Setting.getShortName(account.name)}
        </Avatar>
      );
    }
  }

  function renderUserInfo() {
    return (
      <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
        {renderAvatar()}
        {!Setting.isMobile() && (
          <span style={{fontSize: "14px", fontWeight: 500, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
            {Setting.getShortName(account.displayName)}
          </span>
        )}
        <DownOutlined style={{fontSize: "10px", opacity: 0.45}} />
      </div>
    );
  }

  function renderRightDropdown() {
    if (Setting.isAnonymousUser(account) || Setting.getUrlParam("isRaw") !== null) {
      return (
        <div className="rightDropDown select-box">
          {renderUserInfo()}
        </div>
      );
    }

    const items = [];
    if (!Setting.isAnonymousUser(account)) {
      items.push(Setting.getItem(<><SettingOutlined />&nbsp;&nbsp;{i18next.t("account:My Account")}</>, "/account"));
      items.push(Setting.getItem(<><LogoutOutlined />&nbsp;&nbsp;{i18next.t("account:Sign Out")}</>, "/logout"));
    } else {
      items.push(Setting.getItem(<><LoginOutlined />&nbsp;&nbsp;{i18next.t("account:Sign In")}</>, "/login"));
    }

    const onClick = (e) => {
      if (e.key === "/account") {
        if (Setting.isBasicLoginMode(account)) {
          history.push("/account");
        } else {
          Setting.openLink(Setting.getMyProfileUrl(account));
        }
      } else if (e.key === "/logout") {
        signout();
      } else if (e.key === "/login") {
        if (Setting.getSigninUrl() !== "") {
          history.push(window.location.pathname);
          Setting.redirectToLogin();
        } else {
          sessionStorage.setItem("from", window.location.pathname);
          history.push("/signin");
        }
      }
    };

    return (
      <Dropdown key="/rightDropDown" menu={{items, onClick}}>
        <div className="rightDropDown">
          {renderUserInfo()}
        </div>
      </Dropdown>
    );
  }

  function renderAccountMenu() {
    if (account === undefined) {
      return null;
    } else if (account === null) {
      return (
        <div style={{display: "flex", alignItems: "center", gap: "4px", paddingRight: "8px"}}>
          <ThemeSelect themeAlgorithm={themeAlgorithm} onChange={setLogoAndThemeAlgorithm} />
          <LanguageSelect />
          {Setting.getSignupUrl() !== "" && (
            <a key="/signup" href={Setting.getSignupUrl()} style={{padding: "0 12px", fontSize: "14px"}}>{i18next.t("account:Sign Up")}</a>
          )}
          <a key="/signin" href={Setting.getSigninUrl() || "/signin"} style={{padding: "0 12px", fontSize: "14px"}}>{i18next.t("account:Sign In")}</a>
        </div>
      );
    } else {
      return (
        <div style={{display: "flex", alignItems: "center", gap: "2px", paddingRight: "8px"}}>
          {navbarHtml && (
            <div style={{display: "flex", alignItems: "center"}} dangerouslySetInnerHTML={{__html: navbarHtml}} />
          )}
          {Setting.isLocalAdminUser(account) && (
            <StoreSelect
              account={account}
              className="store-select"
              withAll={true}
              style={{display: Setting.isMobile() ? "none" : "flex"}}
              disabled={!isStoreSelectEnabled()}
            />
          )}
          <ThemeSelect className="select-box" themeAlgorithm={themeAlgorithm} onChange={setLogoAndThemeAlgorithm} />
          <LanguageSelect className="select-box" />
          {renderRightDropdown()}
        </div>
      );
    }
  }

  function filterMenuItems(menuItems, navItems) {
    if (!navItems || navItems.includes("all")) {
      return menuItems;
    }

    const effectiveNavItems = new Set(navItems);

    const filteredItems = menuItems.map(item => {
      if (!Array.isArray(item.children)) {
        return item;
      }
      const filteredChildren = item.children.filter(child => effectiveNavItems.has(child.key));
      const newItem = {...item};
      newItem.children = filteredChildren;
      return newItem;
    });

    return filteredItems.filter(item => {
      if (Array.isArray(item.children)) {
        return item.children.length > 0;
      }
      return item.key === "/" || effectiveNavItems.has(item.key);
    });
  }

  /** Strip sidebar items that only open Casdoor admin URLs; built-in auth uses in-app pages instead. */
  function filterUserMenuItems(menuItems) {
    if (!Setting.isBasicLoginMode(account)) {
      return menuItems;
    }
    return menuItems.filter(item => !["/identity", "#", "##", "###"].includes(item.key));
  }

  function getMenuItems() {
    const res = [];

    res.push(Setting.getItem(<Link to="/">{i18next.t("general:Home")}</Link>, "/", <HomeOutlined />));

    if (account === null || account === undefined) {
      return [];
    }

    const navItems = site?.navItems;

    if (Setting.isTaskUser(account)) {
      res.push(Setting.getItem(<Link to="/tasks">{i18next.t("general:Tasks")}</Link>, "/tasks", <UnorderedListOutlined />));
      if (Setting.isAdminUser(account)) {
        res.push(Setting.getItem(<Link to="/scales">{i18next.t("general:Scales")}</Link>, "/scales", <FundOutlined />));
      }

      if (window.location.pathname === "/") {
        Setting.goToLinkSoft({props}, "/tasks");
      }
    } else {
      res.pop();

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/chat">{i18next.t("general:Chat")}</Link>, "/chat", <CommentOutlined />));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/quick-setup">{i18next.t("general:Quick Setup")}</Link>, "/quick-setup", <RocketOutlined />));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/hub">{i18next.t("general:Hub")}</Link>, "/hub", <ShopOutlined />));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/stores">{i18next.t("general:Basic")}</Link>, "/basic", <BulbOutlined />, [
        Setting.getItem(<Link to="/stores">{i18next.t("general:Stores")}</Link>, "/stores", <AppstoreOutlined />),
        Setting.getItem(<Link to="/chats">{i18next.t("general:Chats")}</Link>, "/chats", <OrderedListOutlined />),
        Setting.getItem(<Link to="/messages">{i18next.t("general:Messages")}</Link>, "/messages", <MessageOutlined />),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/files">{i18next.t("general:Knowledge Base")}</Link>, "/knowledge-base", <DatabaseOutlined />, [
        Setting.getItem(<Link to="/files">{i18next.t("general:Files")}</Link>, "/files", <FolderOpenOutlined />),
        Setting.getItem(<Link to="/vectors">{i18next.t("general:Vectors")}</Link>, "/vectors", <ApartmentOutlined />),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/providers">{i18next.t("general:Connectors")}</Link>, "/connectors", <ApiOutlined />, [
        Setting.getItem(<Link to="/providers">{i18next.t("general:Providers")}</Link>, "/providers", <ThunderboltOutlined />),
        Setting.getItem(<Link to="/pipes">{i18next.t("general:Pipes")}</Link>, "/pipes", <MessageOutlined />),
        Setting.getItem(<Link to="/skills">{i18next.t("general:Skills")}</Link>, "/skills", <RocketOutlined />),
        Setting.getItem(<Link to="/tools">{i18next.t("general:Tools")}</Link>, "/tools", <ToolOutlined />),
        Setting.getItem(<Link to="/servers">{i18next.t("general:MCP Servers")}</Link>, "/servers", <ApiOutlined />),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/tasks">{i18next.t("general:Multimedia")}</Link>, "/multimedia", <UnorderedListOutlined />, [
        Setting.getItem(<Link to="/tasks">{i18next.t("general:Tasks")}</Link>, "/tasks", <UnorderedListOutlined />),
        Setting.getItem(<Link to="/scales">{i18next.t("general:Scales")}</Link>, "/scales", <FundOutlined />),
        Setting.getItem(<Link to="/forms">{i18next.t("general:Forms")}</Link>, "/forms", <FormOutlined />),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/records">{i18next.t("general:Auditing Logs")}</Link>, "/logs", <WalletOutlined />, [
        Setting.getItem(<Link to="/records">{i18next.t("general:Logs")}</Link>, "/records", <DatabaseOutlined />),
        Setting.getItem(<Link to="/sessions">{i18next.t("general:Sessions")}</Link>, "/sessions", <OrderedListOutlined />),
        Setting.getItem(<Link to="/snapshots">{i18next.t("general:Snapshots")}</Link>, "/snapshots", <HistoryOutlined />),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="#">{i18next.t("general:Identity")}</Link>, "/identity", <LockOutlined />, [
        Setting.getItem(
          <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(account).replace("/account", "/users")}>
            {i18next.t("general:Users")}
            {Setting.renderExternalLink()}
          </a>, "/users", <UserOutlined />),
        Setting.getItem(
          <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(account).replace("/account", "/resources")}>
            {i18next.t("general:Casdoor Resources")}
            {Setting.renderExternalLink()}
          </a>, "/casdoor-resources", <TeamOutlined />),
        Setting.getItem(
          <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(account).replace("/account", "/permissions")}>
            {i18next.t("general:Permissions")}
            {Setting.renderExternalLink()}
          </a>, "/permissions", <SafetyOutlined />),
      ]));

      if (Setting.isAdminUser(account) && !Setting.isChatAdminUser(account)) {
        res.push(Setting.getItem(<Link style={{color: textColor}} to="/sites/site-built-in">{i18next.t("general:Admin")}</Link>, "/admin", <SettingOutlined />, [
          Setting.getItem(<Link to="/sites/site-built-in">{i18next.t("general:Sites")}</Link>, "/sites", <LayoutOutlined />),
          Setting.getItem(<Link to="/comments">{i18next.t("general:Comments")}</Link>, "/comments", <CommentOutlined />),
          Setting.getItem(<Link to="/resources">{i18next.t("general:Resources")}</Link>, "/resources", <InboxOutlined />),
          Setting.getItem(<Link to="/usages">{i18next.t("general:Usages")}</Link>, "/usages", <LineChartOutlined />),
          Setting.getItem(<Link to="/visitors">{i18next.t("general:Visitors")}</Link>, "/visitors", <FundOutlined />),
          Setting.getItem(<Link to="/sysinfo">{i18next.t("general:System Info")}</Link>, "/sysinfo", <DashboardOutlined />),
          Setting.getItem(
            <a target="_blank" rel="noreferrer" href={Setting.isLocalhost() ? `${Setting.ServerUrl}/swagger/index.html` : "/swagger/index.html"}>
              {i18next.t("general:Swagger")}
              {Setting.renderExternalLink()}
            </a>, "/swagger", <ApiOutlined />),
        ]));
      }

      if (!Setting.isAdminUser(account) && !Setting.isChatAdminUser(account)) {
        return res.filter(item => item.key === "/chat");
      }

      return Setting.isBasicLoginMode(account) ? filterMenuItems(filterUserMenuItems(res), navItems) : filterMenuItems(res, navItems);
    }

    const sortedForms = forms.slice().sort((a, b) => a.position.localeCompare(b.position));
    sortedForms.forEach(form => {
      const path = `/forms/${form.name}/data`;
      res.push(Setting.getItem(<Link to={path}>{form.displayName}</Link>, path, <FormOutlined />));
    });

    return Setting.isBasicLoginMode(account) ? filterUserMenuItems(res) : res;
  }

  function renderHomeIfSignedIn(component) {
    if (account !== null && account !== undefined) {
      return <Redirect to="/" />;
    } else {
      return component;
    }
  }

  function renderSigninIfNotSignedIn(component) {
    if (account === null) {
      const signinUrl = Setting.getSigninUrl();
      if (signinUrl && signinUrl !== "") {
        sessionStorage.setItem("from", window.location.pathname);
        window.location.replace(signinUrl);
      } else {
        history.push("/signin");
        return null;
      }
    } else if (account === undefined) {
      return null;
    } else {
      return component;
    }
  }

  function renderRouter() {
    return (
      <Switch>
        <Route exact path="/callback" component={AuthCallback} />
        <Route exact path="/account" render={(props) => renderSigninIfNotSignedIn(Setting.isBasicLoginMode(account) ? <AccountPage account={account} {...props} /> : <Redirect to="/" />)} />
        <Route exact path="/signin" render={(props) => Setting.isAnonymousUser(account) ? <SigninPage logo={siderLogo} {...props} /> : renderHomeIfSignedIn(<SigninPage logo={siderLogo} {...props} />)} />
        <Route exact path="/" render={(props) => renderSigninIfNotSignedIn(<HomePage account={account} {...props} />)} />
        <Route exact path="/home" render={(props) => renderSigninIfNotSignedIn(<HomePage account={account} {...props} />)} />
        <Route exact path="/stores" render={(props) => renderSigninIfNotSignedIn(<StoreListPage account={account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName" render={(props) => renderSigninIfNotSignedIn(<StoreEditPage account={account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/view" render={(props) => renderSigninIfNotSignedIn(<FileTreePage account={account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/chats" render={(props) => renderSigninIfNotSignedIn(<ChatListPage account={account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/messages" render={(props) => renderSigninIfNotSignedIn(<MessageListPage account={account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/vectors" render={(props) => renderSigninIfNotSignedIn(<VectorListPage account={account} {...props} />)} />
        <Route exact path="/analysis" render={(props) => renderSigninIfNotSignedIn(<AnalysisListPage account={account} {...props} />)} />
        <Route exact path="/analysis/:owner/:storeName" render={(props) => renderSigninIfNotSignedIn(<AnalysisEditPage account={account} {...props} />)} />
        <Route exact path="/providers" render={(props) => renderSigninIfNotSignedIn(<ProviderListPage account={account} {...props} />)} />
        <Route exact path="/providers/:providerName" render={(props) => renderSigninIfNotSignedIn(<ProviderEditPage account={account} {...props} />)} />
        <Route exact path="/pipes" render={(props) => renderSigninIfNotSignedIn(<PipeListPage account={account} {...props} />)} />
        <Route exact path="/pipes/:pipeName" render={(props) => renderSigninIfNotSignedIn(<PipeEditPage account={account} {...props} />)} />
        <Route exact path="/skills" render={(props) => renderSigninIfNotSignedIn(<SkillListPage account={account} {...props} />)} />
        <Route exact path="/skills/:skillName" render={(props) => renderSigninIfNotSignedIn(<SkillEditPage account={account} {...props} />)} />
        <Route exact path="/tools" render={(props) => renderSigninIfNotSignedIn(<ToolListPage account={account} {...props} />)} />
        <Route exact path="/tools/:toolName" render={(props) => renderSigninIfNotSignedIn(<ToolEditPage account={account} {...props} />)} />
        <Route exact path="/servers" render={(props) => renderSigninIfNotSignedIn(<ServerListPage account={account} {...props} />)} />
        <Route exact path="/servers/:serverName" render={(props) => renderSigninIfNotSignedIn(<ServerEditPage account={account} {...props} />)} />
        <Route exact path="/server-store" render={(props) => renderSigninIfNotSignedIn(<ServerStorePage account={account} {...props} />)} />
        <Route exact path="/files" render={(props) => renderSigninIfNotSignedIn(<FileListPage account={account} {...props} />)} />
        <Route exact path="/vectors" render={(props) => renderSigninIfNotSignedIn(<VectorListPage account={account} {...props} />)} />
        <Route exact path="/vectors/:vectorName" render={(props) => renderSigninIfNotSignedIn(<VectorEditPage account={account} {...props} />)} />
        <Route exact path="/chats" render={(props) => renderSigninIfNotSignedIn(<ChatListPage account={account} {...props} />)} />
        <Route exact path="/chats/:chatName" render={(props) => renderSigninIfNotSignedIn(<ChatEditPage account={account} {...props} />)} />
        <Route exact path="/messages" render={(props) => renderSigninIfNotSignedIn(<MessageListPage account={account} {...props} />)} />
        <Route exact path="/messages/:messageName" render={(props) => renderSigninIfNotSignedIn(<MessageEditPage account={account} {...props} />)} />
        <Route exact path="/usages" render={(props) => renderSigninIfNotSignedIn(<UsagePage account={account} themeAlgorithm={themeAlgorithm} {...props} />)} />
        <Route exact path="/sites" render={(props) => renderSigninIfNotSignedIn(<SiteListPage account={account} {...props} />)} />
        <Route exact path="/sites/:siteName" render={(props) => renderSigninIfNotSignedIn(<SiteEditPage account={account} onUpdateSite={onUpdateSite} {...props} />)} />
        <Route exact path="/visitors" render={(props) => renderSigninIfNotSignedIn(<VisitorPage account={account} themeAlgorithm={themeAlgorithm} {...props} />)} />
        <Route exact path="/comments" render={(props) => renderSigninIfNotSignedIn(<CommentListPage account={account} {...props} />)} />
        <Route exact path="/comments/:commentOwner/:commentName" render={(props) => renderSigninIfNotSignedIn(<CommentEditPage account={account} {...props} />)} />
        <Route exact path="/sessions" render={(props) => renderSigninIfNotSignedIn(<SessionListPage account={account} {...props} />)} />
        <Route exact path="/snapshots" render={(props) => renderSigninIfNotSignedIn(<SnapshotListPage account={account} {...props} />)} />
        <Route exact path="/records" render={(props) => renderSigninIfNotSignedIn(<RecordListPage account={account} {...props} />)} />
        <Route exact path="/records/:organizationName/:recordName" render={(props) => renderSigninIfNotSignedIn(<RecordEditPage account={account} {...props} />)} />
        <Route exact path="/tasks" render={(props) => renderSigninIfNotSignedIn(<TaskListPage account={account} {...props} />)} />
        <Route exact path="/tasks/:owner/:taskName" render={(props) => renderSigninIfNotSignedIn(<TaskEditPage account={account} {...props} />)} />
        <Route exact path="/scales" render={(props) => renderSigninIfNotSignedIn(<ScaleListPage account={account} {...props} />)} />
        <Route exact path="/scales/:owner/:scaleName" render={(props) => renderSigninIfNotSignedIn(<ScaleEditPage account={account} {...props} />)} />
        <Route exact path="/forms" render={(props) => renderSigninIfNotSignedIn(<FormListPage account={account} {...props} />)} />
        <Route exact path="/forms/:formName" render={(props) => renderSigninIfNotSignedIn(<FormEditPage account={account} {...props} />)} />
        <Route exact path="/forms/:formName/data" render={(props) => renderSigninIfNotSignedIn(<FormDataPage key={props.match.params.formName} account={account} {...props} />)} />
        <Route exact path="/resources" render={(props) => renderSigninIfNotSignedIn(<ResourceListPage account={account} {...props} />)} />
        <Route exact path="/quick-setup" render={(props) => renderSigninIfNotSignedIn(<QuickSetupPage account={account} {...props} />)} />
        <Route exact path="/hub" render={(props) => renderSigninIfNotSignedIn(<StoreHubPage account={account} site={site} {...props} />)} />
        <Route exact path="/agents/:owner/:storeName" render={(props) => renderSigninIfNotSignedIn(<StoreViewPage account={account} {...props} />)} />
        <Route exact path="/agents/:owner/:storeName/insights/:sub" render={(props) => renderSigninIfNotSignedIn(<StoreViewPage account={account} {...props} />)} />
        <Route exact path="/agents/:owner/:storeName/:tab" render={(props) => renderSigninIfNotSignedIn(<StoreViewPage account={account} {...props} />)} />
        <Route exact path="/chat" render={(props) => renderSigninIfNotSignedIn(<ChatPage account={account} site={site} {...props} />)} />
        <Route exact path="/chat/:chatName" render={(props) => renderSigninIfNotSignedIn(<ChatPage account={account} site={site} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/chat" render={(props) => renderSigninIfNotSignedIn(<ChatPage account={account} site={site} {...props} />)} />
        <Route exact path="/:owner/:storeName/chat" render={(props) => renderSigninIfNotSignedIn(<ChatPage account={account} site={site} {...props} />)} />
        <Route exact path="/:owner/:storeName/chat/:chatName" render={(props) => renderSigninIfNotSignedIn(<ChatPage account={account} site={site} {...props} />)} />
        <Route exact path="/sysinfo" render={(props) => renderSigninIfNotSignedIn(<SystemInfo account={account} {...props} />)} />
        <Route path="" render={() => <Result status="404" title="404 NOT FOUND" subTitle={i18next.t("general:Sorry, the page you visited does not exist.")} extra={<a href="/"><Button type="primary">{i18next.t("general:Back Home")}</Button></a>} />} />
      </Switch>
    );
  }

  function isHiddenHeaderAndFooter(pathOrUri) {
    const u = pathOrUri !== undefined ? pathOrUri : uri;
    if (!u) {
      return false;
    }
    const hiddenPaths = ["/access"];
    for (const path of hiddenPaths) {
      if (u.startsWith(path)) {
        return true;
      }
    }
    return false;
  }

  function isWithoutCard() {
    return Setting.isMobile() || isHiddenHeaderAndFooter(uri) || window.location.pathname === "/chat" || window.location.pathname.startsWith("/chat/") || window.location.pathname === "/";
  }

  function renderHeader() {
    if (isHiddenHeaderAndFooter()) {
      return null;
    }

    const onClick = ({key}) => {
      if (Setting.isMobile()) {
        setMenuVisible(false);
      }
      onMenuClick({key});
    };

    return (
      <Header style={{display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px 0 0", marginBottom: "0", backgroundColor: isDark ? "#141414" : "#ffffff", position: "sticky", top: 0, zIndex: 99, borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #f0f0f0", boxShadow: "none", height: "52px", lineHeight: "52px"}}>
        <div style={{display: "flex", alignItems: "center"}}>
          {Setting.isMobile() ? (
            <React.Fragment>
              <Drawer title={i18next.t("general:Close")} placement="left" open={menuVisible} onClose={onClose}>
                <Menu
                  items={getMenuItems()}
                  mode={"inline"}
                  selectedKeys={[selectedLeafKey]}
                  openKeys={menuOpenKeys}
                  onOpenChange={setMenuOpenKeys}
                  style={{lineHeight: "48px"}}
                  onClick={onClick}
                />
              </Drawer>
              <Button icon={<BarsOutlined />} onClick={showMenu} type="text">
                {i18next.t("general:Menu")}
              </Button>
            </React.Fragment>
          ) : (
            <Button
              icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSider}
              type="text"
              style={{fontSize: 16, width: 40, height: 40}}
            />
          )}
          <BreadcrumbBar uri={currentUri} />
        </div>
        <div style={{flexShrink: 0}}>
          {renderAccountMenu()}
        </div>
      </Header>
    );
  }

  function renderFooter() {
    if (isHiddenHeaderAndFooter()) {
      return null;
    }

    return (
      <React.Fragment>
        <Footer id="footer" style={{textAlign: "center", height: "67px"}}>
          <div dangerouslySetInnerHTML={{__html: Setting.getFooterHtml(themeAlgorithm, site?.footerHtml, site)}} />
        </Footer>
      </React.Fragment>
    );
  }

  const siderWidth = 256;
  const siderCollapsedWidth = 80;
  const showSider = !Setting.isMobile() && !isHiddenHeaderAndFooter();
  if (window.location.pathname === "/signin") {
    return renderRouter();
  }
  const contentMarginLeft = showSider ? (siderCollapsed ? siderCollapsedWidth : siderWidth) : 0;

  return (
    <React.Fragment>
      {showSider && (
        <Sider
          collapsed={siderCollapsed}
          collapsedWidth={siderCollapsedWidth}
          width={siderWidth}
          trigger={null}
          theme={isDark ? "dark" : "light"}
          style={{
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            boxShadow: "none",
            borderRight: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #eaedf3",
            background: isDark ? "#141414" : "#fafbfc",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{
            height: 52,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: siderCollapsed ? "center" : "flex-start",
            padding: siderCollapsed ? "0" : "0 16px 0 24px",
            overflow: "hidden",
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #eaedf3",
          }}>
            <Link to="/">
              <img
                src={siderLogo}
                alt="logo"
                style={{
                  height: siderCollapsed ? 28 : 38,
                  width: siderCollapsed ? 28 : undefined,
                  maxWidth: siderCollapsed ? 28 : 160,
                  objectFit: "contain",
                  borderRadius: siderCollapsed ? 6 : 0,
                  transition: "max-width 0.2s, height 0.2s, width 0.2s",
                }}
              />
            </Link>
          </div>
          <div className="sider-menu-container" style={{flex: 1, overflow: "auto", paddingTop: "6px"}}>
            <Menu
              mode="inline"
              items={getMenuItems()}
              selectedKeys={[selectedLeafKey]}
              openKeys={menuOpenKeys}
              onOpenChange={setMenuOpenKeys}
              theme={isDark ? "dark" : "light"}
              style={{borderRight: 0, background: isDark ? "#141414" : "#fafbfc"}}
              onClick={({key}) => onMenuClick({key})}
            />
          </div>
        </Sider>
      )}
      <div style={{marginLeft: contentMarginLeft, transition: "margin-left 0.2s", display: "flex", flexDirection: "column", minHeight: "100vh"}}>
        {renderHeader()}
        <Content style={{display: "flex", flexDirection: "column"}}>
          {isWithoutCard() ?
            renderRouter() :
            <Card className="content-warp-card" styles={{body: {padding: 0, margin: 0}}}>
              {renderRouter()}
            </Card>
          }
        </Content>
        {renderFooter()}
      </div>
    </React.Fragment>
  );
}

export default withRouter(ManagementPage);
