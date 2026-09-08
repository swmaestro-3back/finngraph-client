import { getPage } from '@/lib/api'
import type { NewsRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

// 무버 카드 그리드가 종목마다 이 훅을 부른다 — 모듈 캐시로 종목당 1회만 fetch
const newsCache = new Map<string, Promise<NewsRes[]>>()

// 뉴스 응답의 정렬이 보장되지 않으므로(StockDetailPage의 latestNews와 같은 근거)
// 발행(없으면 수집) 시각 기준 최신순으로 맞춰 캐시한다. 날짜가 없거나 깨진 항목은 뒤로 보낸다.
// 단, size=5 페이지 내 정렬이라 전역 최신은 서버 정렬 계약이 생겨야 보장된다.
function newsTime(n: NewsRes): number {
  const t = new Date(n.publishedAt ?? n.collectedAt ?? '').getTime()
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
}

function loadFirstPage(ticker: string): Promise<NewsRes[]> {
  const cached = newsCache.get(ticker)
  if (cached) return cached
  const promise = getPage<NewsRes>(`/v1/stocks/${ticker}/news`, 0, 5)
    .then((page) => [...page.items].sort((a, b) => newsTime(b) - newsTime(a)))
    .catch((err: unknown) => {
      newsCache.delete(ticker)
      throw err
    })
  newsCache.set(ticker, promise)
  return promise
}

export function useStockNewsCached(ticker: string): ApiState<NewsRes[]> {
  return useApi<NewsRes[]>(() => loadFirstPage(ticker), [ticker])
}
