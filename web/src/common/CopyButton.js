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
import {Button, Tooltip} from "antd";
import {CopyOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import i18next from "i18next";
import * as Setting from "../Setting";

function CopyButton({value, disabled = false}) {
  const isDisabled = disabled || !value || value === "***";

  return (
    <Tooltip title={i18next.t("general:Copy")}>
      <Button
        disabled={isDisabled}
        icon={<CopyOutlined />}
        onClick={() => {
          copy(value);
          Setting.showMessage("success", i18next.t("general:Successfully copied"));
        }}
      />
    </Tooltip>
  );
}

export default CopyButton;
