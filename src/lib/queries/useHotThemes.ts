import { getData } from '@/lib/api'
import type { ThemeRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export const HOT_THEME_COUNTS = [10, 20, 30] as const

export function useHotThemes(count: number): ApiState<ThemeRes[]> {
  return useApi<ThemeRes[]>(
    () => getData<ThemeRes[]>(`/v1/themes/hot?count=${count}`),
    [count],
  )
}
