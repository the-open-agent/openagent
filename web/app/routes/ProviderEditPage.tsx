import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router"
import { CheckIcon, CopyIcon, DownloadIcon, LinkIcon, Loader2Icon, Volume2Icon } from "lucide-react"
import { toast } from "sonner"
import i18next from "i18next"
import "~/i18n"

import { isAdminUser } from "~/backend/AccountBackend"
import {
  addVector,
  deleteProvider,
  deleteVector,
  generateTextToSpeechAudio,
  getProvider,
  getVector,
  type Provider,
  updateProvider,
  updateVector,
} from "~/backend/ProviderBackend"
import { useAccount } from "~/context/AccountContext"
import {
  getCompatibleProviderOptions,
  getProviderAzureApiVersionOptions,
  getProviderLogoURL,
  getProviderSubTypeOptions,
  getProviderTypeOptions,
  getThinkingModelMaxTokens,
  getTtsFlavorOptions,
} from "~/lib/ProviderSetting"
import { loadModelCatalog, resolveModelOptions, type ModelOption } from "~/lib/ProviderModelCatalog"
import { FormField, NumberInput, SectionCard } from "~/lib/Setting"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Slider } from "~/components/ui/slider"
import { Switch } from "~/components/ui/switch"
import { Textarea } from "~/components/ui/textarea"
import ModelTestWidget from "~/components/provider/ModelTestWidget"

export function meta() {
  return [{ title: "Edit Provider - OpenAgent" }]
}

const CATEGORIES = ["Storage", "Model", "Embedding", "Blockchain", "Video", "Text-to-Speech", "Speech-to-Text"]
const CURRENCIES = ["USD", "CNY", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "HKD", "SGD"]
const MODEL_DEFAULTS: Record<string, string> = {
  "OpenAI Compatible": "",
  OpenAI: "gpt-5.4",
  Gemini: "gemini-pro",
  "OpenRouter": "anthropic/claude-opus-4-5",
  iFlytek: "spark4.0-ultra",
  "Baidu Cloud": "ernie-4.0-8k",
  MiniMax: "MiniMax-Text-01",
  Claude: "claude-opus-4-5",
  "Hugging Face": "gpt2",
  ChatGLM: "chatglm2-6b",
  Ollama: "llama3.3:70b",
  Local: "custom-model",
  Azure: "gpt-5.4",
  Cohere: "command",
  "Alibaba Cloud": "qwen3-235b-a22b",
  Moonshot: "kimi-k2-0905-preview",
  "Amazon Bedrock": "claude",
  Baichuan: "Baichuan2-Turbo",
  "Volcano Engine": "Doubao-lite-4k",
  DeepSeek: "deepseek-v4-pro",
  StepFun: "step-1-8k",
  "Tencent Cloud": "hunyuan-turbo",
  Yi: "yi-lightning",
  "Silicon Flow": "deepseek-ai/DeepSeek-R1",
  GitHub: "gpt-4o",
  Writer: "palmyra-x5",
}
const EMBEDDING_DEFAULTS: Record<string, string> = {
  OpenAI: "AdaSimilarity",
  Gemini: "embedding-001",
  "Hugging Face": "sentence-transformers/all-MiniLM-L6-v2",
  Cohere: "embed-english-v2.0",
  "Baidu Cloud": "Embedding-V1",
  Local: "custom-embedding",
  Ollama: "nomic-embed-text",
  Azure: "text-embedding-ada-002",
  MiniMax: "embo-01",
  "Alibaba Cloud": "text-embedding-v1",
  "Tencent Cloud": "hunyuan-embedding",
  Jina: "jina-embeddings-v2-base-en",
  Word2Vec: "word2vec",
}
const EMBEDDING_TEST_CONTENT = "This is a sample text for embedding generation."
const TTS_TEST_CONTENT = "Hello, this is a test for text to speech conversion."

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

function withDefaultTestContent(provider: Provider): Provider {
  if (provider.testContent) return provider
  if (provider.category === "Embedding") return { ...provider, testContent: EMBEDDING_TEST_CONTENT }
  if (provider.category === "Text-to-Speech") return { ...provider, testContent: TTS_TEST_CONTENT }
  return provider
}

function isEnglish() {
  const lang = i18next.language
  return !lang || lang === "null" || lang === "en" || lang.startsWith("en-")
}

