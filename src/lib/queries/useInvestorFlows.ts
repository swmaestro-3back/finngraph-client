import { getData } from '@/lib/api'
import type { InvestorFlowRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

/** @param limit 최근 거래일 개수 (백엔드 1~250) */
export function useInvestorFlows(ticker: string, limit: number): ApiState<InvestorFlowRes[]> {
  return useApi<InvestorFlowRes[]>(
    () => getData<InvestorFlowRes[]>(`/v1/stocks/${ticker}/investor-flows?limit=${limit}`),
    [ticker, limit],
  )
}
