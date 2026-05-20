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

import { LinkIcon, Loader2Icon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import i18next from "i18next"
import {
  getModelProviderMetadata,
  getProviderLogoURL,
  getQuickSetupModelTypes,
} from "~/lib/ProviderSetting"
import {
  getStaticModelOptions,
  loadModelCatalog,
  resolveModelOptions,
  type ModelOption,
} from "~/lib/ProviderModelCatalog"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import { FieldRow, SectionTitle, SelectableCard } from "./QuickSetupCommon"

interface ModelSectionProps {
  selectedModelType: string | null
  onSelectModel: (type: string) => void
  apiKey: string
  setApiKey: (v: string) => void
  clientId: string
  setClientId: (v: string) => void
  region: string
  setRegion: (v: string) => void
  subType: string
  setSubType: (v: string) => void
  providerUrl: string
  setProviderUrl: (v: string) => void
}

export default function ModelSection({
  selectedModelType,
  onSelectModel,
  apiKey,
  setApiKey,
  clientId,
  setClientId,
  region,
  setRegion,
  subType,
  setSubType,
  providerUrl,
  setProviderUrl,
}: ModelSectionProps) {
  const modelTypes = getQuickSetupModelTypes()
  const meta = selectedModelType ? getModelProviderMetadata(selectedModelType) : null
  const [modelList, setModelList] = useState<ModelOption[]>([])
  const [catalogType, setCatalogType] = useState("")
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelSource, setModelSource] = useState<"dynamic" | "fallback">("fallback")

  const modelRequest = useMemo(
    () => ({
      type: selectedModelType || "",
      providerUrl,
      clientId,
      clientSecret: apiKey,
      region,
    }),
    [selectedModelType, providerUrl, clientId, apiKey, region]
  )

  useEffect(() => {
    if (!selectedModelType || selectedModelType === "OpenAI Compatible") {
      setModelList([])
      setCatalogType("")
      setModelSource("fallback")
      return
    }

    setCatalogType("")
    setModelList([])

    let cancelled = false
    const timer = setTimeout(() => {
      setLoadingModels(true)
      const requestedType = modelRequest.type
      loadModelCatalog(modelRequest)
        .then((res) => {
          if (cancelled) return
          setCatalogType(requestedType)
          setModelList(res.options)
          setModelSource(res.source)
        })
        .finally(() => {
          if (!cancelled) setLoadingModels(false)
        })
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [selectedModelType, modelRequest])

  const staticModelList = useMemo(
    () => (selectedModelType ? getStaticModelOptions(selectedModelType) : []),
    [selectedModelType]
  )
  const displayModelList = useMemo(
    () =>
      selectedModelType
        ? resolveModelOptions({
            providerType: selectedModelType,
            catalogType,
            loading: loadingModels,
            dynamicOptions: modelList,
            staticOptions: staticModelList,
          })
        : [],
    [selectedModelType, catalogType, loadingModels, modelList, staticModelList]
  )

  return (
    <Card>
      <CardHeader className="border-b">
        <SectionTitle number={1} title={i18next.t("setup:Choose an AI Model")} />
        <CardDescription>
          {i18next.t("setup:Select the AI provider you want to use")}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))" }}>
          {modelTypes.map((type) => (
            <SelectableCard
              key={type}
              logo={getProviderLogoURL({ category: "Model", type })}
              label={type}
              desc={getModelProviderMetadata(type).desc}
              selected={selectedModelType === type}
              onClick={() => onSelectModel(type)}
            />
          ))}
        </div>

        {meta && (
          <>
            <Separator className="my-5" />
            <p className="text-sm font-medium mb-4 text-foreground">
              {i18next.t("setup:Configure")} {selectedModelType}
            </p>

            <FieldRow label={i18next.t("general:Model")}>
              {loadingModels && (
                <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2Icon className="h-3 w-3 animate-spin" />
                  {i18next.t("general:Loading")}
                </div>
              )}
              {displayModelList.length > 0 ? (
                <Select value={subType} onValueChange={(v) => v !== null && setSubType(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={i18next.t("setup:Enter model name")} />
                  </SelectTrigger>
                  <SelectContent>
                    {displayModelList.map((m: ModelOption) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}{m.deprecated ? " (deprecated)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  placeholder={i18next.t("setup:Enter model name")}
                />
              )}
              {!loadingModels && displayModelList.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {modelSource === "dynamic" ? "Models loaded from provider API" : "Using built-in fallback model list"}
                </p>
              )}
            </FieldRow>

            {meta.needsClientId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldRow
                  label={
                    selectedModelType === "Amazon Bedrock"
                      ? "Access Key ID"
                      : selectedModelType === "Azure"
                        ? i18next.t("provider:Deployment name")
                        : "Client ID"
                  }
                >
                  <Input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder={selectedModelType === "Azure" ? i18next.t("setup:Enter deployment name") : "AKIA..."}
                  />
                </FieldRow>
              </div>
            )}

            {meta.needsApiKey && (
              <FieldRow
                label={i18next.t("setup:API Key")}
                hint={i18next.t("setup:Your secret API key from the provider dashboard")}
              >
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </FieldRow>
            )}

            {meta.needsRegion && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldRow label={i18next.t("general:Region")}>
                  <Input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="us-east-1"
                  />
                </FieldRow>
              </div>
            )}

            {meta.needsUrl && (
              <FieldRow
                label={
                  selectedModelType === "Ollama"
                    ? i18next.t("setup:Ollama Server URL")
                    : i18next.t("setup:API Endpoint URL")
                }
                hint={
                  selectedModelType === "Ollama"
                    ? i18next.t("setup:Make sure Ollama is running locally before saving")
                    : undefined
                }
              >
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={providerUrl}
                    onChange={(e) => setProviderUrl(e.target.value)}
                    placeholder={meta.urlPlaceholder || "https://"}
                    className="pl-9"
                  />
                </div>
              </FieldRow>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
