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

import React from "react";
import {Redirect} from "react-router-dom";
import * as StoreBackend from "./backend/StoreBackend";
import * as Setting from "./Setting";
import ChatPage from "./ChatPage";
import i18next from "i18next";

class HomePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
      store: null,
      storeFetched: false,
    };
  }

  UNSAFE_componentWillMount() {
    this.getStore();
  }

  getStore() {
    StoreBackend.getStore("admin", "_default_store_")
      .then((res) => {
        if (res.status === "ok") {
          if (res.data && typeof res.data2 === "string" && res.data2 !== "") {
            res.data.error = res.data2;
          }

          this.setState({
            store: res.data,
            storeFetched: true,
          });
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${res.msg}`);
          this.setState({storeFetched: true});
        }
      }).catch(() => {
        this.setState({storeFetched: true});
      });
  }

  render() {
    if (Setting.isAnonymousUser(this.props.account) || Setting.isChatUser(this.props.account) || Setting.getUrlParam("isRaw") !== null) {
      if (!this.props.account) {
        return null;
      }

      return (
        <ChatPage account={this.props.account} />
      );
    }

    if (this.props.account?.tag === "Video") {
      return <Redirect to="/videos" />;
    } else {
      if (!this.state.storeFetched) {
        return null;
      } else {
        return <ChatPage account={this.props.account} />;
      }
    }
  }
}

export default HomePage;
