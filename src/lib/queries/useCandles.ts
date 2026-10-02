import { getData } from '@/lib/api'
import { CANDLE_COUNTS, type CandlePeriod, type CandleRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

/** limit을 주지 않으면 기간별 기본 개수(CANDLE_COUNTS)를 받는다 */
export function useCandles(
  ticker: string | null,
  period: CandlePeriod,
  limit: number = CANDLE_COUNTS[period],
): ApiState<CandleRes[]> {
  return useApi<CandleRes[]>(
    () =>
      ticker === null
        ? Promise.resolve([])
        : getData<CandleRes[]>(`/v1/stocks/${ticker}/candles`, {
            period,
            limit,
          }),
    [ticker, period, limit],
  )
}
