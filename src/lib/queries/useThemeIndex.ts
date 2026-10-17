import { getData } from '@/lib/api'
import type { ThemeIndexRes } from '@/lib/apiTypes'
import { REFRESH_CACHE_TTL_MS } from '@/lib/autoRefresh'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

const cached = createTtlCache<ThemeIndexRes | null>(REFRESH_CACHE_TTL_MS)

function loadThemeIndex(id: number): Promise<ThemeIndexRes | null> {
  return cached(String(id), () => getData<ThemeIndexRes | null>(`/v1/themes/${id}/index`))
}

export function useThemeIndex(id: number | null): ApiState<ThemeIndexRes | null> {
  return useApi<ThemeIndexRes | null>(() => (id === null ? Promise.resolve(null) : loadThemeIndex(id)), [id])
}
