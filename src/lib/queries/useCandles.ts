import { getData } from '@/lib/api'
import { CANDLE_COUNTS, type CandlePeriod, type CandleRes } from '@/lib/apiTypes'
import { AUTO_REFRESH_MS } from '@/lib/autoRefresh'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

function fetchCandles(ticker: string, period: CandlePeriod, limit: number): Promise<CandleRes[]> {
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

// 시세 자동 갱신과 같은 주기 — 그보다 오래 묵은 캔들은 쓰지 않는다
const cached = createTtlCache<CandleRes[]>(AUTO_REFRESH_MS)

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
