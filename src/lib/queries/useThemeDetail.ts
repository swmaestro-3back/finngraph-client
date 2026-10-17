import { ApiError, getData } from '@/lib/api'
import type { ThemeRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useThemeDetail(id: number | null): ApiState<ThemeRes> {
  return useApi<ThemeRes>(
    () =>
      id === null
        ? Promise.reject(
            new ApiError('THEME_NOT_FOUND', 404, '테마 id가 올바르지 않습니다'),
          )
        : getData<ThemeRes>(`/v1/themes/${id}`),
    [id],
  )
}
