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
import {Avatar, Button, Popover, Typography} from "antd";
import {ExportOutlined} from "@ant-design/icons";
import i18next from "i18next";
import * as UserBackend from "../backend/UserBackend";
import * as Setting from "../Setting";

const {Text} = Typography;

// UserLabel renders a user's real Casdoor display name + avatar with a GitHub-style
// hover card. Hovering pops a small profile card; clicking the name/avatar (or the
// "View profile" button in the card) opens that user's Casdoor profile page.
//
// It only needs a username; the display name + avatar are resolved lazily via a
// shared, memoized backend lookup, so the same component drops into any page
// (insights, comments, authors, ...) that has a bare username on hand.
class UserLabel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      displayName: props.displayName || "",
      avatar: props.avatar || "",
    };
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    // Resolve only what the caller did not already supply.
    if (this.props.user && (!this.props.displayName || this.props.avatar === undefined)) {
      UserBackend.getUserInfo(this.props.user).then((info) => {
        if (this._isMounted && info) {
          this.setState((prev) => ({
            displayName: prev.displayName || info.displayName || "",
            avatar: prev.avatar || info.avatar || "",
          }));
        }
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  getDisplayName() {
    return this.state.displayName || Setting.getShortName(this.props.user || "");
  }

  getProfileUrl() {
    const {user, account} = this.props;
    if (!user || !account || Setting.isBasicLoginMode(account)) {
      return null;
    }
    try {
      const url = Setting.getUserProfileUrl(user, account);
      return url && url !== "#" ? url : null;
    } catch (e) {
      return null;
    }
  }

  openProfile = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const url = this.getProfileUrl();
    if (url) {
      Setting.openLink(url);
    }
  };

  renderAvatar(size) {
    const {user} = this.props;
    const {avatar} = this.state;
    const name = this.getDisplayName();
    const initial = (name || user || "?").charAt(0).toUpperCase();
    if (avatar) {
      return <Avatar size={size} src={avatar} style={{flexShrink: 0}}>{initial}</Avatar>;
    }
    return (
      <Avatar size={size} style={{backgroundColor: Setting.getAvatarColor(user || name), flexShrink: 0}}>
        {initial}
      </Avatar>
    );
  }

  renderCard() {
    const {user} = this.props;
    const name = this.getDisplayName();
    const profileUrl = this.getProfileUrl();
    return (
      <div style={{width: 240}}>
        <div style={{display: "flex", alignItems: "center", gap: 12, marginBottom: profileUrl ? 12 : 0}}>
          {this.renderAvatar(48)}
          <div style={{minWidth: 0, flex: 1}}>
            <div style={{fontSize: 15, fontWeight: 600, lineHeight: 1.3, wordBreak: "break-word"}}>{name}</div>
            <Text type="secondary" style={{fontSize: 13}} ellipsis={{tooltip: user}}>@{user}</Text>
          </div>
        </div>
        {profileUrl && (
          <Button block size="small" icon={<ExportOutlined />} onClick={this.openProfile}>
            {i18next.t("general:View profile")}
          </Button>
        )}
      </div>
    );
  }

  render() {
    const {user, size = "small", showAvatar = true, showName = true, avatarOnly = false, strong = false, nameStyle = {}, children} = this.props;
    if (!user) {
      return children || null;
    }

    const name = this.getDisplayName();
    const profileUrl = this.getProfileUrl();
    const clickable = !!profileUrl;
    const withAvatar = avatarOnly || showAvatar;
    const withName = !avatarOnly && showName;

    // When children are provided (e.g. a pre-rendered chat avatar), use them as
    // the trigger and only layer on the hover card + profile link, leaving the
    // caller's own rendering untouched.
    const trigger = (
      <span
        onClick={clickable ? this.openProfile : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: !children && withAvatar && withName ? 8 : 0,
          minWidth: 0,
          maxWidth: "100%",
          cursor: clickable ? "pointer" : "default",
          verticalAlign: "middle",
        }}
      >
        {children ? children : (
          <>
            {withAvatar && this.renderAvatar(size)}
            {withName && (
              <Text
                strong={strong}
                ellipsis={{tooltip: name}}
                style={{minWidth: 0, ...nameStyle}}
              >
                {name}
              </Text>
            )}
          </>
        )}
      </span>
    );

    return (
      <Popover
        content={this.renderCard()}
        trigger="hover"
        placement="topLeft"
        mouseEnterDelay={0.3}
      >
        {trigger}
      </Popover>
    );
  }
}

export default UserLabel;
