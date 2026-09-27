import { getData } from '@/lib/api'
import type { StockContractRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useStockContracts(ticker: string | null): ApiState<StockContractRes[]> {
  return useApi<StockContractRes[]>(
    () =>
      ticker === null
        ? Promise.resolve([])
        : getData<StockContractRes[]>(`/v1/stocks/${ticker}/contracts`, { limit: 50 }),
    [ticker],
  )
}
