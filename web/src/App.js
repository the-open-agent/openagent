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

import React, {Component} from "react";
import {Link, Redirect, Route, Switch, withRouter} from "react-router-dom";
import {StyleProvider, legacyLogicalPropertiesTransformer} from "@ant-design/cssinjs";
import {Avatar, Button, Card, ConfigProvider, Drawer, Dropdown, FloatButton, Layout, Menu, Result} from "antd";
import {AppstoreTwoTone, BarsOutlined, BulbTwoTone, CloudTwoTone, CommentOutlined, DownOutlined, HomeTwoTone, LockTwoTone, LoginOutlined, LogoutOutlined, SettingOutlined, SettingTwoTone, VideoCameraTwoTone, WalletTwoTone} from "@ant-design/icons";
import "./App.less";
import {Helmet} from "react-helmet";
import * as Setting from "./Setting";
import * as AccountBackend from "./backend/AccountBackend";
import AuthCallback from "./AuthCallback";
import * as Conf from "./Conf";
import HomePage from "./HomePage";
import StoreListPage from "./StoreListPage";
import StoreEditPage from "./StoreEditPage";
import FileListPage from "./FileListPage";
import FileViewPage from "./FileViewPage";
import FileTreePage from "./FileTreePage";
import VideoListPage from "./VideoListPage";
import VideoEditPage from "./VideoEditPage";
import VideoPage from "./VideoPage";
import PublicVideoListPage from "./basic/PublicVideoListPage";
import ProviderListPage from "./ProviderListPage";
import ProviderEditPage from "./ProviderEditPage";
import VectorListPage from "./VectorListPage";
import VectorEditPage from "./VectorEditPage";
import SigninPage from "./SigninPage";
import i18next from "i18next";
import {withTranslation} from "react-i18next";
import LanguageSelect from "./LanguageSelect";
import ThemeSelect from "./ThemeSelect";
import ChatEditPage from "./ChatEditPage";
import ChatListPage from "./ChatListPage";
import MessageListPage from "./MessageListPage";
import MessageEditPage from "./MessageEditPage";
import GraphListPage from "./GraphListPage";
import GraphEditPage from "./GraphEditPage";
import NodeListPage from "./NodeListPage";
import NodeEditPage from "./NodeEditPage";
import MachineListPage from "./MachineListPage";
import MachineEditPage from "./MachineEditPage";
import AssetListPage from "./AssetListPage";
import AssetEditPage from "./AssetEditPage";
import ScanListPage from "./ScanListPage";
import ScanEditPage from "./ScanEditPage";
import ImageListPage from "./ImageListPage";
import ImageEditPage from "./ImageEditPage";
import ContainerListPage from "./ContainerListPage";
import ContainerEditPage from "./ContainerEditPage";
import PodListPage from "./PodListPage";
import PodEditPage from "./PodEditPage";
import SessionListPage from "./SessionListPage";
import ConnectionListPage from "./ConnectionListPage";
import RecordListPage from "./RecordListPage";
import RecordEditPage from "./RecordEditPage";
import WorkflowListPage from "./WorkflowListPage";
import WorkflowEditPage from "./WorkflowEditPage";
import TaskListPage from "./TaskListPage";
import TaskEditPage from "./TaskEditPage";
import ScaleListPage from "./ScaleListPage";
import ScaleEditPage from "./ScaleEditPage";
import FormListPage from "./FormListPage";
import FormEditPage from "./FormEditPage";
import FormDataPage from "./FormDataPage";
import * as FormBackend from "./backend/FormBackend";
import ArticleListPage from "./ArticleListPage";
import ArticleEditPage from "./ArticleEditPage";
import ChatPage from "./ChatPage";
import CustomGithubCorner from "./CustomGithubCorner";
import ShortcutsPage from "./basic/ShortcutsPage";
import UsagePage from "./UsagePage";
import ActivityPage from "./ActivityPage";
import * as StoreBackend from "./backend/StoreBackend";
import NodeWorkbench from "./NodeWorkbench";
import AccessPage from "./component/access/AccessPage";
import {PreviewInterceptor} from "./PreviewInterceptor";
import AuditPage from "./frame/AuditPage";
import PythonYolov8miPage from "./frame/PythonYolov8miPage";
import PythonSrPage from "./frame/PythonSrPage";
import SystemInfo from "./SystemInfo";
import * as FetchFilter from "./backend/FetchFilter";
import OsDesktop from "./OsDesktop";
import TemplateListPage from "./TemplateListPage";
import TemplateEditPage from "./TemplateEditPage";
import ApplicationListPage from "./ApplicationListPage";
import ApplicationEditPage from "./ApplicationEditPage";
import ApplicationStorePage from "./ApplicationStorePage";
import StoreSelect from "./StoreSelect";
import ApplicationDetailsPage from "./ApplicationViewPage";
import HospitalListPage from "./HospitalListPage";
import HospitalEditPage from "./HospitalEditPage";
import DoctorListPage from "./DoctorListPage";
import DoctorEditPage from "./DoctorEditPage";
import PatientListPage from "./PatientListPage";
import PatientEditPage from "./PatientEditPage";
import CaaseListPage from "./CaaseListPage";
import CaaseEditPage from "./CaaseEditPage";
import ConsultationListPage from "./ConsultationListPage";
import ConsultationEditPage from "./ConsultationEditPage";
import {shadcnThemeComponents, shadcnThemeToken} from "./shadcnTheme";

const {Header, Footer, Content} = Layout;

class App extends Component {
  constructor(props) {
    super(props);
    this.setThemeAlgorithm();
    let storageThemeAlgorithm = [];
    try {
      storageThemeAlgorithm = localStorage.getItem("themeAlgorithm") ? JSON.parse(localStorage.getItem("themeAlgorithm")) : ["default"];
    } catch {
      storageThemeAlgorithm = ["default"];
    }
    this.state = {
      classes: props,
      selectedMenuKey: 0,
      account: undefined,
      uri: null,
      themeAlgorithm: storageThemeAlgorithm,
      themeData: Conf.ThemeDefault,
      menuVisible: false,
      forms: [],
      store: undefined,
    };
    this.initConfig();
  }

  initConfig() {
    Setting.initServerUrl();
    Setting.initWebConfig();

    const cachedThemeColor = localStorage.getItem("themeColor");
    if (cachedThemeColor) {
      Setting.setThemeColor(cachedThemeColor);
    }

    FetchFilter.initDemoMode();
    Setting.initCasdoorSdk(Conf.AuthConfig);
    if (!Conf.DisablePreviewMode) {
      this.previewInterceptor = new PreviewInterceptor(() => this.state.account, this.props.history); // add interceptor
    }
  }

