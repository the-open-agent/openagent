import { apiFetch, apiPost, ServerUrl, getAcceptLanguage, handleFetchResponse } from "~/lib/api"
import {
  getOtherProviderInfo,
  getProviderDisplayName as getProviderDisplayNameFromSettings,
  getProviderLogoURL,
} from "~/lib/ProviderSetting"

export type Provider = {
  owner: string
  name: string
  createdTime?: string
  displayName?: string
  displayName2?: string
  category: string
  type: string
  subType?: string
  clientId?: string
  clientSecret?: string
  mcpTools?: string[]
  enableThinking?: boolean
  temperature?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  inputPricePerThousandTokens?: number
  outputPricePerThousandTokens?: number
  currency?: string
  providerUrl?: string
  apiVersion?: string
  apiKey?: string
  providerKey?: string
  network?: string
  userKey?: string
  userCert?: string
  signKey?: string
  signCert?: string
  compatibleProvider?: string
  contractName?: string
  contractMethod?: string
  isDefault?: boolean
  isRemote?: boolean
  region?: string
  domain?: string
  chain?: string
  text?: string
  browserUrl?: string
  flavor?: string
  testContent?: string
  state?: string
  logoUrl?: string
}

export function getGlobalProviders(): Promise<any> {
  return apiFetch("/api/get-global-providers")
}

export function getProviders(
  owner: string,
  storeName = "",
  page = "",
  pageSize = "",
  field = "",
  value = "",
  sortField = "",
  sortOrder = ""
): Promise<any> {
  const params = new URLSearchParams({
    owner,
    store: storeName,
    p: page,
    pageSize,
    field,
    value,
    sortField,
    sortOrder,
  })
  return apiFetch(`/api/get-providers?${params.toString()}`)
}

export function getProvider(owner: string, name: string): Promise<any> {
  return apiFetch(`/api/get-provider?id=${encodeURIComponent(owner)}/${encodeURIComponent(name)}`)
}

export function updateProvider(owner: string, name: string, provider: Provider): Promise<any> {
  return apiPost(`/api/update-provider?id=${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, provider)
}

export function addProvider(provider: Provider): Promise<any> {
  return apiPost("/api/add-provider", provider)
}

export function deleteProvider(provider: Provider): Promise<any> {
  return apiPost("/api/delete-provider", provider)
}

export function testTool(provider: Provider): Promise<any> {
  return apiPost("/api/test-tool", provider)
}

export function isProviderSupportWebSearch(provider: Provider): boolean {
  if (!provider || provider.category !== "Model") return false
  const supportedTypes = ["OpenAI", "Alibaba Cloud", "Baidu", "Tencent Cloud", "ByteDance", "Moonshot", "DeepSeek"]
  return supportedTypes.includes(provider.type)
}

export function getServers(owner: string): Promise<any> {
  return apiFetch(`/api/get-servers?owner=${encodeURIComponent(owner)}`)
}

export function getSkills(owner: string): Promise<any> {
  return apiFetch(`/api/get-skills?owner=${encodeURIComponent(owner)}`)
}

export function getTools(owner: string): Promise<any> {
  return apiFetch(`/api/get-tools?owner=${encodeURIComponent(owner)}`)
}

export function getStorageProviders(owner: string): Promise<any> {
  return apiFetch(`/api/get-storage-providers?owner=${encodeURIComponent(owner)}`)
}

export function getProviderLogoUrl(provider: { type: string; category?: string }): string {
  return getProviderLogoURL(provider) || "https://cdn.openagentai.org/img/social_default.png"
}

export function getProviderDisplayName(provider: Provider): string {
  return getProviderDisplayNameFromSettings(provider)
}

export function getProviderUrl(provider: Provider): string {
  const info = getOtherProviderInfo() as any
  return info?.[provider.category]?.[provider.type]?.url ?? ""
}

export function addVector(vector: unknown): Promise<any> {
  return apiPost("/api/add-vector", vector)
}

export function updateVector(owner: string, name: string, vector: unknown): Promise<any> {
  return apiPost(`/api/update-vector?id=${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, vector)
}

export function getVector(owner: string, name: string): Promise<any> {
  return apiFetch(`/api/get-vector?id=${encodeURIComponent(owner)}/${encodeURIComponent(name)}`)
}

export function deleteVector(vector: unknown): Promise<any> {
  return apiPost("/api/delete-vector", vector)
}

export type ProviderModelCatalogItem = {
  id: string
  name: string
  deprecated?: boolean
  source?: string
}

export type ProviderModelCatalogResponse = {
  items: ProviderModelCatalogItem[]
  source: "dynamic" | "fallback"
  fallbackMsg?: string
}

export function getProviderModels(payload: {
  type: string
  providerUrl?: string
  clientId?: string
  clientSecret?: string
  region?: string
}): Promise<any> {
  return apiPost("/api/get-provider-models", payload)
}

export async function generateTextToSpeechAudio(
  storeId: string,
  providerId: string,
  messageId: string,
  text: string
): Promise<Blob> {
  const response = await fetch(`${ServerUrl}/api/generate-text-to-speech-audio`, {
    method: "POST",
    credentials: "include",
    headers: { "Accept-Language": getAcceptLanguage() },
    body: JSON.stringify({ storeId, providerId, messageId, text }),
  })
  const contentType = response.headers.get("Content-Type") || ""
  if (response.ok && !contentType.includes("application/json")) {
    return response.blob()
  }
  const data = await handleFetchResponse(response)
  throw new Error(data?.msg || "TTS request failed")
}
