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

import React, {useState} from "react";
import {Col, Image, Row, Space, Upload} from "antd";
import {Button} from "./components/ui/button";
import {Input} from "./components/ui/input";
import * as Setting from "./Setting";
import i18next from "i18next";
import * as ResourceBackend from "./backend/ResourceBackend";

const StoreAvatarUploader = (props) => {
  const {store, onUpdate, onUploadComplete, imageUrl, disableUpload} = props;
  const [loading, setLoading] = useState(false);
  if (!store) {
    return null;
  }
  const currentImageUrl = imageUrl || store.avatar;

  const handleUpload = ({file}) => {
    setLoading(true);
    ResourceBackend.uploadResource(store.owner, "avatar", "store", store.name, file)
      .then((res) => {
        if (res.status === "ok") {
          const newAvatarUrl = res.data;
          if (typeof newAvatarUrl !== "string" || newAvatarUrl === "") {
            Setting.showMessage("error", i18next.t("general:Failed to get"));
            return;
          }
          const finalUrl = `${newAvatarUrl}?t=${Date.now()}`;
          onUpdate(finalUrl);
          if (onUploadComplete) {
            onUploadComplete(finalUrl);
          }
          Setting.showMessage("success", i18next.t("general:Successfully added"));
        } else {
          Setting.showMessage("error", `${i18next.t("general:Failed to add")}: ${res.msg}`);
        }
      })
      .catch(err => {
        Setting.showMessage("error", `${i18next.t("general:Failed to get")}: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div>
      <Row>
        <Col span={24}>
          <Input
            value={currentImageUrl || ""}
            placeholder={disableUpload ? i18next.t("general:Icon URL (optional)") : undefined}
            onChange={e => onUpdate(e.target.value)}
          />
        </Col>
      </Row>

      <Row style={{marginTop: "10px"}}>
        <Col span={24}>
          <Space direction="vertical" align="center">
            {
              currentImageUrl && (
                <Image src={currentImageUrl} alt="avatar" width={150} height={150} style={{objectFit: "cover"}}
                  preview={{
                    mask: i18next.t("general:Preview"),
                  }}
                />
              )
            }

            {disableUpload ? null : (
              <Upload name="file" accept="image/*" showUploadList={false} customRequest={handleUpload}>
                <Button variant="default" size="sm" disabled={loading}>
                  {loading ? i18next.t("general:Loading") : i18next.t("general:Upload")}
                </Button>
              </Upload>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default StoreAvatarUploader;
