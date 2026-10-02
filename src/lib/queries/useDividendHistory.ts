import { getData } from '@/lib/api'
import type { DividendReactionRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useDividendHistory(ticker: string): ApiState<DividendReactionRes[]> {
  return useApi<DividendReactionRes[]>(
    () => getData<DividendReactionRes[]>(`/v1/stocks/${encodeURIComponent(ticker)}/dividends`),
    [ticker],
  )
}
