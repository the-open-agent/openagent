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

import React, {useEffect, useState} from "react";
import {GlobalOutlined} from "@ant-design/icons";
import {Check} from "lucide-react";
import * as Setting from "./Setting";
import * as Conf from "./Conf";
import "./shadcn-vars.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "./components/ui/dropdown-menu";

const countryMap = Object.fromEntries(Setting.Countries.map(c => [c.key, c]));

const flagIcon = (country, alt) => (
  <img className="language-icon" width={24} alt={alt} src={`${Conf.StaticBaseUrl}/flag-icons/${country}.svg`} />
);

export default function LanguageSelect({languages, style}) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(() => Setting.getLanguage());
  const availableLanguages = languages ?? Setting.Countries.map(item => item.key);

  useEffect(() => {
    availableLanguages.forEach(key => {
      const c = countryMap[key];
      if (c) {
        new Image().src = `${Conf.StaticBaseUrl}/flag-icons/${c.country}.svg`;
      }
    });
  }, []);

  if (availableLanguages.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <span
          className="select-box cursor-pointer inline-flex items-center"
          style={style}
          onMouseEnter={() => setOpen(true)}
        >
          <GlobalOutlined style={{fontSize: "24px"}} />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={2}
        className="w-36 z-[100] rounded-xl border border-[rgb(230,225,224)]"
        onMouseLeave={() => setOpen(false)}
      >
        {availableLanguages.map(key => {
          const c = countryMap[key];
          if (!c) {return null;}
          const isSelected = lang === key;
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => {Setting.setLanguage(key); setLang(key); setOpen(false);}}
              className={isSelected ? "text-red-500 data-[highlighted]:bg-accent data-[highlighted]:text-red-500" : "data-[highlighted]:bg-accent"}
            >
              <span className="mr-2">{flagIcon(c.country, c.alt)}</span>
              {c.label}
              {isSelected && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
