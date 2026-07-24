// Copyright 2024 The OpenAgent Authors.. All Rights Reserved.
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

package routers

import (
	"github.com/beego/beego/context"
	"github.com/beego/beego/logs"
	"github.com/the-open-agent/openagent/aiguard"
	"github.com/the-open-agent/openagent/object"
	"github.com/the-open-agent/openagent/util"
)

func RecordMessage(ctx *context.Context) {
	if ctx.Request.URL.Path == "/api/login" || ctx.Request.URL.Path == "/api/signup" || ctx.Request.URL.Path == "/api/get-assets" {
		return
	}

	userId := getUsername(ctx)
	ctx.Input.SetParam("recordUserId", userId)
}

func AfterRecordMessage(ctx *context.Context) {
	record, err := object.NewRecord(ctx)
	if err != nil {
		logs.Error("AfterRecordMessage() error: %s", err.Error())
		return
	}

	userId := ctx.Input.Params()["recordUserId"]
	if userId != "" {
		organization, user, err := util.GetOwnerAndNameFromIdWithError(userId)
		if err != nil {
			panic(err)
		}
		record.Organization, record.User = organization, user
	}

	object.AddRecord(record, "en")
	aiguard.SubmitRecord(record)
}
