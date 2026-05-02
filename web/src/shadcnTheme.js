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

// Shadcn-style Ant Design theme configuration.
// Adapted from the "shadcn" preset on https://ant.design/

import {DefaultColorPrimary} from "./Conf";

function hexToRgbComma(hex) {
  const h = hex.replace(/^#/, "");
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) {
    return "38, 38, 38";
  }
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const primaryRgb = hexToRgbComma(DefaultColorPrimary);

// Link tokens for dark mode — must be light enough to read on dark backgrounds.
// colorPrimary is near-black (#404040), so the algorithm would derive dark links by default.
const darkLinkTokens = {
  colorLink: "#d4d4d4",
  colorLinkHover: "#f5f5f5",
  colorLinkActive: "#a3a3a3",
};

// Structural tokens that apply regardless of theme (no colors)
const structuralTokens = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  borderRadius: 10,
  borderRadiusXS: 2,
  borderRadiusSM: 6,
  borderRadiusLG: 14,
  padding: 16,
  paddingSM: 12,
  paddingLG: 24,
  margin: 16,
  marginSM: 12,
  marginLG: 24,
  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
  boxShadowSecondary: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
};

// Light-mode color tokens
const lightColorTokens = {
  colorPrimary: DefaultColorPrimary,
  colorSuccess: "#22c55e",
  colorWarning: "#f97316",
  colorError: "#ef4444",
  colorInfo: DefaultColorPrimary,
  colorTextBase: DefaultColorPrimary,
  colorBgBase: "#ffffff",
  colorPrimaryBg: "#f5f5f5",
  colorPrimaryBgHover: "#e5e5e5",
  colorPrimaryBorder: "#d4d4d4",
  colorPrimaryBorderHover: "#a3a3a3",
  colorPrimaryHover: "#404040",
  colorPrimaryActive: "#171717",
  colorPrimaryText: DefaultColorPrimary,
  colorPrimaryTextHover: "#404040",
  colorPrimaryTextActive: "#171717",
  colorSuccessBg: "#f0fdf4",
  colorSuccessBgHover: "#dcfce7",
  colorSuccessBorder: "#bbf7d0",
  colorSuccessBorderHover: "#86efac",
  colorSuccessHover: "#16a34a",
  colorSuccessActive: "#15803d",
  colorSuccessText: "#16a34a",
  colorSuccessTextHover: "#16a34a",
  colorSuccessTextActive: "#15803d",
  colorWarningBg: "#fff7ed",
  colorWarningBgHover: "#fed7aa",
  colorWarningBorder: "#fdba74",
  colorWarningBorderHover: "#fb923c",
  colorWarningHover: "#ea580c",
  colorWarningActive: "#c2410c",
  colorWarningText: "#ea580c",
  colorWarningTextHover: "#ea580c",
  colorWarningTextActive: "#c2410c",
  colorErrorBg: "#fef2f2",
  colorErrorBgHover: "#fecaca",
  colorErrorBorder: "#fca5a5",
  colorErrorBorderHover: "#f87171",
  colorErrorHover: "#dc2626",
  colorErrorActive: "#b91c1c",
  colorErrorText: "#dc2626",
  colorErrorTextHover: "#dc2626",
  colorErrorTextActive: "#b91c1c",
  colorInfoBg: "#f5f5f5",
  colorInfoBgHover: "#e5e5e5",
  colorInfoBorder: "#d4d4d4",
  colorInfoBorderHover: "#a3a3a3",
  colorInfoHover: "#404040",
  colorInfoActive: "#171717",
  colorInfoText: DefaultColorPrimary,
  colorInfoTextHover: "#404040",
  colorInfoTextActive: "#171717",
  colorLink: DefaultColorPrimary,
  colorLinkHover: "#404040",
  colorLinkActive: "#171717",
  colorText: DefaultColorPrimary,
  colorTextSecondary: "#525252",
  colorTextTertiary: "#737373",
  colorTextQuaternary: "#a3a3a3",
  colorTextDisabled: "#a3a3a3",
  colorBgContainer: "#ffffff",
  colorBgElevated: "#ffffff",
  colorBgLayout: "#fafafa",
  colorBgSpotlight: `rgba(${primaryRgb}, 0.85)`,
  colorBgMask: `rgba(${primaryRgb}, 0.45)`,
  colorBorder: "#e5e5e5",
  colorBorderSecondary: "#f5f5f5",
};

