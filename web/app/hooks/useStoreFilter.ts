import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router"

function readStore(): string | undefined {
  try {
    const v = localStorage.getItem("store")
    return v && v !== "All" ? v : undefined
  } catch {
    return undefined
  }
}

function storeFromRouteParams(storeName: string | undefined): string | undefined {
  return storeName && storeName !== "" ? storeName : undefined
}

export function useStoreFilter(): string | undefined {
  const { storeName } = useParams()
  const routeStore = storeFromRouteParams(storeName)
  const [store, setStore] = useState(() => routeStore ?? readStore())

  const sync = useCallback(() => {
    setStore(routeStore ?? readStore())
  }, [routeStore])

  useEffect(() => {
    window.addEventListener("globalStoreChanged", sync)

    function handleStorage(e: StorageEvent) {
      if (e.key === "store") sync()
    }
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener("globalStoreChanged", sync)
      window.removeEventListener("storage", handleStorage)
    }
  }, [sync])

  return store
}
