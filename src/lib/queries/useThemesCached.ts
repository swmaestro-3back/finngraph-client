import { useMemo } from 'react'
import { getData } from '@/lib/api'
import type { ThemeRes } from '@/lib/apiTypes'
import { AUTO_REFRESH_MS } from '@/lib/autoRefresh'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'
import { themeIdIndex, type ThemeIdIndex } from '@/lib/themeRoute'

// 전체 테마 목록도 전종목 목록과 같은 규칙이다 — 화면을 오갈 때는 쥐고 있고, 자동 갱신 주기가 지나면 새로 받는다
const cached = createTtlCache<ThemeRes[]>(AUTO_REFRESH_MS)

export function loadThemes(): Promise<ThemeRes[]> {
  return cached('all', () => getData<ThemeRes[]>('/v1/themes'))
}

export function useThemesCached(): ApiState<ThemeRes[]> {
  return useApi<ThemeRes[]>(() => loadThemes(), [])
}

export function useThemeIdIndex(): ThemeIdIndex | null {
  const { data } = useThemesCached()
  return useMemo(() => (data ? themeIdIndex(data) : null), [data])
}
