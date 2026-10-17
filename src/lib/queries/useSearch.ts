import { useCallback, useEffect, useRef, useState } from 'react'
import { getData } from '@/lib/api'
import type { SearchRes, StockRowRes, ThemeRes } from '@/lib/apiTypes'
import { loadStocks } from '@/lib/queries/useStocksCached'
import { loadThemes } from '@/lib/queries/useThemesCached'

export const SEARCH_LIMIT = 5
export const SEARCH_MAX_LENGTH = 50
export const SEARCH_DELAY_MS = 200

export function remoteQuery(raw: string): string | null {
  const q = raw.trim()
  return q.length > 0 && q.length <= SEARCH_MAX_LENGTH ? q : null
}

let inflight: { q: string; promise: Promise<SearchRes> } | null = null

export function loadSearch(q: string): Promise<SearchRes> {
  if (inflight?.q === q) return inflight.promise
  const promise = getData<SearchRes>('/v1/search', { q, limit: SEARCH_LIMIT })
  const entry = { q, promise }
  inflight = entry
  const clear = () => {
    if (inflight === entry) inflight = null
  }
  promise.then(clear, clear)
  return promise
}

export interface LocalSearchData {
  stocks: StockRowRes[]
  themes: ThemeRes[]
}

export function loadLocalSearch(): Promise<LocalSearchData> {
  return Promise.all([loadStocks(), loadThemes()]).then(([stocks, themes]) => ({ stocks, themes }))
}

export interface SearchDone {
  query: string
  data: SearchRes | null
}

export interface RemoteSearch {
  query: string | null
  done: SearchDone | null
  rush: (onArrive: (data: SearchRes) => void) => void
  cancel: () => void
}

interface Arrival {
  query: string
  onArrive: (data: SearchRes) => void
}

export function useRemoteSearch(raw: string): RemoteSearch {
  const query = remoteQuery(raw)
  const [done, setDone] = useState<SearchDone | null>(null)
  const [rushed, setRushed] = useState<string | null>(null)
  const arrival = useRef<Arrival | null>(null)
  const now = query !== null && rushed === query
  useEffect(() => {
    if (arrival.current?.query !== query) arrival.current = null
    if (query === null) return
    let alive = true
    const timer = window.setTimeout(
      () => {
        loadSearch(query).then(
          (data) => {
            if (!alive) return
            setDone({ query, data })
            const waiting = arrival.current
            arrival.current = null
            if (waiting?.query === query) waiting.onArrive(data)
          },
          () => {
            if (!alive) return
            arrival.current = null
            setDone({ query, data: null })
          },
        )
      },
      now ? 0 : SEARCH_DELAY_MS,
    )
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [query, now])
  const rush = useCallback(
    (onArrive: (data: SearchRes) => void) => {
      if (query === null) return
      arrival.current = { query, onArrive }
      setRushed(query)
    },
    [query],
  )
  const cancel = useCallback(() => {
    arrival.current = null
  }, [])
  return { query, done, rush, cancel }
}
