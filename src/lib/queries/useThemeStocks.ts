import { getData } from '@/lib/api'
import type { ThemeStockRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useThemeStocks(name: string | null): ApiState<ThemeStockRes[]> {
  return useApi<ThemeStockRes[]>(
    () =>
      name === null
        ? Promise.resolve([])
        : getData<ThemeStockRes[]>(`/v1/themes/${encodeURIComponent(name)}/stocks`),
    [name],
  )
}
