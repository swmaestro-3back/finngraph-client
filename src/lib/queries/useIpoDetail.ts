import { getData } from '@/lib/api'
import type { IpoDetailRes } from '@/lib/apiTypes'
import { ipoDetailParams, type IpoDetailTarget } from '@/lib/ipoDetail'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useIpoDetail(target: IpoDetailTarget): ApiState<IpoDetailRes> {
  return useApi<IpoDetailRes>(
    () => getData<IpoDetailRes>('/v1/ipos/detail', ipoDetailParams(target)),
    [target.corpCode, target.ticker],
  )
}
