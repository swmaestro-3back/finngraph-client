import { useCallback, useMemo } from 'react'
import type { EvidenceView } from '@/components/fg/EvidenceSheet'
import { ApiError, getData } from '@/lib/api'
import type { IssueLink } from '@/lib/fg/issueRecords'
import {
  buildLinkedCompanies,
  EMPTY_LINK_GRAPH,
  evidencePairKey,
  firstHopCount,
  issueExclusion,
  issueLinkTickers,
  issueLinkUnion,
  issueStockTickers,
  pairRows,
  toLinkEvidence,
  withQuotes,
  type IssueLinkStock,
  type LinkGraph,
  type RelationEvidenceRes,
} from '@/lib/fg/linkedCompanies'
import type { LinkedCompany, LinkEvidence, LinkPair } from '@/lib/fg/stockLinks'
import { getKgData } from '@/lib/kgApi'
import type { KgCompanyRes, KgSupplyChainRes } from '@/lib/kgApiTypes'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useKeyed, type KeyedState } from '@/lib/queries/useKeyed'
import { stockIndexOf, useStocksCached } from '@/lib/queries/useStocksCached'

const LINK_TTL_MS = 5 * 60_000
const EVIDENCE_TTL_MS = 5 * 60_000

export const LINK_HOP = 2

const overviews = createTtlCache<KgCompanyRes | null>(LINK_TTL_MS)
const chains = createTtlCache<KgSupplyChainRes | null>(LINK_TTL_MS)
const evidences = createTtlCache<RelationEvidenceRes[]>(EVIDENCE_TTL_MS)

function missingAsNull<T>(request: Promise<T>): Promise<T | null> {
  return request.catch((e: unknown) => {
    if (e instanceof ApiError && e.isNotFound) return null
    throw e
  })
}

function companyPath(ticker: string): string {
  return `/v1/companies/${encodeURIComponent(ticker)}`
}

export function loadLinkOverview(ticker: string): Promise<KgCompanyRes | null> {
  return overviews(ticker, () => missingAsNull(getKgData<KgCompanyRes>(companyPath(ticker))))
}

export function loadLinkChain(ticker: string): Promise<KgSupplyChainRes | null> {
  return chains(ticker, () => missingAsNull(getKgData<KgSupplyChainRes>(`${companyPath(ticker)}/supplychain`, { hop: LINK_HOP })))
}

export function loadLinkGraph(ticker: string): Promise<LinkGraph> {
  return Promise.all([loadLinkOverview(ticker), loadLinkChain(ticker)]).then(([overview, chain]) => ({ overview, chain }))
}

export function loadLinkGraphs(tickers: readonly string[]): Promise<ReadonlyMap<string, LinkGraph>> {
  const unique = [...new Set(tickers)]
  return Promise.all(unique.map((ticker) => loadLinkGraph(ticker).then((graph) => [ticker, graph] as const))).then(
    (entries) => new Map(entries),
  )
}

export function loadLinkedCount(ticker: string): Promise<number> {
  return loadLinkOverview(ticker).then((overview) => firstHopCount({ ...EMPTY_LINK_GRAPH, overview }, ticker))
}

export function loadLinkedCounts(tickers: readonly string[]): Promise<ReadonlyMap<string, number>> {
  const unique = [...new Set(tickers)]
  return Promise.all(unique.map((ticker) => loadLinkedCount(ticker).then((count) => [ticker, count] as const))).then(
    (entries) => new Map(entries),
  )
}

export function useLinkGraph(ticker: string | null): KeyedState<LinkGraph> {
  return useKeyed(ticker, loadLinkGraph)
}

export function useLinkGraphs(tickers: readonly string[]): KeyedState<ReadonlyMap<string, LinkGraph>> {
  const key = [...new Set(tickers)].sort().join(',')
  return useKeyed(key === '' ? null : key, (joined) => loadLinkGraphs(joined.split(',')))
}

export interface LinkedCompaniesState {
  list: LinkedCompany[] | null
  loading: boolean
  error: ApiError | null
  retry: () => void
  quotesRetry: (() => void) | null
}

