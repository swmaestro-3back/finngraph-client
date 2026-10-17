import { getData } from '@/lib/api'
import type { StockCalendarRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useStockCalendar(ticker: string, from: string, to: string): ApiState<StockCalendarRes> {
  return useApi<StockCalendarRes>(
    () => getData<StockCalendarRes>(`/v1/stocks/${encodeURIComponent(ticker)}/calendar`, { from, to }),
    [ticker, from, to],
  )
}
