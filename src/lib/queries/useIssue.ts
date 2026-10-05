import { useMemo } from 'react'
import { getData } from '@/lib/api'
import type { IssueDetailRes, RelatedCompanyRes, StockRowRes } from '@/lib/apiTypes'
import type { IssueQuote } from '@/lib/fg/issueSubject'
import { useApi } from '@/lib/queries/useApi'
import { useKeyed, type KeyedState } from '@/lib/queries/useKeyed'
import { loadStocks } from '@/lib/queries/useStocksCached'

export function isIssueApiId(id: string): boolean {
  return /^[1-9]\d{0,17}$/.test(id)
}

export function loadIssue(id: string): Promise<IssueDetailRes> {
  return getData<IssueDetailRes>(`/v1/issues/${id}`)
}

export function useIssueDetail(id: string | null): KeyedState<IssueDetailRes> {
  return useKeyed(id !== null && isIssueApiId(id) ? id : null, loadIssue)
}

export interface IssueQuotes {
  quotes: ReadonlyMap<string, IssueQuote> | null
  retry: (() => void) | null
}

export function useIssueQuotes(enabled: boolean): IssueQuotes {
  const { data, error, refetch } = useApi<StockRowRes[] | null>(() => (enabled ? loadStocks() : Promise.resolve(null)), [enabled])
  const quotes = useMemo(() => (data ? new Map(data.map((s) => [s.ticker, s])) : null), [data])
  return { quotes, retry: enabled && error !== null ? refetch : null }
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
