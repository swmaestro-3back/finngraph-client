import { getData } from '@/lib/api'
import type { IpoListRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useIpos(): ApiState<IpoListRes> {
  return useApi<IpoListRes>(() => getData<IpoListRes>('/v1/ipos'), [])
}