export function useLinkedCompanies(
  ticker: string | null,
  centerName: string | null,
  basisDate: string | null | undefined,
): LinkedCompaniesState {
  const graph = useLinkGraph(ticker)
  const stocks = useStocksCached(ticker !== null)
  const quotes = stockIndexOf(stocks.data)
  const base = useMemo(
    () => (graph.data && ticker && centerName ? buildLinkedCompanies(graph.data, ticker, centerName) : null),
    [graph.data, ticker, centerName],
  )
  const list = useMemo(() => (base ? withQuotes(base, quotes, basisDate) : null), [base, quotes, basisDate])
  return {
    list,
    loading: graph.loading,
    error: graph.error,
    retry: graph.retry,
    quotesRetry: stocks.error !== null && stocks.data === null ? stocks.refetch : null,
  }
}

export interface IssueLinksState {
  links: IssueLink[] | null
  firstHops: ReadonlyMap<string, number> | null
  error: ApiError | null
  retry: () => void
  quotesRetry: (() => void) | null
}

function stocksKey(stocks: readonly IssueLinkStock[] | null): string | null {
  return stocks ? JSON.stringify(stocks.map((stock) => [stock.name, stock.ticker])) : null
}

function parseStocks(key: string | null): IssueLinkStock[] | null {
  if (key === null) return null
  return (JSON.parse(key) as [string, string | null][]).map(([name, ticker]) => ({ name, ticker }))
}

export function useIssueLinks(stocks: readonly IssueLinkStock[] | null, basisDate: string | null | undefined): IssueLinksState {
  const key = stocksKey(stocks)
  const parsed = useMemo(() => parseStocks(key), [key])
  const sources = useMemo(() => (parsed ? issueLinkTickers(parsed) : []), [parsed])
  const all = useMemo(() => (parsed ? issueStockTickers(parsed) : []), [parsed])
  const graphs = useLinkGraphs(sources)
  const countKey = all.join(',')
  const counts = useKeyed(countKey === '' ? null : countKey, (joined) => loadLinkedCounts(joined.split(',')))
  const stockList = useStocksCached(parsed !== null)
  const quotes = stockIndexOf(stockList.data)

  const bases = useMemo(() => {
    if (!parsed) return null
    if (sources.length === 0) return []
    if (!graphs.data) return null
    const names = new Map(parsed.flatMap((stock) => (stock.ticker ? [[stock.ticker, stock.name] as const] : [])))
    return sources.map((ticker) => {
      const name = names.get(ticker) ?? ticker
      return { name, ticker, list: buildLinkedCompanies(graphs.data?.get(ticker) ?? EMPTY_LINK_GRAPH, ticker, name) }
    })
  }, [parsed, sources, graphs.data])

  const links = useMemo(
    () =>
      bases && parsed
        ? issueLinkUnion(
            bases.map((base) => ({ ...base, list: withQuotes(base.list, quotes, basisDate) })),
            issueExclusion(parsed),
          )
        : null,
    [bases, parsed, quotes, basisDate],
  )

  let firstHops: ReadonlyMap<string, number> | null = null
  if (parsed && all.length === 0) firstHops = new Map()
  else if (counts.data) firstHops = counts.data

  const retryGraphs = graphs.retry
  const retryCounts = counts.retry
  const graphError = graphs.error
  const countError = counts.error
  const retry = useCallback(() => {
    if (graphError) retryGraphs()
    if (countError) retryCounts()
  }, [graphError, countError, retryGraphs, retryCounts])

  return {
    links,
    firstHops,
    error: graphs.error ?? counts.error,
    retry,
    quotesRetry: stockList.error !== null && stockList.data === null ? stockList.refetch : null,
  }
}

export function loadRelationEvidence(pair: LinkPair): Promise<RelationEvidenceRes[]> {
  return evidences(evidencePairKey(pair), () =>
    getData<RelationEvidenceRes[]>('/v1/relations/evidence', { a: pair.a, b: pair.b, type: pair.type }),
  )
}

export function useRelationEvidence(pair: LinkPair | null, today: string): KeyedState<LinkEvidence[]> {
  const key = pair ? evidencePairKey(pair) : null
  const state = useKeyed(key, () => (pair ? loadRelationEvidence(pair) : Promise.resolve([])))
  const data = useMemo(
    () => (state.data && pair ? toLinkEvidence(pairRows(state.data, pair), today) : null),
    [state.data, pair, today],
  )
  return { ...state, data }
}

export function useEvidenceView(company: LinkedCompany | null, today: string): EvidenceView | null {
  const pair = company?.pair ?? null
  const state = useRelationEvidence(pair, today)
  if (pair === null) return null
  if (state.data) return { status: 'ready', items: state.data }
  if (state.error) return { status: 'error', retry: state.retry }
  return { status: 'loading' }
}