  UNSAFE_componentWillMount() {
    this.updateMenuKey();
    this.getAccount();
    this.setTheme();
    this.getForms();
  }

  setTheme() {
    StoreBackend.getStore("admin", "_casibase_default_store_").then((res) => {
      if (res.status !== "ok") {
        Setting.setThemeColor(Conf.ThemeDefault.colorPrimary);
        if (res.msg) {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        } else {
          Setting.showMessage("error", i18next.t("general:Failed to get"));
        }
        return;
      }
      // No store for owner admin yet (e.g. fresh DB): GetDefaultStore returns null with status ok.
      if (!res.data) {
        Setting.setThemeColor(Conf.ThemeDefault.colorPrimary);
        return;
      }
      const color = res.data.themeColor ? res.data.themeColor : Conf.ThemeDefault.colorPrimary;
      const currentColor = localStorage.getItem("themeColor");
      if (currentColor !== color) {
        Setting.setThemeColor(color);
        localStorage.setItem("themeColor", color);
      }
      this.setState({store: res.data});
    });
  }

  componentDidUpdate() {
    // eslint-disable-next-line no-restricted-globals
    const uri = location.pathname;
    if (this.state.uri !== uri) {
      this.updateMenuKey();
    }
  }

  updateMenuKeyForm(forms) {
    // eslint-disable-next-line no-restricted-globals
    const uri = location.pathname;
    this.setState({
      uri: uri,
    });

    forms.forEach(form => {
      const path = `/forms/${form.name}/data`;
      if (uri.includes(path)) {
        this.setState({selectedMenuKey: path});
      }
    });
  }

  updateMenuKey() {
    // eslint-disable-next-line no-restricted-globals
    const uri = location.pathname;
    this.setState({
      uri: uri,
    });
    if (uri === "/" || uri === "/home") {
      this.setState({selectedMenuKey: "/"});
    } else if (uri.includes("/stores")) {
      this.setState({selectedMenuKey: "/stores"});
    } else if (uri.includes("/providers")) {
      this.setState({selectedMenuKey: "/providers"});
    } else if (uri.includes("/vectors")) {
      this.setState({selectedMenuKey: "/vectors"});
    } else if (uri.includes("/chats")) {
      this.setState({selectedMenuKey: "/chats"});
    } else if (uri.includes("/messages")) {
      this.setState({selectedMenuKey: "/messages"});
    } else if (uri.includes("/graphs")) {
      this.setState({selectedMenuKey: "/graphs"});
    } else if (uri.includes("/scans")) {
      this.setState({selectedMenuKey: "/scans"});
    } else if (uri.includes("/usages")) {
      this.setState({selectedMenuKey: "/usages"});
    } else if (uri.includes("/activities")) {
      this.setState({selectedMenuKey: "/activities"});
    } else if (uri.includes("/nodes")) {
      this.setState({selectedMenuKey: "/nodes"});
    } else if (uri.includes("/machines")) {
      this.setState({selectedMenuKey: "/machines"});
    } else if (uri.includes("/assets")) {
      this.setState({selectedMenuKey: "/assets"});
    } else if (uri.includes("/images")) {
      this.setState({selectedMenuKey: "/images"});
    } else if (uri.includes("/containers")) {
      this.setState({selectedMenuKey: "/containers"});
    } else if (uri.includes("/pods")) {
      this.setState({selectedMenuKey: "/pods"});
    } else if (uri.includes("/templates")) {
      this.setState({selectedMenuKey: "/templates"});
    } else if (uri.includes("/applications")) {
      this.setState({selectedMenuKey: "/applications"});
    } else if (uri.includes("/sessions")) {
      this.setState({selectedMenuKey: "/sessions"});
    } else if (uri.includes("/connections")) {
      this.setState({selectedMenuKey: "/connections"});
    } else if (uri.includes("/records")) {
      this.setState({selectedMenuKey: "/records"});
    } else if (uri.includes("/workflows")) {
      this.setState({selectedMenuKey: "/workflows"});
    } else if (uri.includes("/audit")) {
      this.setState({selectedMenuKey: "/audit"});
    } else if (uri.includes("/yolov8mi")) {
      this.setState({selectedMenuKey: "/yolov8mi"});
    } else if (uri.includes("/sr")) {
      this.setState({selectedMenuKey: "/sr"});
    } else if (uri.includes("/tasks")) {
      this.setState({selectedMenuKey: "/tasks"});
    } else if (uri.includes("/scales")) {
      this.setState({selectedMenuKey: "/scales"});
    } else if (uri.includes("/forms")) {
      this.setState({selectedMenuKey: "/forms"});
    } else if (uri.includes("/articles")) {
      this.setState({selectedMenuKey: "/articles"});
    } else if (uri.includes("/hospitals")) {
      this.setState({selectedMenuKey: "/hospitals"});
    } else if (uri.includes("/doctors")) {
      this.setState({selectedMenuKey: "/doctors"});
    } else if (uri.includes("/patients")) {
      this.setState({selectedMenuKey: "/patients"});
    } else if (uri.includes("/caases")) {
      this.setState({selectedMenuKey: "/caases"});
    } else if (uri.includes("/consultations")) {
      this.setState({selectedMenuKey: "/consultations"});
    } else if (uri.includes("/public-videos")) {
      this.setState({selectedMenuKey: "/public-videos"});
    } else if (uri.includes("/videos")) {
      this.setState({selectedMenuKey: "/videos"});
    } else if (uri.includes("/chat")) {
      this.setState({selectedMenuKey: "/chat"});
    } else if (uri.includes("/sysinfo")) {
      this.setState({selectedMenuKey: "/sysinfo"});
    } else if (uri.includes("/swagger")) {
      this.setState({selectedMenuKey: "/swagger"});
    } else {
      this.setState({selectedMenuKey: "null"});
    }
  }

  onUpdateAccount(account) {
    this.setState({
      account: account,
    });
  }

  setLanguage(account) {
    // let language = account?.language;
    const language = localStorage.getItem("language");
    if (language !== "" && language !== i18next.language) {
      Setting.setLanguage(language);
    }
  }

  getAccount() {
    AccountBackend.getAccount()
      .then((res) => {
        this.initConfig();
        const account = res.data;
        if (account !== null) {
          this.setLanguage(account);
        }

        this.setState({
          account: account,
        });
      });
  }

