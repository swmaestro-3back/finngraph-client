import { getData } from '@/lib/api'
import type { RelatedCompanyRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'
import { isApiId } from '@/lib/queries/useNewsDetail'

export function useNewsCompanies(newsId: string | null): ApiState<RelatedCompanyRes[]> {
  return useApi<RelatedCompanyRes[]>(
    () =>
      newsId === null || !isApiId(newsId)
        ? Promise.resolve([])
        : getData<RelatedCompanyRes[]>(`/v1/news/${newsId}/companies`),
    [newsId],
  )
}
