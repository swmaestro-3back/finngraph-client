import { getData } from '@/lib/api'
import type { ThemeStockRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useThemeStocks(id: number | null): ApiState<ThemeStockRes[]> {
  return useApi<ThemeStockRes[]>(
    () =>
      id === null
        ? Promise.resolve([])
        : getData<ThemeStockRes[]>(`/v1/themes/${id}/stocks`),
    [id],
  )
}
