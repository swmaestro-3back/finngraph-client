import type { InvestorFlowRes, StockDetailRes, StockRowRes, ThemeMarketRes, ThemeStockRes } from '@/lib/apiTypes'
import { splitSentences } from '@/lib/companyOverview'
import { marketLabel } from '@/lib/fg/format'
import { themeBasisLabel } from '@/lib/fg/themes'
import { calcSupplyStreaks, type SupplyStreak } from '@/lib/supplyStreak'

export type StockTab = 'overview' | 'news' | 'links' | 'finance'

export const STOCK_TABS: readonly { value: StockTab; label: string }[] = [
  { value: 'overview', label: '개요' },
  { value: 'news', label: '뉴스·이슈' },
  { value: 'links', label: '이어진 기업' },
  { value: 'finance', label: '재무·수급' },
]

export const STREAK_FLOW_DAYS = 20
export const MIN_COMPARE_MEMBERS = 3

function isStockTab(value: string | null): value is StockTab {
  return STOCK_TABS.some((tab) => tab.value === value)
}

function searchOf(params: URLSearchParams): string {
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function parseStockTab(search: string): StockTab {
  const value = new URLSearchParams(search).get('tab')
  return isStockTab(value) ? value : 'overview'
}

export function stockTabSearch(search: string, tab: StockTab): string {
  const params = new URLSearchParams(search)
  params.delete('issue')
  if (tab === 'overview') params.delete('tab')
  else params.set('tab', tab)
  return searchOf(params)
}

export function withIssue(search: string, key: string | null): string {
  const params = new URLSearchParams(search)
  if (key === null) params.delete('issue')
  else params.set('issue', key)
  return searchOf(params)
}

export interface NavState {
  from?: string
  sheet?: true
}

export function navState(state: unknown, sheet = false): NavState {
  const from = (state as { from?: unknown } | null)?.from
  return { ...(typeof from === 'string' ? { from } : {}), ...(sheet ? { sheet: true as const } : {}) }
}

export function sheetPushed(state: unknown): boolean {
  return (state as { sheet?: unknown } | null)?.sheet === true
}

export interface CapRank {
  market: string
  rank: number
}

type CapRow = Pick<StockRowRes, 'ticker' | 'market' | 'marketCap'>

export function marketCapRank(stocks: readonly CapRow[], ticker: string): CapRank | null {
  const me = stocks.find((stock) => stock.ticker === ticker)
  const cap = me?.marketCap ?? null
  if (!me || cap === null) return null
  const above = stocks.filter((stock) => stock.market === me.market && stock.marketCap !== null && stock.marketCap > cap)
  return { market: me.market, rank: above.length + 1 }
}

export function capRankLabel(rank: CapRank): string {
  return `${marketLabel(rank.market)} ${rank.rank}위`
}

export function median(values: readonly (number | null)[]): number | null {
  const sorted = values.filter((value): value is number => value !== null).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface ThemeCompare {
  count: number
  per: number | null
  pbr: number | null
  roe: number | null
  dividendYield: number | null
}

type CompareRow = Pick<StockRowRes, 'per' | 'pbr' | 'roe' | 'dividendYield'>

export function themeCompare(
  members: readonly Pick<ThemeStockRes, 'ticker'>[],
  index: ReadonlyMap<string, CompareRow>,
): ThemeCompare | null {
  if (members.length < MIN_COMPARE_MEMBERS) return null
  const rows = members.flatMap((member) => {
    const found = index.get(member.ticker)
    return found ? [found] : []
  })
  return {
    count: members.length,
    per: median(rows.map((r) => r.per)),
    pbr: median(rows.map((r) => r.pbr)),
    roe: median(rows.map((r) => r.roe)),
    dividendYield: median(rows.map((r) => r.dividendYield)),
  }
}

function streakLabel(who: string, streak: SupplyStreak): string | null {
  if (streak.direction === null || streak.days < 2) return null
  return `${who} ${streak.days}일 연속 ${streak.direction === 'buy' ? '순매수' : '순매도'}`
}

export function streakLabels(flows: readonly InvestorFlowRes[], tradingDays?: readonly string[]): string[] {
  const { foreign, institution } = calcSupplyStreaks([...flows], tradingDays)
  return [streakLabel('외국인', foreign), streakLabel('기관', institution)].filter(
    (label): label is string => label !== null,
  )
}

export function stockBasisLabel(
  stock: Pick<StockDetailRes, 'baseDate' | 'valuationDate'>,
  market: Pick<ThemeMarketRes, 'updatedAt'> | null,
): string | null {
  return themeBasisLabel({
    baseDate: stock.baseDate ?? null,
    valuationDate: stock.valuationDate ?? null,
    updatedAt: market?.updatedAt ?? null,
  })
}

export function isAiSummary(source: string | null): boolean {
  return source === 'DART_LLM'
}

export type LinkStrength = 1 | 2 | 3

export const STRENGTH_LABEL: Record<LinkStrength, string> = { 3: '높음', 2: '보통', 1: '낮음' }

export interface CompanySummary {
  lead: string
  rest: string[]
}

export function companySummary(description: string | null): CompanySummary | null {
  const text = description?.trim()
  if (!text) return null
  const [lead, ...rest] = splitSentences(text)
  return lead ? { lead, rest } : null
}
