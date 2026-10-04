import { getData } from '@/lib/api'
import type { ThemeIndexCandleRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

const THEME_CANDLE_LIMIT = 120

export function useThemeCandles(id: number | null): ApiState<ThemeIndexCandleRes[]> {
  return useApi<ThemeIndexCandleRes[]>(
    () =>
      id === null
        ? Promise.resolve([])
        : getData<ThemeIndexCandleRes[]>(`/v1/themes/${id}/candles`, { period: 'D', limit: THEME_CANDLE_LIMIT }),
    [id],
  )
}