function FieldInput({
  value,
  onChange,
  disabled,
  password,
  link,
  placeholder,
}: {
  value?: string
  onChange: (v: string) => void
  disabled?: boolean
  password?: boolean
  link?: boolean
  placeholder?: string
}) {
  return (
    <div className="relative">
      {link && <LinkIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
      <Input
        type={password ? "password" : "text"}
        className={link ? "pl-8" : ""}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function SelectField({
  value,
  options,
  onChange,
  disabled,
  withLogo,
  category,
}: {
  value?: string
  options: Array<{ id: string; name: string }>
  onChange: (v: string) => void
  disabled?: boolean
  withLogo?: boolean
  category?: string
}) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v ?? "")} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {withLogo && category && (
              <img
                src={getProviderLogoURL({ category, type: item.name })}
                alt={item.name}
                className="h-4 w-4 object-contain"
                onError={(e) => { ;(e.currentTarget as HTMLImageElement).style.display = "none" }}
              />
            )}
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DataListInput({
  value,
  options,
  onChange,
  disabled,
  placeholder,
}: {
  value?: string
  options: Array<{ id: string; name: string }>
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const id = useMemo(() => `list-${Math.random().toString(36).slice(2)}`, [])
  return (
    <>
      <Input
        value={value ?? ""}
        disabled={disabled}
        list={id}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={id}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </datalist>
    </>
  )
}

function SliderNumber({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  value?: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  disabled?: boolean
}) {
  const n = typeof value === "number" ? value : min
  return (
    <div className="flex items-center gap-3">
      <Slider
        value={n}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(Array.isArray(v) ? (v[0] ?? min) : v)}
        className="flex-1"
      />
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={n}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24"
      />
    </div>
  )
}

function CopyDownloadTextarea({
  label,
  value,
  onChange,
  filename,
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  filename: string
}) {
  const [copied, setCopied] = useState(false)

  function download() {
    const blob = new Blob([value ?? ""], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <FormField label={label} className="sm:col-span-2 lg:col-span-3">
      <div className="mb-2 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!value}
          onClick={() => {
            navigator.clipboard.writeText(value ?? "").then(() => {
              toast.success(i18next.t("general:Copied to clipboard successfully"))
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }).catch(() => {
              toast.error(i18next.t("general:Failed to copy to clipboard"))
            })
          }}
        >
          {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <CopyIcon className="h-4 w-4" />}
          {i18next.t("general:Copy")}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!value} onClick={download}>
          <DownloadIcon className="h-4 w-4" />
          {i18next.t("general:Download")}
        </Button>
      </div>
      <Textarea className="min-h-64 font-mono text-xs" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  )
}

function getClientIdLabel(provider: Provider) {
  if (["Model", "Embedding"].includes(provider.category)) {
    if (provider.type === "Tencent Cloud") return i18next.t("general:Secret ID")
    if (provider.type === "Baidu Cloud") return i18next.t("provider:API key")
    if (provider.type === "Azure") return i18next.t("provider:Deployment name")
    if (provider.type === "MiniMax") return i18next.t("provider:Group ID")
  }
  if (provider.category === "Storage") {
    if (provider.type === "Alibaba Cloud OSS") return i18next.t("provider:Client ID")
    return i18next.t("store:Storage subpath")
  }
  return i18next.t("provider:Client ID")
}

function getProviderUrlLabel(provider: Provider) {
  if (["Model", "Blockchain"].includes(provider.category)) {
    if (provider.type === "Volcano Engine") return i18next.t("provider:Endpoint ID")
    if (provider.type === "OpenAI Compatible") return i18next.t("provider:Endpoint")
  }
  return i18next.t("general:Provider URL")
}

function getClientSecretLabel(provider: Provider) {
  if (["Storage", "Embedding", "Text-to-Speech", "Speech-to-Text"].includes(provider.category)) {
    if (provider.type === "Baidu Cloud") return i18next.t("general:Access secret")
    return i18next.t("general:Secret key")
  }
  if (provider.category === "Model") return i18next.t("provider:API key")
  if (provider.category === "Blockchain" && provider.type === "Ethereum") return i18next.t("provider:Private key")
  return i18next.t("provider:Client secret")
}

function getRegionLabel(provider: Provider) {
  if (provider.category === "Blockchain" && provider.type === "ChainMaker") return i18next.t("general:Org ID")
  return i18next.t("general:Region")
}

function shouldShowClientId(provider: Provider) {
  return (
    ((provider.category === "Embedding" && provider.type === "Baidu Cloud") ||
      (provider.category === "Embedding" && provider.type === "Tencent Cloud") ||
      provider.category === "Storage") ||
    (provider.category === "Blockchain" && !["ChainMaker", "Ethereum"].includes(provider.type)) ||
    ((provider.category === "Model" || provider.category === "Embedding") && provider.type === "Azure") ||
    !["Storage", "Model", "Embedding", "Text-to-Speech", "Speech-to-Text", "Blockchain"].includes(provider.category)
  )
}

function shouldShowClientSecret(provider: Provider) {
  return !(
    (provider.category === "Storage" && provider.type !== "Alibaba Cloud OSS") ||
    (provider.category === "Blockchain" && provider.type === "ChainMaker") ||
    provider.type === "Ollama"
  )
}

function isTemperatureEnabled(provider: Provider) {
  if (provider.category !== "Model") return false
  if (["OpenRouter", "iFlytek", "Hugging Face", "Baidu Cloud", "MiniMax", "Gemini", "Alibaba Cloud", "Baichuan", "Volcano Engine", "DeepSeek", "StepFun", "Tencent Cloud", "Mistral", "Yi", "Silicon Flow", "Ollama", "Writer"].includes(provider.type)) return true
  if (provider.type === "OpenAI") return !(provider.subType?.includes("o1") || provider.subType?.includes("o3") || provider.subType?.includes("o4"))
  return false
}

function isTopPEnabled(provider: Provider) {
  if (provider.category !== "Model") return false
  if (["OpenRouter", "Baidu Cloud", "Gemini", "Alibaba Cloud", "Baichuan", "Volcano Engine", "DeepSeek", "StepFun", "Tencent Cloud", "Mistral", "Yi", "Silicon Flow", "Ollama", "Writer"].includes(provider.type)) return true
  if (provider.type === "OpenAI") return !(provider.subType?.includes("o1") || provider.subType?.includes("o3") || provider.subType?.includes("o4"))
  return false
}

export default function ProviderEditPage() {
  const { providerName } = useParams<{ providerName: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { account } = useAccount()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [originalProvider, setOriginalProvider] = useState<Provider | null>(null)
  const [currentName, setCurrentName] = useState(providerName || "")
  const [isNewProvider, setIsNewProvider] = useState(!!location.state?.isNewProvider)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [embeddingResult, setEmbeddingResult] = useState<number[] | null>(null)
  const [dynamicModelOptions, setDynamicModelOptions] = useState<ModelOption[]>([])
  const [catalogType, setCatalogType] = useState("")
  const [loadingDynamicModels, setLoadingDynamicModels] = useState(false)
  const [dynamicModelSource, setDynamicModelSource] = useState<"dynamic" | "fallback">("fallback")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stableModelProviderNameRef = useRef("")

  useEffect(() => {
    if (!providerName) return
    stableModelProviderNameRef.current = ""
    getProvider("admin", providerName).then((res) => {
      if (res.status === "ok") {
        const nextProvider = withDefaultTestContent(res.data)
        stableModelProviderNameRef.current = nextProvider.name
        setProvider(nextProvider)
        setOriginalProvider(clone(nextProvider))
        setCurrentName(providerName)
      } else {
        toast.error(`${i18next.t("general:Failed to get")}: ${res.msg}`)
      }
    })
  }, [providerName])

  function update<K extends keyof Provider>(key: K, value: Provider[K]) {
    setProvider((p) => (p ? { ...p, [key]: value } : null))
  }

  const modelRequest = useMemo(
    () => ({
      type: provider?.type || "",
      providerUrl: provider?.providerUrl || "",
      clientId: provider?.clientId || "",
      clientSecret: provider?.clientSecret || "",
      region: provider?.region || "",
    }),
    [provider?.type, provider?.providerUrl, provider?.clientId, provider?.clientSecret, provider?.region]
  )

  useEffect(() => {
    if (!provider || provider.category !== "Model" || !provider.type) {
      setDynamicModelOptions([])
      setCatalogType("")
      setDynamicModelSource("fallback")
      return
    }

    setCatalogType("")
    setDynamicModelOptions([])

    let cancelled = false
    const timer = setTimeout(() => {
      setLoadingDynamicModels(true)
      const requestedType = modelRequest.type
      loadModelCatalog(modelRequest)
        .then((res) => {
          if (cancelled) return
          setCatalogType(requestedType)
          setDynamicModelOptions(res.options)
          setDynamicModelSource(res.source)
        })
        .finally(() => {
          if (!cancelled) setLoadingDynamicModels(false)
        })
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [provider?.category, provider?.type, modelRequest])

  function handleCategory(category: string) {
    setProvider((p) => {
      if (!p) return null

      let nextProvider: Provider = { ...p, category }
      if (category === "Storage") nextProvider = { ...nextProvider, type: "Local File System" }
      if (category === "Model") nextProvider = { ...nextProvider, type: "OpenAI", subType: "gpt-5.5" }
      if (category === "Embedding") nextProvider = { ...nextProvider, type: "OpenAI", subType: "AdaSimilarity" }
      if (category === "Video") nextProvider = { ...nextProvider, type: "AWS" }
      if (category === "Text-to-Speech") nextProvider = { ...nextProvider, type: "Alibaba Cloud", subType: "cosyvoice-v1" }
      if (category === "Speech-to-Text") nextProvider = { ...nextProvider, type: "Alibaba Cloud", subType: "paraformer-realtime-v1" }

      return withDefaultTestContent(nextProvider)
    })
  }

  function handleType(type: string) {
    if (!provider) return
    update("type", type)
    if (provider.category === "Model") update("subType", MODEL_DEFAULTS[type] || "")
    if (provider.category === "Embedding") update("subType", EMBEDDING_DEFAULTS[type] || "")
    if (provider.category === "Text-to-Speech" && type === "Alibaba Cloud") update("subType", "cosyvoice-v1")
    if (provider.category === "Speech-to-Text" && type === "Alibaba Cloud") update("subType", "paraformer-realtime-v1")
  }

  async function save(exit: boolean) {
    if (!provider) return
    setSaving(true)
    try {
      const res = await updateProvider(provider.owner, currentName, provider)
      if (res.status === "ok") {
        toast.success(i18next.t("general:Successfully saved"))
        setOriginalProvider(clone(provider))
        setCurrentName(provider.name)
        setIsNewProvider(false)
        if (exit) navigate("/providers")
        else navigate(`/providers/${provider.name}`, { replace: true })
      } else {
        toast.error(`${i18next.t("general:Failed to save")}: ${res.msg}`)
      }
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    if (isNewProvider && provider) {
      deleteProvider(provider).then((res) => {
        if (res.status === "ok") {
          toast.success(i18next.t("general:Cancelled successfully"))
          navigate("/providers")
        } else {
          toast.error(`${i18next.t("general:Failed to cancel")}: ${res.msg}`)
        }
      })
    } else {
      navigate("/providers")
    }
  }

  async function saveIfChanged() {
    if (!provider || !originalProvider) return
    if (JSON.stringify(provider) !== JSON.stringify(originalProvider)) {
      const res = await updateProvider(provider.owner, currentName, provider)
      if (res.status !== "ok") throw new Error(res.msg || i18next.t("general:Failed to save"))
      setOriginalProvider(clone(provider))
      setCurrentName(provider.name)
      setIsNewProvider(false)
    }
  }

  async function testEmbedding() {
    if (!provider?.testContent) return
    setTesting(true)
    setEmbeddingResult(null)
    try {
      await saveIfChanged()
      const vectorName = `test_${provider.name}`
      const vector = { owner: "admin", name: vectorName, provider: provider.name, text: "" }
      await deleteVector(vector)
      const addRes = await addVector(vector)
      if (addRes.status !== "ok") throw new Error(addRes.msg)
      const updateRes = await updateVector("admin", vectorName, { ...vector, text: provider.testContent })
      if (updateRes.status !== "ok") throw new Error(updateRes.msg)
      const getRes = await getVector("admin", vectorName)
      if (getRes.status === "ok" && getRes.data?.data) setEmbeddingResult(getRes.data.data)
      else throw new Error(i18next.t("general:Failed to get"))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setTesting(false)
    }
  }

  async function testTts() {
    if (!provider?.testContent) return
    setTesting(true)
    try {
      await saveIfChanged()
      audioRef.current?.pause()
      const blob = await generateTextToSpeechAudio("", `${provider.owner}/${provider.name}`, "", provider.testContent)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => URL.revokeObjectURL(url)
      await audio.play()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setTesting(false)
    }
  }

  if (!provider) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isRemote = !!provider.isRemote
  const disabled = isRemote
  const showSubType = ["Model", "Embedding", "Text-to-Speech", "Speech-to-Text"].includes(provider.category)
  const staticSubtypeOptions = getProviderSubTypeOptions(provider.category, provider.type) ?? []
  const rawSubtypeOptions =
    provider.category === "Model"
      ? resolveModelOptions({
          providerType: provider.type,
          catalogType,
          loading: loadingDynamicModels,
          dynamicOptions: dynamicModelOptions,
          staticOptions: staticSubtypeOptions,
        })
      : staticSubtypeOptions
  const subtypeOptions = rawSubtypeOptions.map((item: any) => ({
    ...item,
    name: item?.deprecated ? `${item.name} (deprecated)` : item.name,
  }))
  const showProviderUrl =
    (provider.category === "Model" && provider.type === "OpenAI Compatible") ||
    ((provider.category !== "Model" || ["Local", "Ollama", "Azure", "Volcano Engine", "Tencent Cloud"].includes(provider.type)) &&
      !(provider.category === "Storage" && provider.type === "Alibaba Cloud OSS") &&
      provider.category !== "Blockchain")
  const modelTypesWithOptionalTokenPrice = new Set([
    "Local",
    "Ollama",
    "OpenAI Compatible",
    "OpenAI",
    "Azure",
    "Claude",
    "Gemini",
    "OpenRouter",
    "Grok",
    "DeepSeek",
    "Mistral",
    "Moonshot",
    "Alibaba Cloud",
    "Silicon Flow",
    "Volcano Engine",
    "Baidu Cloud",
    "Amazon Bedrock",
  ])
  const showPrice = provider.category === "Model" && modelTypesWithOptionalTokenPrice.has(provider.type)
  const showEmbeddingPrice = provider.category === "Embedding" && ["Local", "Ollama"].includes(provider.type)
  const showCurrency =
    (provider.category === "Model" && modelTypesWithOptionalTokenPrice.has(provider.type)) ||
    ["Local", "Ollama", "OpenAI Compatible"].includes(provider.type)
  const tempEnabled = isTemperatureEnabled(provider)
  const topPEnabled = isTopPEnabled(provider)
  const tempMax = ["Alibaba Cloud", "Gemini", "OpenAI", "OpenRouter", "Baichuan", "DeepSeek", "StepFun", "Tencent Cloud", "Mistral", "Yi", "Ollama", "Writer"].includes(provider.type) ? 2 : 1

  return (
    <div className="min-h-screen bg-background px-5 py-4 pb-16">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          {isRemote ? i18next.t("general:View") : i18next.t("provider:Edit Provider")}
        </h1>
        {!isRemote && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => save(false)} disabled={saving}>
              {saving && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
              {i18next.t("general:Save")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => save(true)} disabled={saving}>{i18next.t("general:Save & Exit")}</Button>
            {isNewProvider && <Button variant="outline" size="sm" onClick={cancel}>{i18next.t("general:Cancel")}</Button>}
          </div>
        )}
      </div>

      <SectionCard title={i18next.t("general:General Settings")}>
        <FormField label={i18next.t("general:ID")} tooltip={i18next.t("general:Name - Tooltip")}>
          <FieldInput value={provider.name} disabled={disabled} onChange={(v) => update("name", v)} />
        </FormField>
        <FormField label={i18next.t("general:Display name")} tooltip={i18next.t("general:Display name - Tooltip")}>
          <FieldInput value={provider.displayName} disabled={disabled} onChange={(v) => update("displayName", v)} />
        </FormField>
        {!isEnglish() && (
          <FormField label={i18next.t("general:Display name 2")} tooltip={i18next.t("general:Display name 2 - Tooltip")}>
            <FieldInput value={provider.displayName2} disabled={disabled} onChange={(v) => update("displayName2", v)} />
          </FormField>
        )}
        <FormField label={i18next.t("general:Category")} tooltip={i18next.t("provider:Category - Tooltip")}>
          <SelectField value={provider.category} options={CATEGORIES.map((c) => ({ id: c, name: c }))} onChange={handleCategory} disabled={disabled} />
        </FormField>
        <FormField label={i18next.t("general:Type")} tooltip={i18next.t("general:Type - Tooltip")}>
          <SelectField
            value={provider.type}
            options={getProviderTypeOptions(provider.category)}
            onChange={handleType}
            disabled={disabled}
            withLogo
            category={provider.category}
          />
        </FormField>
        {showSubType && (
          <FormField label={i18next.t("provider:Sub type")} tooltip={i18next.t("provider:Sub type - Tooltip")}>
            {provider.category === "Model" && loadingDynamicModels && (
              <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2Icon className="h-3 w-3 animate-spin" />
                {i18next.t("general:Loading")}
              </div>
            )}
            {provider.type === "Ollama" || provider.type === "OpenAI Compatible" ? (
              <DataListInput value={provider.subType} options={subtypeOptions} onChange={(v) => update("subType", v)} disabled={disabled} placeholder="Please select or enter the model name" />
            ) : (
              <SelectField value={provider.subType} options={subtypeOptions} onChange={(v) => update("subType", v)} disabled={disabled} />
            )}
            {provider.category === "Model" && !loadingDynamicModels && subtypeOptions.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {dynamicModelSource === "dynamic" ? "Models loaded from provider API" : "Using built-in fallback model list"}
              </p>
            )}
          </FormField>
        )}
        {showProviderUrl && (
          <FormField label={getProviderUrlLabel(provider)} tooltip={i18next.t("general:Provider URL - Tooltip")} className="sm:col-span-2 lg:col-span-3">
            <FieldInput value={provider.providerUrl} onChange={(v) => update("providerUrl", v)} disabled={disabled} link />
          </FormField>
        )}
        {["Model", "Embedding"].includes(provider.category) && provider.type === "Azure" && (
          <FormField label={i18next.t("provider:API version")} tooltip={i18next.t("provider:API version - Tooltip")}>
            <DataListInput value={provider.apiVersion} options={getProviderAzureApiVersionOptions()} onChange={(v) => update("apiVersion", v)} disabled={disabled} />
          </FormField>
        )}
        {provider.type === "Cohere" && provider.category === "Embedding" && (
          <FormField label={i18next.t("provider:Input type")} tooltip={i18next.t("provider:Input type - Tooltip")}>
            <SelectField value={provider.clientId} options={["search_document", "search_query"].map((v) => ({ id: v, name: v }))} onChange={(v) => update("clientId", v)} disabled={disabled} />
          </FormField>
        )}
        {shouldShowClientId(provider) && (
          <FormField label={getClientIdLabel(provider)} tooltip={i18next.t("provider:Client ID - Tooltip")} className="sm:col-span-2 lg:col-span-3">
            <FieldInput value={provider.clientId} onChange={(v) => update("clientId", v)} disabled={disabled} />
          </FormField>
        )}
        {(provider.type === "Local" || provider.type === "Azure") && (
          <FormField label={provider.type === "Azure" ? i18next.t("provider:Billing reference model") : i18next.t("provider:Compatible provider")} tooltip={provider.type === "Azure" ? i18next.t("provider:Billing reference model - Tooltip") : i18next.t("provider:Compatible provider - Tooltip")}>
            <DataListInput value={provider.compatibleProvider} options={getCompatibleProviderOptions(provider.category) ?? []} onChange={(v) => update("compatibleProvider", v)} disabled={disabled} placeholder={provider.type === "Azure" ? "e.g. gpt-4o, gpt-5.4" : "Please select or enter the compatible provider"} />
          </FormField>
        )}
        {showPrice && (
          <>
            {provider.type === "Azure" && (
              <p className="col-span-full text-xs text-muted-foreground">
                Azure deployment names often differ from OpenAI-style model ids. Fill in the &quot;Billing reference model&quot; field above with the corresponding OpenAI model name (e.g. gpt-4o) for accurate usage pricing, or set custom input/output price per 1k tokens below.
              </p>
            )}
            <FormField label={i18next.t("provider:Input price / 1k tokens")} tooltip={i18next.t("provider:Input price / 1k tokens - Tooltip")}>
              <NumberInput value={provider.inputPricePerThousandTokens} onChange={(v) => update("inputPricePerThousandTokens", v)} min={0} />
            </FormField>
            <FormField label={i18next.t("provider:Output price / 1k tokens")} tooltip={i18next.t("provider:Output price / 1k tokens - Tooltip")}>
              <NumberInput value={provider.outputPricePerThousandTokens} onChange={(v) => update("outputPricePerThousandTokens", v)} min={0} />
            </FormField>
          </>
        )}
        {showEmbeddingPrice && (
          <FormField label={i18next.t("provider:Input price / 1k tokens")} tooltip={i18next.t("provider:Input price / 1k tokens - Tooltip")}>
            <NumberInput value={provider.inputPricePerThousandTokens} onChange={(v) => update("inputPricePerThousandTokens", v)} min={0} />
          </FormField>
        )}
        {showCurrency && (
          <FormField label={i18next.t("provider:Currency")} tooltip={i18next.t("provider:Currency - Tooltip")}>
            <SelectField value={provider.currency} options={CURRENCIES.map((c) => ({ id: c, name: c }))} onChange={(v) => update("currency", v)} disabled={disabled} />
          </FormField>
        )}
        {provider.category === "Text-to-Speech" && provider.type === "Alibaba Cloud" && provider.subType === "cosyvoice-v1" && (
          <FormField label={i18next.t("provider:Flavor")} tooltip={i18next.t("provider:Flavor - Tooltip")}>
            <SelectField value={provider.flavor} options={getTtsFlavorOptions(provider.type, provider.subType)} onChange={(v) => update("flavor", v)} disabled={disabled} />
          </FormField>
        )}
        {shouldShowClientSecret(provider) && (
          <FormField label={getClientSecretLabel(provider)} tooltip={i18next.t("provider:Client secret - Tooltip")} className="sm:col-span-2 lg:col-span-3">
            <FieldInput value={provider.clientSecret} onChange={(v) => update("clientSecret", v)} disabled={disabled} password />
          </FormField>
        )}
        {provider.category === "Model" && provider.type === "Claude" && getThinkingModelMaxTokens(provider.subType) !== 0 && (
          <>
            <FormField label={i18next.t("provider:Enable thinking")} tooltip={i18next.t("provider:Enable thinking - Tooltip")}>
              <div className="flex h-9 items-center"><Switch checked={!!provider.enableThinking} disabled={disabled} onCheckedChange={(v) => update("enableThinking", v)} /></div>
            </FormField>
            {provider.enableThinking && (
              <FormField label={i18next.t("provider:Thinking tokens")} tooltip={i18next.t("provider:Thinking tokens - Tooltip")}>
                <NumberInput value={provider.topK || 1024} onChange={(v) => update("topK", v)} min={1024} max={getThinkingModelMaxTokens(provider.subType) - 1} />
              </FormField>
            )}
          </>
        )}
        {provider.category === "Storage" && provider.type === "Alibaba Cloud OSS" && (
          <>
            <FormField label={i18next.t("general:Region")} tooltip={i18next.t("general:Region - Tooltip")}>
              <FieldInput value={provider.region} onChange={(v) => update("region", v)} disabled={disabled} />
            </FormField>
            <FormField label={i18next.t("provider:Bucket")} tooltip={i18next.t("provider:Bucket - Tooltip")}>
              <FieldInput value={provider.domain} onChange={(v) => update("domain", v)} disabled={disabled} />
            </FormField>
            <FormField label={i18next.t("provider:Endpoint")} tooltip={i18next.t("provider:Endpoint - Tooltip")}>
              <FieldInput value={provider.providerUrl} onChange={(v) => update("providerUrl", v)} disabled={disabled} />
            </FormField>
          </>
        )}
        {!["Storage", "Model", "Embedding", "Text-to-Speech", "Speech-to-Text"].includes(provider.category) && !(provider.category === "Blockchain" && provider.type === "Ethereum") && (
          <FormField label={getRegionLabel(provider)} tooltip={i18next.t("general:Region - Tooltip")} className="sm:col-span-2 lg:col-span-3">
            <FieldInput value={provider.region} onChange={(v) => update("region", v)} disabled={disabled} />
          </FormField>
        )}
        {provider.category === "Blockchain" && (
          <>
            <FormField label={getProviderUrlLabel(provider)} tooltip={i18next.t("general:Provider URL - Tooltip")} className="sm:col-span-2 lg:col-span-3">
              <FieldInput value={provider.providerUrl} onChange={(v) => update("providerUrl", v)} link />
            </FormField>
            {provider.type !== "Ethereum" && (
              <>
                <FormField label={i18next.t("provider:Chain")} tooltip={i18next.t("provider:Chain - Tooltip")}>
                  <FieldInput value={provider.chain} onChange={(v) => update("chain", v)} disabled={disabled} />
                </FormField>
                <FormField label={provider.type === "ChainMaker" ? i18next.t("general:Node address") : i18next.t("general:Network")} tooltip={i18next.t("general:Network - Tooltip")}>
                  <FieldInput value={provider.network} onChange={(v) => update("network", v)} disabled={disabled} />
                </FormField>
              </>
            )}
            {provider.type === "ChainMaker" && (
              <>
                <FormField label={i18next.t("provider:Auth type")} tooltip={i18next.t("provider:Auth type - Tooltip")}>
                  <SelectField value={provider.text} options={["permissionedwithcert", "permissionedwithkey", "public"].map((v) => ({ id: v, name: v }))} onChange={(v) => update("text", v)} disabled={disabled} />
                </FormField>
                <CopyDownloadTextarea label={i18next.t("cert:User cert")} value={provider.userCert} onChange={(v) => update("userCert", v)} filename="user_cert.pem" />
                <CopyDownloadTextarea label={i18next.t("cert:User key")} value={provider.userKey} onChange={(v) => update("userKey", v)} filename="token_jwt_key.key" />
                <CopyDownloadTextarea label={i18next.t("cert:Sign cert")} value={provider.signCert} onChange={(v) => update("signCert", v)} filename="user_cert.pem" />
                <CopyDownloadTextarea label={i18next.t("cert:Sign key")} value={provider.signKey} onChange={(v) => update("signKey", v)} filename="token_jwt_key.key" />
              </>
            )}
            {["Ethereum", "ChainMaker"].includes(provider.type) && (
              <>
                <FormField label={provider.type === "Ethereum" ? i18next.t("provider:Contract address") : i18next.t("provider:Contract name")} tooltip={i18next.t("provider:Contract name - Tooltip")}>
                  <FieldInput value={provider.contractName} onChange={(v) => update("contractName", v)} disabled={disabled} />
                </FormField>
                <FormField label={i18next.t("provider:Invoke method")} tooltip={i18next.t("provider:Invoke method - Tooltip")}>
                  <FieldInput value={provider.contractMethod} onChange={(v) => update("contractMethod", v)} disabled={disabled} />
                </FormField>
              </>
            )}
            <FormField label={i18next.t("provider:Browser URL")} tooltip={i18next.t("provider:Browser URL - Tooltip")} className="sm:col-span-2 lg:col-span-3">
              <FieldInput value={provider.browserUrl} onChange={(v) => update("browserUrl", v)} placeholder={provider.type === "ChainMaker" ? "https://explorer-testnet.chainmaker.org.cn/chainmaker_testnet_chain/block/{bh}" : ""} link />
            </FormField>
          </>
        )}
        <FormField label={i18next.t("store:Is default")} tooltip={i18next.t("store:Is default - Tooltip")}>
          <div className="flex h-9 items-center"><Switch checked={!!provider.isDefault} disabled={disabled} onCheckedChange={(v) => update("isDefault", v)} /></div>
        </FormField>
        <FormField label={i18next.t("provider:Is remote")} tooltip={i18next.t("provider:Is remote - Tooltip")}>
          <div className="flex h-9 items-center"><Switch checked={!!provider.isRemote} disabled /></div>
        </FormField>
        <FormField label={i18next.t("general:State")} tooltip={i18next.t("general:State - Tooltip")}>
          <SelectField value={provider.state} options={[{ id: "Active", name: i18next.t("general:Active") }, { id: "Inactive", name: i18next.t("general:Inactive") }]} onChange={(v) => update("state", v)} disabled={disabled} />
        </FormField>
        {provider.category === "Model" && (
          <FormField label={i18next.t("provider:Provider key")} tooltip={i18next.t("provider:Provider key - Tooltip")} className="sm:col-span-2 lg:col-span-3">
            <FieldInput value={provider.providerKey} onChange={(v) => update("providerKey", v)} disabled={!isAdminUser(account)} password />
          </FormField>
        )}
      </SectionCard>

      {provider.category === "Model" && (tempEnabled || topPEnabled || provider.type === "Gemini") && (
        <SectionCard title={i18next.t("provider:Advanced Model Parameters")}>
          {tempEnabled && (
            <FormField label={i18next.t("provider:Temperature")} tooltip={i18next.t("provider:Temperature - Tooltip")} className="sm:col-span-2 lg:col-span-3">
              <SliderNumber min={0} max={tempMax} step={0.01} value={provider.temperature} onChange={(v) => update("temperature", v)} disabled={disabled} />
            </FormField>
          )}
          {topPEnabled && (
            <FormField label={i18next.t("provider:Top P")} tooltip={i18next.t("provider:Top P - Tooltip")} className="sm:col-span-2 lg:col-span-3">
              <SliderNumber min={0} max={1} step={0.01} value={provider.topP} onChange={(v) => update("topP", v)} disabled={disabled} />
            </FormField>
          )}
          {tempEnabled && (
            <FormField label={i18next.t("provider:Presence penalty")} tooltip={i18next.t("provider:Presence penalty - Tooltip")}>
              <SliderNumber min={provider.type === "OpenAI" ? -2 : 1} max={2} step={0.01} value={provider.presencePenalty ?? 0} onChange={(v) => update("presencePenalty", v)} disabled={disabled} />
            </FormField>
          )}
          {topPEnabled && (
            <FormField label={i18next.t("provider:Frequency penalty")} tooltip={i18next.t("provider:Frequency penalty - Tooltip")}>
              <SliderNumber min={-2} max={2} step={0.01} value={provider.frequencyPenalty ?? 0} onChange={(v) => update("frequencyPenalty", v)} disabled={disabled} />
            </FormField>
          )}
          {provider.type === "Gemini" && (
            <FormField label={i18next.t("provider:Top K")} tooltip={i18next.t("provider:Top K - Tooltip")} className="sm:col-span-2 lg:col-span-3">
              <SliderNumber min={1} max={6} step={1} value={provider.topK} onChange={(v) => update("topK", v)} disabled={disabled} />
            </FormField>
          )}
        </SectionCard>
      )}

      <SectionCard title={i18next.t("provider:Provider Test")}>
        {provider.category === "Model" && (
          <FormField label={i18next.t("provider:Provider test")} tooltip={i18next.t("provider:Provider test - Tooltip")} className="sm:col-span-2 lg:col-span-3">
            <ModelTestWidget
              provider={provider}
              stableProviderName={stableModelProviderNameRef.current || originalProvider?.name || provider.name}
              beforeSend={saveIfChanged}
            />
          </FormField>
        )}
        {provider.category === "Embedding" && (
          <>
            <FormField label={i18next.t("provider:Provider test")} tooltip={i18next.t("provider:Provider test - Tooltip")} className="sm:col-span-2">
              <Textarea
                value={provider.testContent ?? ""}
                onChange={(e) => update("testContent", e.target.value)}
              />
            </FormField>
            <div className="flex items-end">
              <Button disabled={testing || !provider.testContent} onClick={testEmbedding}>
                {testing && <Loader2Icon className="h-4 w-4 animate-spin" />}
                {i18next.t("general:Refresh Vectors")}
              </Button>
            </div>
            {embeddingResult && (
              <FormField label={i18next.t("general:Data")} className="sm:col-span-2 lg:col-span-3">
                <Textarea className="min-h-24 font-mono text-xs" readOnly value={embeddingResult.join(", ")} />
              </FormField>
            )}
          </>
        )}
        {provider.category === "Text-to-Speech" && (
          <>
            <FormField label={i18next.t("provider:Provider test")} tooltip={i18next.t("provider:Provider test - Tooltip")} className="sm:col-span-2">
              <Textarea
                value={provider.testContent ?? ""}
                onChange={(e) => update("testContent", e.target.value)}
              />
            </FormField>
            <div className="flex items-end">
              <Button disabled={testing || !provider.testContent} onClick={testTts}>
                {testing ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <Volume2Icon className="h-4 w-4" />}
                {i18next.t("chat:Read it out")}
              </Button>
            </div>
          </>
        )}
      </SectionCard>

      {!isRemote && (
        <div className="mt-6 flex items-center gap-2">
          <Button onClick={() => save(false)} disabled={saving}>{saving && <Loader2Icon className="h-4 w-4 animate-spin" />}{i18next.t("general:Save")}</Button>
          <Button variant="outline" onClick={() => save(true)} disabled={saving}>{i18next.t("general:Save & Exit")}</Button>
          {isNewProvider && <Button variant="outline" onClick={cancel}>{i18next.t("general:Cancel")}</Button>}
        </div>
      )}
    </div>
  )
}
