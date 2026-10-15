import { getData } from '@/lib/api'
import { toAnnualFinancials } from '@/lib/apiMappers'
import type { AnnualFinancialsRes, QuarterlyFinancialsRes } from '@/lib/apiTypes'
import type { AnnualFinancials } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useFinancials(ticker: string): ApiState<AnnualFinancials[]> {
  return useApi<AnnualFinancials[]>(
    () =>
      getData<AnnualFinancialsRes[]>(`/v1/stocks/${ticker}/financials`).then((rows) =>
        rows.map(toAnnualFinancials),
      ),
    [ticker],
  )
}

export function useAnnualFinancials(ticker: string): ApiState<AnnualFinancialsRes[]> {
  return useApi<AnnualFinancialsRes[]>(() => getData<AnnualFinancialsRes[]>(`/v1/stocks/${ticker}/financials`), [ticker])
}

export const QUARTER_LIMIT = 8

export function useQuarterlyFinancials(ticker: string, limit = QUARTER_LIMIT): ApiState<QuarterlyFinancialsRes[]> {
  return useApi<QuarterlyFinancialsRes[]>(
    () => getData<QuarterlyFinancialsRes[]>(`/v1/stocks/${ticker}/financials/quarterly`, { limit }),
    [ticker, limit],
  )
}
