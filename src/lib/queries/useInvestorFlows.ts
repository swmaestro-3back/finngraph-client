import { getData } from '@/lib/api'
import type { InvestorFlowRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useInvestorFlows(ticker: string): ApiState<InvestorFlowRes[]> {
  return useApi<InvestorFlowRes[]>(
    () => getData<InvestorFlowRes[]>(`/v1/stocks/${ticker}/investor-flows`),
    [ticker],
  )
}
