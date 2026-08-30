import { getData } from '@/lib/api'
import type { StockRowRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useStocks(): ApiState<StockRowRes[]> {
  return useApi<StockRowRes[]>(() => getData<StockRowRes[]>('/v1/stocks'), [])
}
