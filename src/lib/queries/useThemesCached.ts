import { useMemo } from 'react'
import { getData } from '@/lib/api'
import type { ThemeRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'
import { themeIdIndex, type ThemeIdIndex } from '@/lib/themeRoute'

let themesCache: Promise<ThemeRes[]> | null = null

export function loadThemes(): Promise<ThemeRes[]> {
  themesCache ??= getData<ThemeRes[]>('/v1/themes').catch((err: unknown) => {
    themesCache = null
    throw err
  })
  return themesCache
}

export function useThemesCached(): ApiState<ThemeRes[]> {
  return useApi<ThemeRes[]>(() => loadThemes(), [])
}

export function useThemeIdIndex(): ThemeIdIndex | null {
  const { data } = useThemesCached()
  return useMemo(() => (data ? themeIdIndex(data) : null), [data])
}