export function getShadcnThemeToken(isDark) {
  if (isDark) {
    return {
      ...structuralTokens,
      ...darkLinkTokens,
    };
  }
  return {
    ...structuralTokens,
    ...lightColorTokens,
  };
}

// Keep for backward compatibility
export const shadcnThemeToken = {
  ...structuralTokens,
  ...lightColorTokens,
};

function getLightComponents() {
  return {
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
      defaultBorderColor: "#e4e4e7",
      defaultColor: "#18181b",
      defaultBg: "#ffffff",
      defaultHoverBg: "#f4f4f5",
      defaultHoverBorderColor: "#d4d4d8",
      defaultHoverColor: "#18181b",
      defaultActiveBg: "#e4e4e7",
      defaultActiveBorderColor: "#d4d4d8",
      borderRadius: 6,
    },
    Input: {
      activeShadow: "none",
      hoverBorderColor: "#a1a1aa",
      activeBorderColor: "#18181b",
      borderRadius: 6,
    },
    Select: {
      optionSelectedBg: "#f4f4f5",
      optionActiveBg: "#fafafa",
      optionSelectedFontWeight: 500,
      borderRadius: 6,
    },
    Alert: {
      borderRadiusLG: 8,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Progress: {
      defaultColor: "#18181b",
      remainingColor: "#f4f4f5",
    },
    Steps: {
      iconSize: 32,
    },
    Switch: {
      trackHeight: 24,
      trackMinWidth: 44,
      innerMinMargin: 4,
      innerMaxMargin: 24,
    },
    Checkbox: {
      borderRadiusSM: 4,
    },
    Slider: {
      trackBg: "#f4f4f5",
      trackHoverBg: "#e4e4e7",
      handleSize: 18,
      handleSizeHover: 20,
      railSize: 6,
    },
    ColorPicker: {
      borderRadius: 6,
    },
    Menu: {
      itemFontSize: 14,
      groupTitleFontSize: 12,
      itemHeight: 40,
      fontWeightStrong: 600,
      itemSelectedBg: "rgba(0, 0, 0, 0.12)",
      itemSelectedColor: "inherit",
    },
    Table: {
      headerBg: "#fafafa",
      headerSplitColor: "#e5e5e5",
      fontWeightStrong: 600,
    },
  };
}

function getDarkComponents() {
  return {
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
      borderRadius: 6,
    },
    Input: {
      activeShadow: "none",
      hoverBorderColor: "#555",
      activeBorderColor: "#888",
      borderRadius: 6,
    },
    Select: {
      optionSelectedFontWeight: 500,
      optionActiveBg: "rgba(255, 255, 255, 0.08)",
      optionSelectedBg: "rgba(255, 255, 255, 0.12)",
      hoverBorderColor: "#555",
      activeBorderColor: "#888",
      borderRadius: 6,
    },
    Alert: {
      borderRadiusLG: 8,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Steps: {
      iconSize: 32,
    },
    Switch: {
      trackHeight: 24,
      trackMinWidth: 44,
      innerMinMargin: 4,
      innerMaxMargin: 24,
    },
    Checkbox: {
      borderRadiusSM: 4,
    },
    Slider: {
      handleSize: 18,
      handleSizeHover: 20,
      railSize: 6,
    },
    ColorPicker: {
      borderRadius: 6,
    },
    Menu: {
      itemFontSize: 14,
      groupTitleFontSize: 12,
      itemHeight: 40,
      fontWeightStrong: 600,
      itemHoverBg: "rgba(255, 255, 255, 0.08)",
      itemSelectedBg: "rgba(255, 255, 255, 0.12)",
      itemSelectedColor: "inherit",
    },
    Table: {
      fontWeightStrong: 600,
    },
  };
}

export function getShadcnThemeComponents(isDark) {
  return isDark ? getDarkComponents() : getLightComponents();
}

// Keep for backward compatibility
export const shadcnThemeComponents = getLightComponents();
