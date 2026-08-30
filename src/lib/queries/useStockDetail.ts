import { getData } from '@/lib/api'
import type { StockDetailRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useStockDetail(ticker: string): ApiState<StockDetailRes> {
  return useApi<StockDetailRes>(() => getData<StockDetailRes>(`/v1/stocks/${ticker}`), [ticker])
}
