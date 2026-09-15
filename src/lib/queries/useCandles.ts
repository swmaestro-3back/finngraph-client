import { getData } from '@/lib/api'
import { CANDLE_COUNTS, type CandlePeriod, type CandleRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useCandles(ticker: string | null, period: CandlePeriod): ApiState<CandleRes[]> {
  return useApi<CandleRes[]>(
    () =>
      ticker === null
        ? Promise.resolve([])
        : getData<CandleRes[]>(`/v1/stocks/${ticker}/candles`, {
            period,
            limit: CANDLE_COUNTS[period],
          }),
    [ticker, period],
  )
}
