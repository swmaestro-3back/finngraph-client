import { getData } from '@/lib/api'
import type { ThemeRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useThemes(): ApiState<ThemeRes[]> {
  return useApi<ThemeRes[]>(() => getData<ThemeRes[]>('/v1/themes'), [])
}
