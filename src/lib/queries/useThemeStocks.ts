import { getData } from '@/lib/api'
import type { ThemeStockRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function fetchThemeStocks(id: number): Promise<ThemeStockRes[]> {
  return getData<ThemeStockRes[]>(`/v1/themes/${id}/stocks`)
}

export function useThemeStocks(id: number | null): ApiState<ThemeStockRes[]> {
  return useApi<ThemeStockRes[]>(() => (id === null ? Promise.resolve([]) : fetchThemeStocks(id)), [id])
}
