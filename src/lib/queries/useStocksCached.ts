import { getData } from '@/lib/api'
import type { StockRowRes } from '@/lib/apiTypes'
import { cachedLoader, useApi, type ApiState } from '@/lib/queries/useApi'

// 전종목 목록은 여러 화면(시장요약·상대비교·배지·호버카드)이 공유한다 — 모듈 캐시로 중복 fetch 방지.
// NavBar 검색 등 훅 밖에서도 같은 캐시를 타야 /v1/stocks 중복 fetch가 없다 — export로 공유
export const loadStocks = cachedLoader(() => getData<StockRowRes[]>('/v1/stocks'))

export function useStocksCached(): ApiState<StockRowRes[]> {
  return useApi<StockRowRes[]>(() => loadStocks(), [])
}

// 같은 응답 배열에는 같은 인덱스 — 행마다 쓰는 호버카드가 3천 건 Map을 제각기 만들지 않게 모듈에서 한 번만 만든다
const indexCache = new WeakMap<StockRowRes[], Map<string, StockRowRes>>()

function indexOf(rows: StockRowRes[]): Map<string, StockRowRes> {
  let index = indexCache.get(rows)
  if (!index) {
    index = new Map(rows.map((s) => [s.ticker, s]))
    indexCache.set(rows, index)
  }
  return index
}

/** ticker → 종목 행 인덱스. 로드 전에는 null */
export function useStockIndex(): Map<string, StockRowRes> | null {
  const { data } = useStocksCached()
  return data ? indexOf(data) : null
}
