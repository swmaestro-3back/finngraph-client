import { getData } from '@/lib/api'
import type { CandleRes } from '@/lib/apiTypes'
import type { CandlePeriod } from '@/data/candles'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useCandles(ticker: string | null, period: CandlePeriod): ApiState<CandleRes[]> {
  return useApi<CandleRes[]>(
    () =>
      ticker === null
        ? Promise.resolve([])
        : getData<CandleRes[]>(`/v1/stocks/${ticker}/candles`, { period }),
    [ticker, period],
  )
}
