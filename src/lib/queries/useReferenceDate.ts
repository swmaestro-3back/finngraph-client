import { getData } from '@/lib/api'
import type { CandleRes } from '@/lib/apiTypes'
import { useApi } from '@/lib/queries/useApi'
import { lastTradingDate } from '@/lib/referenceDate'

export function useReferenceDate(ticker: string | null): string | null {
  const { data } = useApi<CandleRes[]>(
    () =>
      ticker === null
        ? Promise.resolve([])
        : getData<CandleRes[]>(`/v1/stocks/${ticker}/candles`, { period: 'D', limit: 1 }),
    [ticker],
  )
  return lastTradingDate(data)
}
