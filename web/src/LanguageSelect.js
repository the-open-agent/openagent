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
import {Dropdown} from "antd";
import {GlobalOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import * as Conf from "./Conf";

function flagIcon(country, alt) {
  return (
    <img className="language-icon" width={24} alt={alt} src={`${Conf.StaticBaseUrl}/flag-icons/${country}.svg`} />
  );
}

class LanguageSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      languages: props.languages ?? Setting.Countries.map(item => item.key),
    };

    Setting.Countries.forEach((country) => {
      new Image().src = `${Conf.StaticBaseUrl}/flag-icons/${country.country}.svg`;
    });
  }

  items = Setting.Countries.map((country) => Setting.getItem(country.label, country.key, flagIcon(country.country, country.alt)));

  getOrganizationLanguages(languages) {
    const select = [];
    for (const language of languages) {
      this.items.map((item, index) => item.key === language ? select.push(item) : null);
    }
    return select;
  }

  render() {
    const languageItems = this.getOrganizationLanguages(this.state.languages);
    const onClick = (e) => {
      Setting.setLanguage(e.key);
    };

    return (
      <Dropdown menu={{items: languageItems, onClick}} >
        <div className="select-box" style={{display: languageItems.length === 0 ? "none" : null, ...this.props.style}} >
          <GlobalOutlined style={{fontSize: "24px"}} />
        </div>
      </Dropdown>
    );
  }
}

export default LanguageSelect;
