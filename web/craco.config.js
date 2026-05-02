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

const CracoLessPlugin = require("craco-less");
const path = require("path");

module.exports = {
  devServer: {
    proxy: {
      "/api": {
        target: "http://localhost:14000",
        changeOrigin: true,
      },
      "/swagger": {
        target: "http://localhost:14000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: {"@primary-color": "rgb(89,54,213)", "@border-radius-base": "5px"},
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
  webpack: {
    configure: (webpackConfig, {env, paths}) => {
      paths.appBuild = path.resolve(__dirname, "build-temp");
      webpackConfig.output.path = path.resolve(__dirname, "build-temp");

      // dompurify (pulled in by mermaid) ships sourceMappingURL pointing at src/*.ts
      // that are not published on npm; source-map-loader then floods the console.
      const prev = webpackConfig.ignoreWarnings;
      webpackConfig.ignoreWarnings = [
        ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
        (warning) => {
          const msg = warning && (warning.message || warning);
          return (
            typeof msg === "string" &&
            msg.includes("Failed to parse source map") &&
            msg.includes("dompurify")
          );
        },
      ];

      return webpackConfig;
    },
  },
};
