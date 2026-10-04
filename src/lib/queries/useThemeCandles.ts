import { getData } from '@/lib/api'
import type { ThemeIndexCandleRes } from '@/lib/apiTypes'
import { REFRESH_CACHE_TTL_MS } from '@/lib/autoRefresh'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

const THEME_CANDLE_LIMIT = 120

const cached = createTtlCache<ThemeIndexCandleRes[]>(REFRESH_CACHE_TTL_MS)

export function useThemeCandles(id: number | null, limit: number = THEME_CANDLE_LIMIT): ApiState<ThemeIndexCandleRes[]> {
  return useApi<ThemeIndexCandleRes[]>(
    () =>
      id === null
        ? Promise.resolve([])
        : cached(`${id}|${limit}`, () =>
            getData<ThemeIndexCandleRes[]>(`/v1/themes/${id}/candles`, { period: 'D', limit }),
          ),
    [id, limit],
  )
}
