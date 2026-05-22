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

import {SuggestionCarrier} from "../carrier/SuggestionCarrier";
import {TitleCarrier} from "../carrier/TitleCarrier";
import {resolveChatTitle} from "../carrier/titleUtils";

export class MessageCarrier {
  constructor(needTitle) {
    this.needTitle = needTitle;
    this.suggestionCarrier = new SuggestionCarrier();
    this.titleCarrier = new TitleCarrier(needTitle);
  }

  parseAnswerWithCarriers = (answer, userMessage = "") => {
    const {parsedAnswer, title} = this.titleCarrier.parseAnswerAndTitle(answer);

    const {finalAnswer, suggestionArray} = this.suggestionCarrier.parseAnswerAndSuggestions(parsedAnswer);

    return {
      finalAnswer,
      suggestionArray,
      title: this.needTitle ? resolveChatTitle(title, userMessage) : "",
    };
  };
}
