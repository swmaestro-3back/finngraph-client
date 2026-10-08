import { getData } from '@/lib/api'
import type { StockThemeCompareRes, StockThemeRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useStockThemes(ticker: string | null): ApiState<StockThemeRes[]> {
  return useApi<StockThemeRes[]>(
    () => (ticker === null ? Promise.resolve([]) : getData<StockThemeRes[]>(`/v1/stocks/${ticker}/themes`)),
    [ticker],
  )
}

export function useThemeCompare(ticker: string, themeId: number | null): ApiState<StockThemeCompareRes | null> {
  return useApi<StockThemeCompareRes | null>(
    () =>
      themeId === null
        ? Promise.resolve(null)
        : getData<StockThemeCompareRes>(`/v1/stocks/${ticker}/themes/${themeId}/compare`),
    [ticker, themeId],
  )
}
