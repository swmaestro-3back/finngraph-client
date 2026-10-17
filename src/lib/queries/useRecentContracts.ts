import { getData } from '@/lib/api'
import type { RecentContractRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export type RecentContractSort = 'salesRatio' | 'contractAmount'

export function useRecentContracts(days: number, sort: RecentContractSort, limit = 20): ApiState<RecentContractRes[]> {
  return useApi<RecentContractRes[]>(
    () => getData<RecentContractRes[]>('/v1/contracts/recent', { days, sort, limit }),
    [days, sort, limit],
  )
}
