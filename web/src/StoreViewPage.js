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
import {Spin} from "antd";
import * as StoreBackend from "./backend/StoreBackend";
import * as Setting from "./Setting";
import i18next from "i18next";
import {getChatUrl} from "./StoreHubDrawer";
import StoreHubAgentDetail from "./StoreHubAgentDetail";

class StoreViewPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      owner: props.match.params.owner,
      storeName: props.match.params.storeName,
      store: null,
      loading: true,
      forking: false,
      activeTab: "overview",
    };
  }

  componentDidMount() {
    this.getStore();
  }

  // Page-view logging runs entirely on the backend (see routers/TrackStoreVisit).
  // getStore only fetches; the AfterExec filter records the visit if the response
  // was ok — no separate frontend call, no forgeable endpoint.
  getStore(owner = this.state.owner, storeName = this.state.storeName) {
    StoreBackend.getStore(owner, storeName)
      .then((res) => {
        if (res.status === "ok") {
          const store = res.data;
          if (store && typeof res.data2 === "string" && res.data2 !== "") {
            store.error = res.data2;
          }
          this.setState({store, loading: false});
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          this.setState({loading: false});
        }
      });
  }

  handleStartChat() {
    const {store} = this.state;
    if (!store) {return;}
    if (store.endpoint) {
      window.open(getChatUrl(store), "_blank", "noopener,noreferrer");
    } else {
      this.props.history.push(`/stores/${store.owner}/${store.name}/chat`);
    }
  }

  handlePlaceholder(action) {
    const messages = {
      star: i18next.t("store:Star is coming soon"),
      watch: i18next.t("store:Watch is coming soon"),
    };
    Setting.showMessage("info", messages[action]);
  }

  handleFork() {
    const {store, forking} = this.state;
    if (!store || forking) {return;}

    this.setState({forking: true});
    StoreBackend.forkStore(store.owner, store.name)
      .then((res) => {
        if (res.status === "ok") {
          const forkedStore = res.data;
          Setting.showMessage("success", i18next.t("store:Forked successfully"));
          this.props.history.push(`/agents/${forkedStore.owner}/${forkedStore.name}`);
          this.setState({
            owner: forkedStore.owner,
            storeName: forkedStore.name,
            store: null,
            loading: true,
          }, () => this.getStore(forkedStore.owner, forkedStore.name));
        } else {
          Setting.showMessage("error", `${i18next.t("store:Fork failed")}: ${res.msg}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `${i18next.t("store:Fork failed")}: ${error}`);
      })
      .finally(() => this.setState({forking: false}));
  }

  canManageStore(store) {
    const {account} = this.props;
    if (!account || !store) {
      return false;
    }
    return account.name === store.owner || Setting.isAdminUser(account);
  }

  handleTabChange(key) {
    if (key === "settings") {
      const {store} = this.state;
      this.props.history.push(`/stores/${store.owner}/${store.name}`);
      return;
    }
    this.setState({activeTab: key});
  }

  render() {
    const {store, loading, forking, activeTab} = this.state;

    if (loading) {
      return (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 120px)"}}>
          <Spin size="large" tip={i18next.t("general:Loading...")} />
        </div>
      );
    }

    if (!store) {
      return null;
    }

    const canManage = this.canManageStore(store);
    return (
      <StoreHubAgentDetail
        account={this.props.account}
        store={store}
        activeTab={activeTab}
        canManage={canManage}
        onTabChange={(key) => this.handleTabChange(key)}
        onStartChat={() => this.handleStartChat()}
        onFork={() => this.handleFork()}
        forking={forking}
        onPlaceholder={(action) => this.handlePlaceholder(action)}
        onStoreUpdate={(updatedStore) => {
          this.setState({store: updatedStore});
          Setting.submitStoreEdit(updatedStore);
        }}
        onRefresh={() => this.getStore()}
        onOpenAnalysis={() => this.props.history.push(`/analysis/${store.owner}/${store.name}`)}
      />
    );
  }
}

export default StoreViewPage;