  getForms() {
    FormBackend.getForms("admin")
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            forms: res.data,
          });

          this.updateMenuKeyForm(res.data);
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
        }
      });
  }

  signout() {
    AccountBackend.signout()
      .then((res) => {
        if (res.status === "ok") {
          this.setState({
            account: null,
          });

          Setting.showMessage("success", i18next.t("account:Successfully signed out, redirected to homepage"));
          Setting.goToLink("/");
          // this.props.history.push("/");
        } else {
          Setting.showMessage("error", `${i18next.t("account:Signout failed")}: ${res.msg}`);
        }
      });
  }

  handleRightDropdownClick(e) {
    if (e.key === "/account") {
      Setting.openLink(Setting.getMyProfileUrl(this.state.account));
    } else if (e.key === "/logout") {
      this.signout();
    }
  }

  isStoreSelectEnabled() {
    const uri = this.state.uri || window.location.pathname;

    if (uri.includes("/chat")) {
      return true;
    }
    const enabledStartsWith = ["/stores", "/providers", "/vectors", "/chats", "/messages", "/usages", "/files"];
    if (enabledStartsWith.some(prefix => uri.startsWith(prefix))) {
      return true;
    }

    if (uri === "/" || uri === "/home") {
      if (
        Setting.isAnonymousUser(this.state.account) ||
        Setting.isChatUser(this.state.account) ||
        Setting.isAdminUser(this.state.account) ||
        Setting.isChatAdminUser(this.state.account) ||
        Setting.getUrlParam("isRaw") !== null
      ) {
        return true;
      }
    }
    return false;
  }

  onClose = () => {
    this.setState({
      menuVisible: false,
    });
  };

  showMenu = () => {
    this.setState({
      menuVisible: true,
    });
  };

  setThemeAlgorithm() {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    const themeType = url.searchParams.get("theme");
    if (themeType === "dark" || themeType === "default") {
      localStorage.setItem("themeAlgorithm", JSON.stringify([themeType]));
    }
  }

  setLogoAndThemeAlgorithm = (nextThemeAlgorithm) => {
    this.setState({
      themeAlgorithm: nextThemeAlgorithm,
      logo: Setting.getLogo(nextThemeAlgorithm, this.state.store?.logoUrl),
    });
    localStorage.setItem("themeAlgorithm", JSON.stringify(nextThemeAlgorithm));
  };

  renderAvatar() {
    if (this.state.account.avatar === "") {
      return (
        <Avatar style={{backgroundColor: Setting.getAvatarColor(this.state.account.name), verticalAlign: "middle"}} size="large">
          {Setting.getShortName(this.state.account.name)}
        </Avatar>
      );
    } else {
      return (
        <Avatar src={this.state.account.avatar} style={{verticalAlign: "middle"}} size="large">
          {Setting.getShortName(this.state.account.name)}
        </Avatar>
      );
    }
  }

  renderRightDropdown() {
    if ((Setting.isAnonymousUser(this.state.account) && Conf.DisablePreviewMode) || Setting.getUrlParam("isRaw") !== null) {
      return (
        <div className="rightDropDown select-box">
          {
            this.renderAvatar()
          }
          &nbsp;
          &nbsp;
          {Setting.isMobile() ? null : Setting.getShortName(this.state.account.displayName)} &nbsp; <DownOutlined />
          &nbsp;
          &nbsp;
          &nbsp;
        </div>
      );
    }

    const items = [];
    if (!Setting.isAnonymousUser(this.state.account)) {
      items.push(Setting.getItem(<><SettingOutlined />&nbsp;&nbsp;{i18next.t("account:My Account")}</>,
        "/account"
      ));
      items.push(Setting.getItem(<><CommentOutlined />&nbsp;&nbsp;{i18next.t("general:Chats & Messages")}</>,
        "/chat"
      ));
      items.push(Setting.getItem(<><LogoutOutlined />&nbsp;&nbsp;{i18next.t("account:Sign Out")}</>,
        "/logout"
      ));
    } else {
      items.push(Setting.getItem(<><LoginOutlined />&nbsp;&nbsp;{i18next.t("account:Sign In")}</>,
        "/login"
      ));
    }
    const onClick = (e) => {
      if (e.key === "/account") {
        Setting.openLink(Setting.getMyProfileUrl(this.state.account));
      } else if (e.key === "/logout") {
        this.signout();
      } else if (e.key === "/chat") {
        this.props.history.push("/chat");
      } else if (e.key === "/login") {
        this.props.history.push(window.location.pathname);
        Setting.redirectToLogin();
      }
    };

    return (
      <Dropdown key="/rightDropDown" menu={{items, onClick}} >
        <div className="rightDropDown">
          {
            this.renderAvatar()
          }
          &nbsp;
          &nbsp;
          {Setting.isMobile() ? null : Setting.getShortName(this.state.account.displayName)} &nbsp; <DownOutlined />
          &nbsp;
          &nbsp;
          &nbsp;
        </div>
      </Dropdown>
    );
  }

  renderAccountMenu() {
    if (this.state.account === undefined) {
      return null;
    } else if (this.state.account === null) {
      return (
        <React.Fragment>
          <div key="/signup" style={{float: "right", marginRight: "20px"}}>
            <a href={Setting.getSignupUrl()}>
              {i18next.t("account:Sign Up")}
            </a>
          </div>
          <div key="/signin" style={{float: "right"}}>
            <a href={Setting.getSigninUrl()}>
              {i18next.t("account:Sign In")}
            </a>
          </div>
          <div className="select-box" style={{float: "right", margin: "0px", padding: "0px"}}>
            <ThemeSelect themeAlgorithm={this.state.themeAlgorithm} onChange={this.setLogoAndThemeAlgorithm} />
          </div>
          <div className="select-box" style={{float: "right", margin: "0px", padding: "0px"}}>
            <LanguageSelect />
          </div>
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          {this.renderRightDropdown()}
          <ThemeSelect className="select-box" themeAlgorithm={this.state.themeAlgorithm} onChange={this.setLogoAndThemeAlgorithm} />
          <LanguageSelect className="select-box" />
          {Setting.isLocalAdminUser(this.state.account) &&
                <StoreSelect
                  account={this.state.account}
                  className="store-select"
                  withAll={true}
                  style={{display: Setting.isMobile() ? "none" : "flex"}}
                  disabled={!this.isStoreSelectEnabled()}
                />
          }
          <div className="select-box" style={{float: "right", marginRight: "20px", padding: "0px"}}>
            <div dangerouslySetInnerHTML={{__html: Conf.NavbarHtml}} />
          </div>
        </React.Fragment>
      );
    }
  }

  navItemsIsAll() {
    const navItems = this.state.store?.navItems;
    return !navItems || navItems.includes("all");
  }

  filterMenuItems(menuItems, navItems) {
    if (!navItems || navItems.includes("all")) {
      return menuItems;
    }

    const filteredItems = menuItems.map(item => {
      if (!Array.isArray(item.children)) {
        return item;
      }

      const filteredChildren = item.children.filter(child => {
        return navItems.includes(child.key);
      });

      const newItem = {...item};
      newItem.children = filteredChildren;
      return newItem;
    });

    return filteredItems.filter(item => {
      return !Array.isArray(item.children) || item.children.length > 0;
    });
  }

  getMenuItems() {
    const res = [];

    res.push(Setting.getItem(<Link to="/">{i18next.t("general:Home")}</Link>, "/"));

    if (this.state.account === null || this.state.account === undefined) {
      return [];
    }

    const navItems = this.state.store?.navItems;

    if (this.state.account.type.startsWith("video-")) {
      res.push(Setting.getItem(<Link to="/videos">{i18next.t("general:Videos")}</Link>, "/videos"));
      // res.push(Setting.getItem(<Link to="/public-videos">{i18next.t("general:Public Videos")}</Link>, "/public-videos"));

      if (this.state.account.type === "video-admin-user") {
        res.push(Setting.getItem(
          <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.state.account).replace("/account", "/users")}>
            {i18next.t("general:Users")}
            {Setting.renderExternalLink()}
          </a>,
          "#"));
      }

      // if (window.location.pathname === "/") {
      //   Setting.goToLinkSoft(this, "/public-videos");
      // }
      return res;
    }

    if (!Setting.isAdminUser(this.state.account) && (Setting.isAnonymousUser(this.state.account) && !Conf.DisablePreviewMode)) { // show complete menu for anonymous user in preview mode even not login
      if (!Setting.isChatAdminUser(this.state.account)) {
        // res.push(Setting.getItem(<Link to="/usages">{i18next.t("general:Usages")}</Link>, "/usages"));
        return res;
      }
    }

    const domain = Setting.getSubdomain();
    // const domain = "med";

    if (Conf.ShortcutPageItems.length > 0 && domain === "data") {
      res.push(Setting.getItem(<Link to="/stores">{i18next.t("general:Stores")}</Link>, "/stores"));
      res.push(Setting.getItem(<Link to="/providers">{i18next.t("general:Providers")}</Link>, "/providers"));
      res.push(Setting.getItem(<Link to="/nodes">{i18next.t("general:Nodes")}</Link>, "/nodes"));
      res.push(Setting.getItem(<Link to="/sessions">{i18next.t("general:Sessions")}</Link>, "/sessions"));
      res.push(Setting.getItem(<Link to="/connections">{i18next.t("general:Connections")}</Link>, "/connections"));
      res.push(Setting.getItem(<Link to="/records">{i18next.t("general:Records")}</Link>, "/records"));
    } else if (Conf.ShortcutPageItems.length > 0 && domain === "ai") {
      res.push(Setting.getItem(<Link to="/chat">{i18next.t("general:Chat")}</Link>, "/chat"));
      res.push(Setting.getItem(<Link to="/stores">{i18next.t("general:Stores")}</Link>, "/stores"));
      res.push(Setting.getItem(<Link to="/providers">{i18next.t("general:Providers")}</Link>, "/providers"));
      res.push(Setting.getItem(<Link to="/vectors">{i18next.t("general:Vectors")}</Link>, "/vectors"));
      res.push(Setting.getItem(<Link to="/chats">{i18next.t("general:Chats")}</Link>, "/chats"));
      res.push(Setting.getItem(<Link to="/messages">{i18next.t("general:Messages")}</Link>, "/messages"));
      res.push(Setting.getItem(<Link to="/usages">{i18next.t("general:Usages")}</Link>, "/usages"));
      if (Setting.isAdminUser(this.state.account)) {
        res.push(Setting.getItem(<Link to="/activities">{i18next.t("general:Activities")}</Link>, "/activities"));
      }
      // res.push(Setting.getItem(<Link to="/tasks">{i18next.t("general:Tasks")}</Link>, "/tasks"));
      // res.push(Setting.getItem(<Link to="/articles">{i18next.t("general:Articles")}</Link>, "/articles"));
    } else if (Setting.isChatAdminUser(this.state.account)) {
      res.push(Setting.getItem(<Link to="/chat">{i18next.t("general:Chat")}</Link>, "/chat"));
      res.push(Setting.getItem(<Link to="/stores">{i18next.t("general:Stores")}</Link>, "/stores"));
      res.push(Setting.getItem(<Link to="/vectors">{i18next.t("general:Vectors")}</Link>, "/vectors"));
      res.push(Setting.getItem(<Link to="/chats">{i18next.t("general:Chats")}</Link>, "/chats"));
      res.push(Setting.getItem(<Link to="/messages">{i18next.t("general:Messages")}</Link>, "/messages"));
      res.push(Setting.getItem(<Link to="/usages">{i18next.t("general:Usages")}</Link>, "/usages"));
      if (Setting.isAdminUser(this.state.account)) {
        res.push(Setting.getItem(<Link to="/activities">{i18next.t("general:Activities")}</Link>, "/activities"));
      }

      if (window.location.pathname === "/") {
        Setting.goToLinkSoft(this, "/chat");
      }

      res.push(Setting.getItem(
        <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.state.account).replace("/account", "/users")}>
          {i18next.t("general:Users")}
          {Setting.renderExternalLink()}
        </a>,
        "#"));

      res.push(Setting.getItem(
        <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.state.account).replace("/account", "/resources")}>
          {i18next.t("general:Resources")}
          {Setting.renderExternalLink()}
        </a>,
        "##"));

      res.push(Setting.getItem(
        <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.state.account).replace("/account", "/permissions")}>
          {i18next.t("general:Permissions")}
          {Setting.renderExternalLink()}
        </a>,
        "###"));
    } else if (Setting.isTaskUser(this.state.account)) {
      res.push(Setting.getItem(<Link to="/tasks">{i18next.t("general:Tasks")}</Link>, "/tasks"));
      if (Setting.isAdminUser(this.state.account)) {
        res.push(Setting.getItem(<Link to="/scales">{i18next.t("general:Scales")}</Link>, "/scales"));
      }

      if (window.location.pathname === "/") {
        Setting.goToLinkSoft(this, "/tasks");
      }
    } else if (Conf.ShortcutPageItems.length > 0 && domain === "video") {
      if (Conf.EnableExtraPages) {
        res.push(Setting.getItem(<Link to="/videos">{i18next.t("general:Videos")}</Link>, "/videos"));
        // res.push(Setting.getItem(<Link to="/public-videos">{i18next.t("general:Public Videos")}</Link>, "/public-videos"));
        // res.push(Setting.getItem(<Link to="/tasks">{i18next.t("general:Tasks")}</Link>, "/tasks"));
        // res.push(Setting.getItem(<Link to="/articles">{i18next.t("general:Articles")}</Link>, "/articles"));
      }

      if (window.location.pathname === "/") {
        Setting.goToLinkSoft(this, "/videos");
      }
    } else if (!Setting.isAdminUser(this.state.account) && !Setting.isChatAdminUser(this.state.account)) {
      // Regular user: only show Chat
      res.push(Setting.getItem(<Link to="/chat">{i18next.t("general:Chat")}</Link>, "/chat"));

      if (window.location.pathname === "/") {
        Setting.goToLinkSoft(this, "/chat");
      }

      return res;
    } else {
      const textColor = this.state.themeAlgorithm.includes("dark") ? "white" : "black";
      const twoToneColor = this.state.themeData.colorPrimary;

      res.pop();

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/chat">{i18next.t("general:Home")}</Link>, "/home", <HomeTwoTone twoToneColor={twoToneColor} />, [
        Setting.getItem(<Link to="/chat">{i18next.t("general:Chat")}</Link>, "/chat"),
        Setting.getItem(<Link to="/usages">{i18next.t("general:Usages")}</Link>, "/usages"),
        Setting.getItem(<Link to="/activities">{i18next.t("general:Activities")}</Link>, "/activities"),
        Setting.getItem(<Link to="/desktop">{i18next.t("general:OS Desktop")}</Link>, "/desktop"),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/chats">{i18next.t("general:Chats & Messages")}</Link>, "/ai-chat", <BulbTwoTone twoToneColor={twoToneColor} />, [
        Setting.getItem(<Link to="/chats">{i18next.t("general:Chats")}</Link>, "/chats"),
        Setting.getItem(<Link to="/messages">{i18next.t("general:Messages")}</Link>, "/messages"),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/stores">{i18next.t("general:AI Setting")}</Link>, "/ai-setting", <AppstoreTwoTone twoToneColor={twoToneColor} />, [
        Setting.getItem(<Link to="/stores">{i18next.t("general:Stores")}</Link>, "/stores"),
        Setting.getItem(<Link to="/files">{i18next.t("general:Files")}</Link>, "/files"),
        Setting.getItem(<Link to="/providers">{i18next.t("general:Providers")}</Link>, "/providers"),
        Setting.getItem(<Link to="/vectors">{i18next.t("general:Vectors")}</Link>, "/vectors"),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/nodes">{i18next.t("general:Cloud Resources")}</Link>, "/cloud", <CloudTwoTone twoToneColor={twoToneColor} />, [
        Setting.getItem(<Link to="/templates">{i18next.t("general:Templates")}</Link>, "/templates"),
        Setting.getItem(<Link to="/application-store">{i18next.t("general:Application Store")}</Link>, "/application-store"),
        Setting.getItem(<Link to="/applications">{i18next.t("general:Applications")}</Link>, "/applications"),
        Setting.getItem(<Link to="/nodes">{i18next.t("general:Nodes")}</Link>, "/nodes"),
        Setting.getItem(<Link to="/machines">{i18next.t("general:Machines")}</Link>, "/machines"),
        Setting.getItem(<Link to="/assets">{i18next.t("general:Assets")}</Link>, "/assets"),
        Setting.getItem(<Link to="/images">{i18next.t("general:Images")}</Link>, "/images"),
        Setting.getItem(<Link to="/containers">{i18next.t("general:Containers")}</Link>, "/containers"),
        Setting.getItem(<Link to="/pods">{i18next.t("general:Pods")}</Link>, "/pods"),
        Setting.getItem(<Link to="/workbench" target="_blank">{i18next.t("general:Workbench")}</Link>, "workbench"),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/videos">{i18next.t("general:Multimedia")}</Link>, "/multimedia", <VideoCameraTwoTone twoToneColor={twoToneColor} />, [
        Setting.getItem(<Link to="/videos">{i18next.t("general:Videos")}</Link>, "/videos"),
        Setting.getItem(<Link to="/public-videos">{i18next.t("general:Public Videos")}</Link>, "/public-videos"),
        Setting.getItem(<Link to="/tasks">{i18next.t("general:Tasks")}</Link>, "/tasks"),
        Setting.getItem(<Link to="/scales">{i18next.t("general:Scales")}</Link>, "/scales"),
        Setting.getItem(<Link to="/forms">{i18next.t("general:Forms")}</Link>, "/forms"),
        Setting.getItem(<Link to="/workflows">{i18next.t("general:Workflows")}</Link>, "/workflows"),
        Setting.getItem(<Link to="/hospitals">{i18next.t("med:Hospitals")}</Link>, "/hospitals"),
        Setting.getItem(<Link to="/doctors">{i18next.t("med:Doctors")}</Link>, "/doctors"),
        Setting.getItem(<Link to="/patients">{i18next.t("med:Patients")}</Link>, "/patients"),
        Setting.getItem(<Link to="/caases">{i18next.t("med:Caases")}</Link>, "/caases"),
        Setting.getItem(<Link to="/consultations">{i18next.t("med:Consultations")}</Link>, "/consultations"),
        Setting.getItem(<Link to="/audit">{i18next.t("general:Audit")}</Link>, "/audit"),
        Setting.getItem(<Link to="/yolov8mi">{i18next.t("med:Medical Image Analysis")}</Link>, "/yolov8mi"),
        Setting.getItem(<Link to="/sr">{i18next.t("med:Super Resolution")}</Link>, "/sr"),
        Setting.getItem(<Link to="/articles">{i18next.t("general:Articles")}</Link>, "/articles"),
        Setting.getItem(<Link to="/graphs">{i18next.t("general:Graphs")}</Link>, "/graphs"),
        Setting.getItem(<Link to="/scans">{i18next.t("general:Scans")}</Link>, "/scans"),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/sessions">{i18next.t("general:Logging & Auditing")}</Link>, "/logs", <WalletTwoTone twoToneColor={twoToneColor} />, [
        Setting.getItem(<Link to="/sessions">{i18next.t("general:Sessions")}</Link>, "/sessions"),
        Setting.getItem(<Link to="/connections">{i18next.t("general:Connections")}</Link>, "/connections"),
        Setting.getItem(<Link to="/records">{i18next.t("general:Records")}</Link>, "/records"),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="#">{i18next.t("general:Identity & Access Management")}</Link>, "/identity", <LockTwoTone twoToneColor={twoToneColor} />, [
        Setting.getItem(
          <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.state.account).replace("/account", "/users")}>
            {i18next.t("general:Users")}
            {Setting.renderExternalLink()}
          </a>, "/users"),
        Setting.getItem(
          <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.state.account).replace("/account", "/resources")}>
            {i18next.t("general:Resources")}
            {Setting.renderExternalLink()}
          </a>, "/resources"),
        Setting.getItem(
          <a target="_blank" rel="noreferrer" href={Setting.getMyProfileUrl(this.state.account).replace("/account", "/permissions")}>
            {i18next.t("general:Permissions")}
            {Setting.renderExternalLink()}
          </a>, "/permissions"),
      ]));

      res.push(Setting.getItem(<Link style={{color: textColor}} to="/sysinfo">{i18next.t("general:Admin")}</Link>, "/admin", <SettingTwoTone twoToneColor={twoToneColor} />, [
        Setting.getItem(<Link to="/sysinfo">{i18next.t("general:System Info")}</Link>, "/sysinfo"),
        Setting.getItem(
          <a target="_blank" rel="noreferrer" href={Setting.isLocalhost() ? `${Setting.ServerUrl}/swagger/index.html` : "/swagger/index.html"}>
            {i18next.t("general:Swagger")}
            {Setting.renderExternalLink()}
          </a>, "/swagger"),
      ]));

      return this.filterMenuItems(res, navItems);
    }

    const sortedForms = this.state.forms.slice().sort((a, b) => {
      return a.position.localeCompare(b.position);
    });

    sortedForms.forEach(form => {
      const path = `/forms/${form.name}/data`;
      res.push(Setting.getItem(<Link to={path}>{form.displayName}</Link>, path));
    });

    return res;
  }

  renderHomeIfSignedIn(component) {
    if (this.state.account !== null && this.state.account !== undefined) {
      return <Redirect to="/" />;
    } else {
      return component;
    }
  }

  renderSigninIfNotSignedIn(component) {
    if (this.state.account === null) {
      const signinUrl = Setting.getSigninUrl();
      if (signinUrl && signinUrl !== "") {
        sessionStorage.setItem("from", window.location.pathname);
        window.location.replace(signinUrl);
      } else {
        return null;
      }
    } else if (this.state.account === undefined) {
      return null;
    } else {
      return component;
    }
  }

  renderRouter() {
    if (this.state.account?.type.startsWith("video-")) {
      if (window.location.pathname === "/") {
        return (
          <PublicVideoListPage account={this.state.account} />
        );
      }
    }

    return (
      <Switch>
        <Route exact path="/access/:owner/:name" render={(props) => this.renderSigninIfNotSignedIn(<AccessPage account={this.state.account} {...props} />)} />
        <Route exact path="/callback" component={AuthCallback} />
        <Route exact path="/signin" render={(props) => this.renderHomeIfSignedIn(<SigninPage {...props} />)} />
        <Route exact path="/" render={(props) => this.renderSigninIfNotSignedIn(<HomePage account={this.state.account} {...props} />)} />
        <Route exact path="/home" render={(props) => this.renderSigninIfNotSignedIn(<HomePage account={this.state.account} {...props} />)} />
        <Route exact path="/stores" render={(props) => this.renderSigninIfNotSignedIn(<StoreListPage account={this.state.account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName" render={(props) => this.renderSigninIfNotSignedIn(<StoreEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/view" render={(props) => this.renderSigninIfNotSignedIn(<FileTreePage account={this.state.account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/chats" render={(props) => this.renderSigninIfNotSignedIn(<ChatListPage account={this.state.account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/messages" render={(props) => this.renderSigninIfNotSignedIn(<MessageListPage account={this.state.account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/vectors" render={(props) => this.renderSigninIfNotSignedIn(<VectorListPage account={this.state.account} {...props} />)} />
        <Route exact path="/videos" render={(props) => this.renderSigninIfNotSignedIn(<VideoListPage account={this.state.account} {...props} />)} />
        <Route exact path="/videos/:owner/:videoName" render={(props) => this.renderSigninIfNotSignedIn(<VideoEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/public-videos" render={(props) => <PublicVideoListPage {...props} />} />
        <Route exact path="/public-videos/:owner/:videoName" render={(props) => <VideoPage account={this.state.account} {...props} />} />
        <Route exact path="/providers" render={(props) => this.renderSigninIfNotSignedIn(<ProviderListPage account={this.state.account} {...props} />)} />
        <Route exact path="/providers/:providerName" render={(props) => this.renderSigninIfNotSignedIn(<ProviderEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/files" render={(props) => this.renderSigninIfNotSignedIn(<FileListPage account={this.state.account} {...props} />)} />
        <Route exact path="/files/:fileName" render={(props) => this.renderSigninIfNotSignedIn(<FileViewPage account={this.state.account} {...props} />)} />
        <Route exact path="/vectors" render={(props) => this.renderSigninIfNotSignedIn(<VectorListPage account={this.state.account} {...props} />)} />
        <Route exact path="/vectors/:vectorName" render={(props) => this.renderSigninIfNotSignedIn(<VectorEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/chats" render={(props) => this.renderSigninIfNotSignedIn(<ChatListPage account={this.state.account} {...props} />)} />
        <Route exact path="/chats/:chatName" render={(props) => this.renderSigninIfNotSignedIn(<ChatEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/messages" render={(props) => this.renderSigninIfNotSignedIn(<MessageListPage account={this.state.account} {...props} />)} />
        <Route exact path="/messages/:messageName" render={(props) => this.renderSigninIfNotSignedIn(<MessageEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/usages" render={(props) => this.renderSigninIfNotSignedIn(<UsagePage account={this.state.account} themeAlgorithm={this.state.themeAlgorithm} {...props} />)} />
        <Route exact path="/activities" render={(props) => this.renderSigninIfNotSignedIn(<ActivityPage account={this.state.account} themeAlgorithm={this.state.themeAlgorithm} {...props} />)} />
        <Route exact path="/desktop" render={(props) => <OsDesktop account={this.state.account} {...props} />} />
        <Route exact path="/templates" render={(props) => this.renderSigninIfNotSignedIn(<TemplateListPage account={this.state.account} {...props} />)} />
        <Route exact path="/templates/:templateName" render={(props) => this.renderSigninIfNotSignedIn(<TemplateEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/applications" render={(props) => this.renderSigninIfNotSignedIn(<ApplicationListPage account={this.state.account} {...props} />)} />
        <Route exact path="/applications/:applicationName" render={(props) => this.renderSigninIfNotSignedIn(<ApplicationEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/applications/:applicationName/view" render={(props) => this.renderSigninIfNotSignedIn(<ApplicationDetailsPage account={this.state.account} {...props} />)} />
        <Route exact path="/application-store" render={(props) => this.renderSigninIfNotSignedIn(<ApplicationStorePage account={this.state.account} {...props} />)} />
        <Route exact path="/nodes" render={(props) => this.renderSigninIfNotSignedIn(<NodeListPage account={this.state.account} {...props} />)} />
        <Route exact path="/nodes/:nodeName" render={(props) => this.renderSigninIfNotSignedIn(<NodeEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/sessions" render={(props) => this.renderSigninIfNotSignedIn(<SessionListPage account={this.state.account} {...props} />)} />
        <Route exact path="/connections" render={(props) => this.renderSigninIfNotSignedIn(<ConnectionListPage account={this.state.account} {...props} />)} />
        <Route exact path="/records" render={(props) => this.renderSigninIfNotSignedIn(<RecordListPage account={this.state.account} {...props} />)} />
        <Route exact path="/records/:organizationName/:recordName" render={(props) => this.renderSigninIfNotSignedIn(<RecordEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/workbench" render={(props) => this.renderSigninIfNotSignedIn(<NodeWorkbench account={this.state.account} {...props} />)} />
        <Route exact path="/machines" render={(props) => this.renderSigninIfNotSignedIn(<MachineListPage account={this.state.account} {...props} />)} />
        <Route exact path="/machines/:organizationName/:machineName" render={(props) => this.renderSigninIfNotSignedIn(<MachineEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/assets" render={(props) => this.renderSigninIfNotSignedIn(<AssetListPage account={this.state.account} {...props} />)} />
        <Route exact path="/assets/:assetName" render={(props) => this.renderSigninIfNotSignedIn(<AssetEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/scans" render={(props) => this.renderSigninIfNotSignedIn(<ScanListPage account={this.state.account} {...props} />)} />
        <Route exact path="/scans/:scanName" render={(props) => this.renderSigninIfNotSignedIn(<ScanEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/images" render={(props) => this.renderSigninIfNotSignedIn(<ImageListPage account={this.state.account} {...props} />)} />
        <Route exact path="/images/:organizationName/:imageName" render={(props) => this.renderSigninIfNotSignedIn(<ImageEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/containers" render={(props) => this.renderSigninIfNotSignedIn(<ContainerListPage account={this.state.account} {...props} />)} />
        <Route exact path="/containers/:organizationName/:containerName" render={(props) => this.renderSigninIfNotSignedIn(<ContainerEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/pods" render={(props) => this.renderSigninIfNotSignedIn(<PodListPage account={this.state.account} {...props} />)} />
        <Route exact path="/pods/:organizationName/:podName" render={(props) => this.renderSigninIfNotSignedIn(<PodEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/workflows" render={(props) => this.renderSigninIfNotSignedIn(<WorkflowListPage account={this.state.account} {...props} />)} />
        <Route exact path="/workflows/:workflowName" render={(props) => this.renderSigninIfNotSignedIn(<WorkflowEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/audit" render={(props) => this.renderSigninIfNotSignedIn(<AuditPage account={this.state.account} {...props} />)} />
        <Route exact path="/yolov8mi" render={(props) => this.renderSigninIfNotSignedIn(<PythonYolov8miPage account={this.state.account} {...props} />)} />
        <Route exact path="/sr" render={(props) => this.renderSigninIfNotSignedIn(<PythonSrPage account={this.state.account} {...props} />)} />
        <Route exact path="/tasks" render={(props) => this.renderSigninIfNotSignedIn(<TaskListPage account={this.state.account} {...props} />)} />
        <Route exact path="/tasks/:owner/:taskName" render={(props) => this.renderSigninIfNotSignedIn(<TaskEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/scales" render={(props) => this.renderSigninIfNotSignedIn(<ScaleListPage account={this.state.account} {...props} />)} />
        <Route exact path="/scales/:owner/:scaleName" render={(props) => this.renderSigninIfNotSignedIn(<ScaleEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/forms" render={(props) => this.renderSigninIfNotSignedIn(<FormListPage account={this.state.account} {...props} />)} />
        <Route exact path="/forms/:formName" render={(props) => this.renderSigninIfNotSignedIn(<FormEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/forms/:formName/data" render={(props) => this.renderSigninIfNotSignedIn(<FormDataPage key={props.match.params.formName} account={this.state.account} {...props} />)} />
        <Route exact path="/articles" render={(props) => this.renderSigninIfNotSignedIn(<ArticleListPage account={this.state.account} {...props} />)} />
        <Route exact path="/articles/:articleName" render={(props) => this.renderSigninIfNotSignedIn(<ArticleEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/hospitals" render={(props) => this.renderSigninIfNotSignedIn(<HospitalListPage account={this.state.account} {...props} />)} />
        <Route exact path="/hospitals/:hospitalName" render={(props) => this.renderSigninIfNotSignedIn(<HospitalEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/doctors" render={(props) => this.renderSigninIfNotSignedIn(<DoctorListPage account={this.state.account} {...props} />)} />
        <Route exact path="/doctors/:doctorName" render={(props) => this.renderSigninIfNotSignedIn(<DoctorEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/patients" render={(props) => this.renderSigninIfNotSignedIn(<PatientListPage account={this.state.account} {...props} />)} />
        <Route exact path="/patients/:patientName" render={(props) => this.renderSigninIfNotSignedIn(<PatientEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/caases" render={(props) => this.renderSigninIfNotSignedIn(<CaaseListPage account={this.state.account} {...props} />)} />
        <Route exact path="/caases/:caaseName" render={(props) => this.renderSigninIfNotSignedIn(<CaaseEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/consultations" render={(props) => this.renderSigninIfNotSignedIn(<ConsultationListPage account={this.state.account} {...props} />)} />
        <Route exact path="/consultations/:consultationName" render={(props) => this.renderSigninIfNotSignedIn(<ConsultationEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/chat" render={(props) => this.renderSigninIfNotSignedIn(<ChatPage account={this.state.account} {...props} />)} />
        <Route exact path="/chat/:chatName" render={(props) => this.renderSigninIfNotSignedIn(<ChatPage account={this.state.account} {...props} />)} />
        <Route exact path="/stores/:owner/:storeName/chat" render={(props) => this.renderSigninIfNotSignedIn(<ChatPage account={this.state.account} {...props} />)} />
        <Route exact path="/:owner/:storeName/chat" render={(props) => this.renderSigninIfNotSignedIn(<ChatPage account={this.state.account} {...props} />)} />
        <Route exact path="/:owner/:storeName/chat/:chatName" render={(props) => this.renderSigninIfNotSignedIn(<ChatPage account={this.state.account} {...props} />)} />
        <Route exact path="/graphs" render={(props) => this.renderSigninIfNotSignedIn(<GraphListPage account={this.state.account} {...props} />)} />
        <Route exact path="/graphs/:graphName" render={(props) => this.renderSigninIfNotSignedIn(<GraphEditPage account={this.state.account} {...props} />)} />
        <Route exact path="/workbench" render={(props) => this.renderSigninIfNotSignedIn(<NodeWorkbench account={this.state.account} {...props} />)} />
        <Route exact path="/sysinfo" render={(props) => this.renderSigninIfNotSignedIn(<SystemInfo account={this.state.account} {...props} />)} />
        <Route path="" render={() => <Result status="404" title="404 NOT FOUND" subTitle={i18next.t("general:Sorry, the page you visited does not exist.")} extra={<a href="/"><Button type="primary">{i18next.t("general:Back Home")}</Button></a>} />} />
      </Switch>
    );
  }

  isWithoutCard() {
    return Setting.isMobile() || this.isHiddenHeaderAndFooter() || window.location.pathname === "/chat" || window.location.pathname.startsWith("/chat/") || window.location.pathname === "/";
  }

  isHiddenHeaderAndFooter(uri) {
    if (uri === undefined) {
      uri = this.state.uri;
    }
    const hiddenPaths = ["/workbench", "/access"];
    for (const path of hiddenPaths) {
      if (uri.startsWith(path)) {
        return true;
      }
    }
  }

  renderContent() {
    if (Setting.getUrlParam("isRaw") !== null) {
      return (
        <HomePage account={this.state.account} />
      );
    } else if (Setting.getSubdomain() === "portal") {
      return (
        <ShortcutsPage account={this.state.account} />
      );
    }

    return (
      <Layout id="parent-area">
        {this.renderHeader()}
        <Content style={{display: "flex", flexDirection: "column"}}>
          {this.isWithoutCard() ?
            this.renderRouter() :
            <Card className="content-warp-card">
              {this.renderRouter()}
            </Card>
          }
        </Content>
        {this.renderFooter()}
      </Layout>
    );
  }

  renderHeader() {
    if (this.isHiddenHeaderAndFooter()) {
      return null;
    }

    const showMenu = () => {
      this.setState({
        menuVisible: true,
      });
    };

    const onClick = ({key}) => {
      if (Setting.isMobile()) {
        this.setState({
          menuVisible: false,
        });
      }

      this.setState({
        uri: location.pathname,
        selectedMenuKey: key,
      });
    };

    return (
      <Header style={{padding: "0", marginBottom: "3px", backgroundColor: this.state.themeAlgorithm.includes("dark") ? "black" : "white", display: "flex", justifyContent: "space-between"}}>
        <div style={{display: "flex", alignItems: "center", flex: 1, overflow: "hidden"}}>
          {Setting.isMobile() ? null : (
            <Link to={"/"}>
              <img className="logo" src={this.state.logo || Setting.getLogo(this.state.themeAlgorithm, this.state.store?.logoUrl)} alt="logo" />
            </Link>
          )}
          {Setting.isMobile() ? (
            <React.Fragment>
              <Drawer title={i18next.t("general:Close")} placement="left" open={this.state.menuVisible} onClose={this.onClose}>
                <Menu
                  items={this.getMenuItems()}
                  mode={"inline"}
                  selectedKeys={[this.state.selectedMenuKey]}
                  style={{lineHeight: "64px"}}
                  onClick={onClick}
                >
                </Menu>
              </Drawer>
              <Button icon={<BarsOutlined />} onClick={showMenu} type="text">
                {i18next.t("general:Menu")}
              </Button>
            </React.Fragment>
          ) : (
            <div style={{display: "flex", marginLeft: "10px", flex: 1, minWidth: 0, overflow: "auto", paddingRight: "20px"}}>
              <Menu style={{minWidth: 0, width: "100%"}} onClick={onClick} items={this.getMenuItems()} mode={"horizontal"} selectedKeys={[this.state.selectedMenuKey]} />
            </div>
          )}
        </div>
        <div style={{flexShrink: 0}}>
          {this.renderAccountMenu()}
        </div>
      </Header>
    );
  }

  renderFooter() {
    if (this.isHiddenHeaderAndFooter()) {
      return null;
    }
    // How to keep your footer where it belongs ?
    // https://www.freecodecamp.org/news/how-to-keep-your-footer-where-it-belongs-59c6aa05c59c

    return (
      <React.Fragment>
        <Footer id="footer" style={
          {
            textAlign: "center",
            height: "67px",
          }
        }>
          <div dangerouslySetInnerHTML={{__html: Setting.getFooterHtml(this.state.themeAlgorithm, this.state.store?.footerHtml)}} />
        </Footer>
      </React.Fragment>
    );
  }

  renderPage() {
    return (
      <React.Fragment>
        {/* { */}
        {/*   this.renderBanner() */}
        {/* } */}
        <FloatButton.BackTop />
        <CustomGithubCorner />
        {
          this.renderContent()
        }
      </React.Fragment>
    );
  }

  getAntdLocale() {
    return {
      Table: {
        filterConfirm: i18next.t("general:OK"),
        filterReset: i18next.t("general:Reset"),
        filterEmptyText: i18next.t("general:No data"),
        filterSearchPlaceholder: i18next.t("general:Search"),
        emptyText: i18next.t("general:No data"),
        selectAll: i18next.t("general:Select all"),
        selectInvert: i18next.t("general:Invert selection"),
        selectionAll: i18next.t("general:Select all data"),
        sortTitle: i18next.t("general:Sort"),
        expand: i18next.t("general:Expand row"),
        collapse: i18next.t("general:Collapse row"),
        triggerDesc: i18next.t("general:Click to sort descending"),
        triggerAsc: i18next.t("general:Click to sort ascending"),
        cancelSort: i18next.t("general:Click to cancel sorting"),
      },
    };
  }

  render() {
    return (
      <React.Fragment>
        <Helmet>
          <title>{Setting.getHtmlTitle(this.state.store?.htmlTitle)}</title>
          <link rel="icon" href={Setting.getFaviconUrl(this.state.themeAlgorithm, this.state.store?.faviconUrl)} />
        </Helmet>
        <ConfigProvider
          locale={this.getAntdLocale()}
          theme={{
            token: {
              ...shadcnThemeToken,
              colorPrimary: this.state.themeData.colorPrimary,
              colorInfo: this.state.themeData.colorPrimary,
              borderRadius: this.state.themeData.borderRadius,
            },
            algorithm: Setting.getAlgorithm(this.state.themeAlgorithm),
            components: shadcnThemeComponents,
          }}>
          <StyleProvider hashPriority="high" transformers={[legacyLogicalPropertiesTransformer]}>
            {
              this.renderPage()
            }
          </StyleProvider>
        </ConfigProvider>
      </React.Fragment>
    );
  }
}

export default withRouter(withTranslation()(App));
