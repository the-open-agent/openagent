import { getProviderModels, type ProviderModelCatalogItem } from "~/backend/ProviderBackend"
import { getProviderSubTypeOptions } from "~/lib/ProviderSetting"

export type ModelOption = {
  id: string
  name: string
  deprecated?: boolean
}

export const DYNAMIC_PROVIDER_TYPES = new Set([
  "OpenAI",
  "Gemini",
  "DeepSeek",
  "Grok",
  "OpenRouter",
  "Mistral",
  "Moonshot",
])

export function isDynamicProviderType(type?: string | null): boolean {
  return !!type && DYNAMIC_PROVIDER_TYPES.has(type)
}

export function getStaticModelOptions(type: string): ModelOption[] {
  return (getProviderSubTypeOptions("Model", type) || []).map((item: { id: string; name: string }) => ({
    id: item.id,
    name: item.name,
    deprecated: isLikelyDeprecated(item.id),
  }))
}

export async function loadModelCatalog(params: {
  type: string
  providerUrl?: string
  clientId?: string
  clientSecret?: string
  region?: string
}): Promise<{ options: ModelOption[]; source: "dynamic" | "fallback"; fallbackMsg?: string }> {
  const staticOptions = getStaticModelOptions(params.type)
  if (!isDynamicProviderType(params.type)) {
    return { options: staticOptions, source: "fallback" }
  }

  try {
    const res = await getProviderModels({
      type: params.type,
      providerUrl: params.providerUrl || "",
      clientId: params.clientId || "",
      clientSecret: params.clientSecret || "",
      region: params.region || "",
    })
    if (res?.status !== "ok") {
      return { options: staticOptions, source: "fallback", fallbackMsg: res?.msg || "fetch failed" }
    }
    const data = res?.data
    const dynamicItems = Array.isArray(data?.items) ? (data.items as ProviderModelCatalogItem[]) : []
    if (!dynamicItems.length) {
      return { options: staticOptions, source: "fallback", fallbackMsg: data?.fallbackMsg || "empty model list" }
    }
    const merged = mergeOptions(
      dynamicItems.map((item) => ({
        id: item.id,
        name: item.name || item.id,
        deprecated: !!item.deprecated || isLikelyDeprecated(item.id),
      })),
      staticOptions
    )
    return { options: merged, source: data?.source === "dynamic" ? "dynamic" : "fallback", fallbackMsg: data?.fallbackMsg }
  } catch {
    return { options: staticOptions, source: "fallback", fallbackMsg: "network error" }
  }
}

function mergeOptions(primary: ModelOption[], secondary: ModelOption[]): ModelOption[] {
  const map = new Map<string, ModelOption>()
  for (const item of primary) {
    if (!item.id) continue
    map.set(item.id, item)
  }
  for (const item of secondary) {
    if (!item.id) continue
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
  }
  return [...map.values()]
}

/** Use dynamic catalog only when it was loaded for the current provider type. */
export function resolveModelOptions(params: {
  providerType: string
  catalogType: string
  loading: boolean
  dynamicOptions: ModelOption[]
  staticOptions: ModelOption[]
}): ModelOption[] {
  const { providerType, catalogType, loading, dynamicOptions, staticOptions } = params
  if (
    loading ||
    !providerType ||
    catalogType !== providerType ||
    dynamicOptions.length === 0
  ) {
    return staticOptions
  }
  return dynamicOptions
}

function isLikelyDeprecated(modelId: string): boolean {
  const id = (modelId || "").toLowerCase()
  if (!id) return false
  if (id.startsWith("text-davinci-") || id.startsWith("text-curie-") || id.startsWith("text-babbage-") || id.startsWith("text-ada-")) return true
  if (id === "gpt-3.5-turbo") return true
  if (id.includes("claude-instant")) return true
  return false
}

