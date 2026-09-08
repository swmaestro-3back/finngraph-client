import { useMemo } from 'react'
import { getData } from '@/lib/api'
import type { StockRowRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

// 전종목 목록은 여러 화면(시장요약·상대비교·배지·호버카드)이 공유한다 — 모듈 캐시로 중복 fetch 방지
let stocksCache: Promise<StockRowRes[]> | null = null

// NavBar 검색 등 훅 밖에서도 같은 캐시를 타야 /v1/stocks 중복 fetch가 없다 — export로 공유
export function loadStocks(): Promise<StockRowRes[]> {
  stocksCache ??= getData<StockRowRes[]>('/v1/stocks').catch((err: unknown) => {
    stocksCache = null
    throw err
  })
  return stocksCache
}

export function useStocksCached(): ApiState<StockRowRes[]> {
  return useApi<StockRowRes[]>(() => loadStocks(), [])
}

/** ticker → 종목 행 인덱스. 로드 전에는 null */
export function useStockIndex(): Map<string, StockRowRes> | null {
  const { data } = useStocksCached()
  return useMemo(() => (data ? new Map(data.map((s) => [s.ticker, s])) : null), [data])
}
