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
import {Col} from "antd";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "../components/ui/card";
import * as Setting from "../Setting";
import {withRouter} from "react-router-dom";
import i18next from "i18next";

class SingleCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  wrappedAsSilentSigninLink(link) {
    return link;
    // if (link.startsWith("http")) {
    //   link += link.includes("?") ? "&silentSignin=1" : "?silentSignin=1";
    // }
    // return link;
  }

  renderCardMobile(logo, link, title, desc, time, isSingle) {
    const gridStyle = {
      width: "100vw",
      textAlign: "center",
      cursor: "pointer",
    };
    const silentSigninLink = this.wrappedAsSilentSigninLink(link);

    return (
      <div style={gridStyle} onClick={() => Setting.goToLinkSoft(this, silentSigninLink)}>
        <Card hoverable>
          <img src={logo} alt="logo" width={"100%"} style={{marginBottom: "20px"}} />
          <CardHeader style={{justifyContent: "center"}}>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{desc}</CardDescription>
          </CardHeader>
          <CardContent>
            {i18next.t("message:Comment")}
            <br />
            {time}
          </CardContent>
        </Card>
      </div>
    );
  }

  renderCard(logo, link, title, desc, time, isSingle) {
    const silentSigninLink = this.wrappedAsSilentSigninLink(link);

    return (
      <Col style={{paddingLeft: "20px", paddingRight: "20px", paddingBottom: "20px", marginTop: "50px", marginBottom: "20px"}} span={6}>
        <Card
          hoverable
          onClick={() => Setting.goToLinkSoft(this, silentSigninLink)}
          style={isSingle ? {width: "320px", height: "100%"} : {width: "100%", height: "100%"}}
        >
          <img alt="logo" src={logo} style={{width: "100%", height: "200px", objectFit: "scale-down"}} />
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{desc}</CardDescription>
          </CardHeader>
          <CardContent>
            {i18next.t("message:Comment")}
            <br />
            {time}
          </CardContent>
        </Card>
      </Col>
    );
  }

  render() {
    if (Setting.isMobile()) {
      return this.renderCardMobile(this.props.logo, this.props.link, this.props.title, this.props.desc, this.props.time, this.props.isSingle);
    } else {
      return this.renderCard(this.props.logo, this.props.link, this.props.title, this.props.desc, this.props.time, this.props.isSingle);
    }
  }
}

export default withRouter(SingleCard);
