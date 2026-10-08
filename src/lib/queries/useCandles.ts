import { getData } from '@/lib/api'
import { CANDLE_COUNTS, type CandlePeriod, type CandleRes, type ThemeIndexCandleRes } from '@/lib/apiTypes'
import { REFRESH_CACHE_TTL_MS } from '@/lib/autoRefresh'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function fetchCandles(ticker: string, period: CandlePeriod, limit: number): Promise<CandleRes[]> {
  return getData<CandleRes[]>(`/v1/stocks/${ticker}/candles`, { period, limit })
}

/** limit을 주지 않으면 기간별 기본 개수(CANDLE_COUNTS)를 받는다 */
export function useCandles(
  ticker: string | null,
  period: CandlePeriod,
  limit: number = CANDLE_COUNTS[period],
): ApiState<CandleRes[]> {
  return useApi<CandleRes[]>(
    () => (ticker === null ? Promise.resolve([]) : fetchCandles(ticker, period, limit)),
    [ticker, period, limit],
  )
}

const cached = createTtlCache<CandleRes[]>(REFRESH_CACHE_TTL_MS)

/**
 * 캐시를 타는 캔들 — 여러 종목의 추이를 견주는 보조 차트(테마 대장주)가 쓴다.
 * 테마를 오가거나 대장주가 겹칠 때 같은 종목을 다시 받지 않는다.
 * 종목 상세의 주가 차트는 현재가와 나란히 보이므로 이쪽이 아니라 useCandles를 쓴다.
 */
export function useCandlesCached(
  ticker: string | null,
  period: CandlePeriod,
  limit: number = CANDLE_COUNTS[period],
): ApiState<CandleRes[]> {
  return useApi<CandleRes[]>(
    () =>
      ticker === null
        ? Promise.resolve([])
        : cached(`${ticker}|${period}|${limit}`, () => fetchCandles(ticker, period, limit)),
    [ticker, period, limit],
  )
}

export interface CandleSource {
  key: string
  load: (period: CandlePeriod, limit: number) => Promise<CandleRes[]>
}

export function stockCandleSource(ticker: string): CandleSource {
  return { key: `stock:${ticker}`, load: (period, limit) => fetchCandles(ticker, period, limit) }
}

export function themeCandleSource(id: number): CandleSource {
  return {
    key: `theme:${id}`,
    load: (period, limit) => getData<ThemeIndexCandleRes[]>(`/v1/themes/${id}/candles`, { period, limit }),
  }
}

export function useSourceCandles(source: CandleSource | null, period: CandlePeriod, limit: number): ApiState<CandleRes[]> {
  return useApi<CandleRes[]>(
    () => (source === null ? Promise.resolve([]) : source.load(period, limit)),
    [source?.key ?? null, period, limit],
  )
}
