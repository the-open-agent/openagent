// Copyright 2025 The OpenAgent Authors. All Rights Reserved.
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
import {MoonOutlined, SunOutlined} from "@ant-design/icons";

class ThemeSelect extends React.Component {
  handleToggle = () => {
    const isDark = this.props.themeAlgorithm.includes("dark");
    this.props.onChange(isDark ? ["default"] : ["dark"]);
  };

  render() {
    const isDark = this.props.themeAlgorithm.includes("dark");
    const icon = isDark
      ? <SunOutlined style={{fontSize: "24px"}} />
      : <MoonOutlined style={{fontSize: "24px"}} />;

    return (
      <div className="select-box" onClick={this.handleToggle} style={{cursor: "pointer"}}>
        {icon}
      </div>
    );
  }
}

export default ThemeSelect;
