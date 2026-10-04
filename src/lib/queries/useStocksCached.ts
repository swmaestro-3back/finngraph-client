import { useMemo } from 'react'
import { getData } from '@/lib/api'
import type { StockRowRes } from '@/lib/apiTypes'
import { AUTO_REFRESH_MS } from '@/lib/autoRefresh'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

// 전종목 목록은 여러 화면(주식 목록·그래프·상대비교·호버카드)이 공유한다 — 화면을 오갈 때마다 수백 KB를 다시 받지 않게 쥐고 있되,
// 시세가 담겨 있으므로 자동 갱신과 같은 주기가 지나면 다음 진입 때 새로 받는다
const cached = createTtlCache<StockRowRes[]>(AUTO_REFRESH_MS)

// NavBar 검색 등 훅 밖에서도 같은 캐시를 타야 /v1/stocks 중복 fetch가 없다 — export로 공유
export function loadStocks(): Promise<StockRowRes[]> {
  return cached('all', () => getData<StockRowRes[]>('/v1/stocks'))
}

export function useStocksCached(): ApiState<StockRowRes[]> {
  return useApi<StockRowRes[]>(() => loadStocks(), [])
}

/** ticker → 종목 행 인덱스. 로드 전에는 null */
export function useStockIndex(): Map<string, StockRowRes> | null {
  const { data } = useStocksCached()
  return useMemo(() => (data ? new Map(data.map((s) => [s.ticker, s])) : null), [data])
}
