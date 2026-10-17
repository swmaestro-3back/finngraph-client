import { getData } from '@/lib/api'
import type { ThemeMarketRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useThemeMarket(): ApiState<ThemeMarketRes> {
  return useApi<ThemeMarketRes>(() => getData<ThemeMarketRes>('/v1/themes/market'), [])
}
