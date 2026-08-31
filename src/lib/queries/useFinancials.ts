import { getData } from '@/lib/api'
import { toAnnualFinancials } from '@/lib/apiMappers'
import type { AnnualFinancialsRes } from '@/lib/apiTypes'
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
