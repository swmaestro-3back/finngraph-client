import { useMemo } from 'react'
import { getData } from '@/lib/api'
import type { ThemeRes } from '@/lib/apiTypes'
import { cachedLoader, useApi, type ApiState } from '@/lib/queries/useApi'
import { themeIdIndex, type ThemeIdIndex } from '@/lib/themeRoute'

const loadThemes = cachedLoader(() => getData<ThemeRes[]>('/v1/themes'))

export function useThemesCached(): ApiState<ThemeRes[]> {
  return useApi<ThemeRes[]>(() => loadThemes(), [])
}

export function useThemeIdIndex(): ThemeIdIndex | null {
  const { data } = useThemesCached()
  return useMemo(() => (data ? themeIdIndex(data) : null), [data])
}
