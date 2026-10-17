import { useEffect, useSyncExternalStore } from 'react'
import { ApiError, getData } from '@/lib/api'
import type { StockRowRes } from '@/lib/apiTypes'
import { AUTO_REFRESH_MS } from '@/lib/autoRefresh'
import type { ApiState } from '@/lib/queries/useApi'

interface StockList {
  data: StockRowRes[] | null
  error: ApiError | null
}

let list: StockList = { data: null, error: null }
let loadedAt = 0
let pending: Promise<StockRowRes[]> | null = null
const listeners = new Set<() => void>()
const indexes = new WeakMap<readonly StockRowRes[], ReadonlyMap<string, StockRowRes>>()

function publish(next: StockList) {
  list = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot(): StockList {
  return list
}

function request(silent: boolean): Promise<StockRowRes[]> {
  if (pending) return pending
  const next = getData<StockRowRes[]>('/v1/stocks').then(
    (rows) => {
      pending = null
      loadedAt = Date.now()
      publish({ data: rows, error: null })
      return rows
    },
    (e: unknown) => {
      pending = null
      const error = e instanceof ApiError ? e : new ApiError('INTERNAL_ERROR', 0, String(e))
      if (!(silent && list.data)) publish({ data: list.data, error })
      throw error
    },
  )
  pending = next
  return next
}

export function loadStocks(): Promise<StockRowRes[]> {
  if (list.data && Date.now() - loadedAt < AUTO_REFRESH_MS) return Promise.resolve(list.data)
  return request(list.data !== null)
}

export function refreshStocks(): void {
  request(true).catch(() => undefined)
}

function retryStocks(): void {
  if (pending) return
  publish({ data: list.data, error: null })
  request(false).catch(() => undefined)
}

function setStocks(rows: StockRowRes[]): void {
  loadedAt = Date.now()
  publish({ data: rows, error: null })
}

export function stockIndexOf(rows: readonly StockRowRes[] | null): ReadonlyMap<string, StockRowRes> | null {
  if (rows === null) return null
  const hit = indexes.get(rows)
  if (hit) return hit
  const index = new Map(rows.map((row) => [row.ticker, row]))
  indexes.set(rows, index)
  return index
}

export function useStocksCached(enabled = true): ApiState<StockRowRes[]> {
  const { data, error } = useSyncExternalStore(subscribe, snapshot)
  useEffect(() => {
    if (enabled) loadStocks().catch(() => undefined)
  }, [enabled])
  return {
    data,
    loading: enabled && data === null && error === null,
    error,
    refetch: retryStocks,
    refresh: refreshStocks,
    mutate: setStocks,
  }
}

export function useStockIndex(): ReadonlyMap<string, StockRowRes> | null {
  return stockIndexOf(useStocksCached().data)
}
