import { getData } from '@/lib/api'
import type { ThemeRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useThemeDetail(id: number | null): ApiState<ThemeRes> {
  return useApi<ThemeRes>(
    () =>
      id === null
        ? Promise.reject(new Error('themeId가 없습니다'))
        : getData<ThemeRes>(`/v1/themes/${id}`),
    [id],
  )
}
