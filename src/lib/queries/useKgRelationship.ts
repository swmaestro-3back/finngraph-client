import { getKgData } from '@/lib/kgApi'
import type { KgRelationshipDetailRes } from '@/lib/kgApiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useKgRelationship(elementId: string): ApiState<KgRelationshipDetailRes> {
  return useApi<KgRelationshipDetailRes>(
    () => getKgData<KgRelationshipDetailRes>(`/v1/relationships/${encodeURIComponent(elementId)}`),
    [elementId],
  )
}
