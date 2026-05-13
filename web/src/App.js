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
import {withRouter} from "react-router-dom";
import {StyleProvider, legacyLogicalPropertiesTransformer} from "@ant-design/cssinjs";
import {ConfigProvider, FloatButton, Layout} from "antd";
import {AiDots} from "./common/Loading";
import "./App.less";
import {Helmet} from "react-helmet";
import * as Setting from "./Setting";
import * as AccountBackend from "./backend/AccountBackend";
import * as Conf from "./Conf";
import {getShadcnThemeComponents, getShadcnThemeToken} from "./shadcnTheme";
import HomePage from "./HomePage";
import * as FormBackend from "./backend/FormBackend";
import * as SiteBackend from "./backend/SiteBackend";
import * as FetchFilter from "./backend/FetchFilter";
import {withTranslation} from "react-i18next";
import i18next from "i18next";
import ManagementPage from "./ManagementPage";
import {TooltipProvider} from "./components/ui/tooltip";

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
    document.documentElement.setAttribute("data-theme", storageThemeAlgorithm.includes("dark") ? "dark" : "light");
    this.state = {
      classes: props,
      selectedMenuKey: 0,
      account: undefined,
      uri: null,
      themeAlgorithm: storageThemeAlgorithm,
      themeData: Conf.ThemeDefault,
      forms: [],
      site: undefined,
    };
    this.initConfig();
  }

  initConfig() {
    Setting.initServerUrl();
    Setting.initWebConfig();
    FetchFilter.initDemoMode();
    Setting.initCasdoorSdk(Conf.AuthConfig);
  }

  UNSAFE_componentWillMount() {
    this.updateMenuKey();
    this.getAccount();
    this.setTheme();
    this.getForms();
  }

  setTheme() {
    SiteBackend.getBuiltInSite().then((res) => {
      if (res.status !== "ok") {
        return;
      }
      const site = res.data;
      if (!site) {
        return;
      }
      Setting.setThemeColor(site.themeColor);
      this.setState({site});
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
    this.setState({uri: uri});

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
    this.setState({uri: uri});
    if (uri === "/" || uri === "/home") {
      this.setState({selectedMenuKey: "/chat"});
    } else if (uri.includes("/server-store")) {
      this.setState({selectedMenuKey: "/servers"});
    } else if (uri.includes("/stores")) {
      this.setState({selectedMenuKey: "/stores"});
    } else if (uri.includes("/skills")) {
      this.setState({selectedMenuKey: "/skills"});
    } else if (uri.includes("/pipes")) {
      this.setState({selectedMenuKey: "/pipes"});
    } else if (uri.includes("/providers")) {
      this.setState({selectedMenuKey: "/providers"});
    } else if (uri.includes("/vectors")) {
      this.setState({selectedMenuKey: "/vectors"});
    } else if (uri.includes("/chats")) {
      this.setState({selectedMenuKey: "/chats"});
    } else if (uri.includes("/messages")) {
      this.setState({selectedMenuKey: "/messages"});
    } else if (uri.includes("/usages")) {
      this.setState({selectedMenuKey: "/usages"});
    } else if (uri.includes("/sites")) {
      this.setState({selectedMenuKey: "/sites"});
    } else if (uri.includes("/visitors")) {
      this.setState({selectedMenuKey: "/visitors"});
    } else if (uri.includes("/sessions")) {
      this.setState({selectedMenuKey: "/sessions"});
    } else if (uri.includes("/records")) {
      this.setState({selectedMenuKey: "/records"});
    } else if (uri.includes("/tasks")) {
      this.setState({selectedMenuKey: "/tasks"});
    } else if (uri.includes("/scales")) {
      this.setState({selectedMenuKey: "/scales"});
    } else if (uri.includes("/forms")) {
      this.setState({selectedMenuKey: "/forms"});
    } else if (uri.includes("/resources")) {
      this.setState({selectedMenuKey: "/resources"});
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
    this.setState({account: account});
  }

  setLanguage(account) {
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
          this.setState({account: account});
          return;
        }

        this.setState({account: null});
      });
  }

  getForms() {
    FormBackend.getForms("admin")
      .then((res) => {
        if (res.status === "ok") {
          this.setState({forms: res.data});
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
          this.setState({account: null});
          Setting.showMessage("success", i18next.t("account:Successfully signed out, redirected to homepage"));
          Setting.goToLink(Setting.isCasdoorAvailable() ? "/" : "/signin");
        } else {
          Setting.showMessage("error", `${i18next.t("account:Signout failed")}: ${res.msg}`);
        }
      });
  }

  setThemeAlgorithm() {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    const themeType = url.searchParams.get("theme");
    if (themeType === "dark" || themeType === "default") {
      localStorage.setItem("themeAlgorithm", JSON.stringify([themeType]));
    }
  }

  onUpdateSite = () => {
    this.setTheme();
  };

  setLogoAndThemeAlgorithm = (nextThemeAlgorithm) => {
    this.setState({
      themeAlgorithm: nextThemeAlgorithm,
      logo: Setting.getLogo(nextThemeAlgorithm, this.state.site?.logoUrl),
    });
    localStorage.setItem("themeAlgorithm", JSON.stringify(nextThemeAlgorithm));
    document.documentElement.setAttribute("data-theme", nextThemeAlgorithm.includes("dark") ? "dark" : "light");
  };

  renderContent() {
    if (Setting.getUrlParam("isRaw") !== null) {
      return (
        <HomePage account={this.state.account} />
      );
    }

    return (
      <Layout id="parent-area">
        <ManagementPage
          account={this.state.account}
          site={this.state.site}
          forms={this.state.forms}
          themeAlgorithm={this.state.themeAlgorithm}
          logo={this.state.logo}
          uri={this.state.uri}
          selectedMenuKey={this.state.selectedMenuKey}
          onUpdateSite={this.onUpdateSite}
          setLogoAndThemeAlgorithm={this.setLogoAndThemeAlgorithm}
          signout={this.signout.bind(this)}
          onMenuClick={({key}) => {
            this.setState({
              // eslint-disable-next-line no-restricted-globals
              uri: location.pathname,
              selectedMenuKey: key,
            });
          }}
          history={this.props.history}
        />
      </Layout>
    );
  }

  renderPage() {
    return (
      <TooltipProvider delayDuration={300}>
        <FloatButton.BackTop />
        {this.renderContent()}
      </TooltipProvider>
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
          <title>{Setting.getHtmlTitle(this.state.site?.htmlTitle)}</title>
          <link rel="icon" href={Setting.getFaviconUrl(this.state.themeAlgorithm, this.state.site?.faviconUrl)} />
        </Helmet>
        <ConfigProvider
          locale={this.getAntdLocale()}
          spin={{indicator: <AiDots />}}
          theme={{
            token: {
              ...getShadcnThemeToken(this.state.themeAlgorithm.includes("dark")),
              colorPrimary: this.state.themeData.colorPrimary,
              colorInfo: this.state.themeData.colorPrimary,
            },
            components: getShadcnThemeComponents(this.state.themeAlgorithm.includes("dark")),
            algorithm: Setting.getAlgorithm(this.state.themeAlgorithm),
          }}>
          <StyleProvider hashPriority="high" transformers={[legacyLogicalPropertiesTransformer]}>
            {this.renderPage()}
          </StyleProvider>
        </ConfigProvider>
      </React.Fragment>
    );
  }
}

export default withRouter(withTranslation()(App));
