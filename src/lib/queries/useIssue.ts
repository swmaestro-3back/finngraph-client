import { getData, getPageMeta, type Pagination } from '@/lib/api'
import type {
  IssueDetailRes,
  IssueListMeta,
  IssueSort,
  IssueSummaryRes,
  RelatedCompanyRes,
} from '@/lib/apiTypes'
import type { IssueQuote } from '@/lib/fg/issueSubject'
import { useApi, type ApiState } from '@/lib/queries/useApi'
import { useKeyed, type KeyedState } from '@/lib/queries/useKeyed'
import { stockIndexOf, useStocksCached } from '@/lib/queries/useStocksCached'

export function isIssueApiId(id: string): boolean {
  return /^[1-9]\d{0,17}$/.test(id)
}

export function loadIssue(id: string): Promise<IssueDetailRes> {
  return getData<IssueDetailRes>(`/v1/issues/${id}`)
}

export function useIssueDetail(id: string | null): KeyedState<IssueDetailRes> {
  return useKeyed(id !== null && isIssueApiId(id) ? id : null, loadIssue)
}

export interface IssueListQuery {
  date: string | null
  sort: IssueSort
  page: number
  size: number
}

export interface IssueList {
  items: IssueSummaryRes[]
  pagination: Pagination
  meta: IssueListMeta | null
}

export function loadIssueList({ date, sort, page, size }: IssueListQuery): Promise<IssueList> {
  return getPageMeta<IssueSummaryRes, IssueListMeta>('/v1/issues', page, size, { sort, date: date ?? undefined })
}

export function useIssueList(query: IssueListQuery | null): ApiState<IssueList | null> {
  const date = query?.date ?? null
  const sort = query?.sort ?? 'media'
  const page = query?.page ?? 0
  const size = query?.size ?? 0
  const enabled = query !== null
  return useApi<IssueList | null>(
    () => (enabled ? loadIssueList({ date, sort, page, size }) : Promise.resolve(null)),
    [enabled, date, sort, page, size],
  )
}

export interface IssueQuotes {
  quotes: ReadonlyMap<string, IssueQuote> | null
  retry: (() => void) | null
}

export function useIssueQuotes(enabled: boolean): IssueQuotes {
  const { data, error, refetch } = useStocksCached(enabled)
  const quotes = stockIndexOf(data)
  return { quotes: enabled ? quotes : null, retry: enabled && error !== null ? refetch : null }
}

const companyCache = new Map<string, Promise<RelatedCompanyRes[]>>()

export function loadArticleCompanies(newsId: string): Promise<RelatedCompanyRes[]> {
  const hit = companyCache.get(newsId)
  if (hit) return hit
  const request = getData<RelatedCompanyRes[]>(`/v1/news/${newsId}/companies`).catch((e: unknown) => {
    companyCache.delete(newsId)
    throw e
  })
  companyCache.set(newsId, request)
  return request
}

export function useArticleCompanies(newsId: string | null): KeyedState<RelatedCompanyRes[]> {
  return useKeyed(newsId, loadArticleCompanies)
}

export function loadArticleCompaniesMany(joined: string): Promise<Map<string, RelatedCompanyRes[]>> {
  const ids = joined.split(',')
  return Promise.allSettled(ids.map((id) => loadArticleCompanies(id))).then((results) => {
    const found = new Map<string, RelatedCompanyRes[]>()
    for (const [i, result] of results.entries()) {
      if (result.status === 'rejected') throw result.reason
      found.set(ids[i], result.value)
    }
    return found
  })
}

export function useIssueArticleCompanies(newsIds: readonly string[] | null): KeyedState<Map<string, RelatedCompanyRes[]>> {
  const key = newsIds && newsIds.length > 0 ? newsIds.join(',') : null
  return useKeyed(key, loadArticleCompaniesMany)
}
