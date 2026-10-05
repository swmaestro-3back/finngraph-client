import type { IssueCompanyRes, IssueSummaryRes, StockRowRes, ThemeIssuesRes, ThemeRes } from '@/lib/apiTypes'
import { week52Mark, week52Of, type Week52Row } from '@/lib/fg/stockQuote'
import { parseStockCode } from '@/lib/fg/stocks'
import { kstDayTime } from '@/lib/fg/themeNews'
import { parseThemeId } from '@/lib/fg/themes'
import { gapFromHigh, week52Position } from '@/lib/fg/week52'

export type HubTab = 'issues' | 'stocks' | 'themes'

export const DEFAULT_HUB_TAB: HubTab = 'stocks'

export const HUB_TABS: readonly { value: HubTab; label: string }[] = [
  { value: 'issues', label: '뜨는 이슈' },
  { value: 'stocks', label: '움직인 종목' },
  { value: 'themes', label: '움직인 테마' },
]

export const HUB_PARAM = { issues: 'issue', stocks: 'stock', themes: 'theme' } as const satisfies Record<HubTab, string>

export const HUB_ISSUE_LIMIT = 5
export const HUB_STOCK_LIMIT = 5
export const HUB_THEME_LIMIT = 5
export const HUB_HOT_COUNT = 10
export const HUB_THEME_STOCKS = 5
export const HUB_CHIPS = 3
export const HUB_INFERRED = 3
export const HUB_PAST_LIMIT = 3
export const MOVER_UNIVERSE = 300
export const HUB_INTERVAL_SEC = 8

export interface HubQuery {
  hub: HubTab
  issue: string | null
  stock: string | null
  theme: number | null
}

const ISSUE_ID = /^[1-9]\d{0,17}$/

export function parseHubTab(raw: string | null): HubTab {
  return HUB_TABS.find((tab) => tab.value === raw)?.value ?? DEFAULT_HUB_TAB
}

export function parseHubQuery(search: string): HubQuery {
  const params = new URLSearchParams(search)
  const issue = params.get(HUB_PARAM.issues)
  return {
    hub: parseHubTab(params.get('hub')),
    issue: issue && ISSUE_ID.test(issue) ? issue : null,
    stock: parseStockCode(params.get(HUB_PARAM.stocks)),
    theme: parseThemeId(params.get(HUB_PARAM.themes)),
  }
}

export function hubSearch(search: string, tab: HubTab, pick: string | number | null): string {
  const current = new URLSearchParams(search)
  const next = new URLSearchParams()
  if (tab !== DEFAULT_HUB_TAB) next.set('hub', tab)
  if (pick !== null) next.set(HUB_PARAM[tab], String(pick))
  const owned = new Set<string>(['hub', ...Object.values(HUB_PARAM)])
  for (const [key, value] of current) {
    if (!owned.has(key)) next.append(key, value)
  }
  const text = next.toString()
  return text ? `?${text}` : ''
}

export function pickMovers(rows: readonly StockRowRes[], universe = MOVER_UNIVERSE, count = HUB_STOCK_LIMIT): StockRowRes[] {
  const sized = rows
    .filter((row) => row.marketCap !== null && row.marketCap > 0)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, universe)
  return sized
    .filter((row) => row.change !== null && row.price !== null)
    .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0) || a.name.localeCompare(b.name, 'ko'))
    .slice(0, count)
}

export function pickHubThemes(hot: readonly ThemeRes[], count = HUB_THEME_LIMIT): ThemeRes[] {
  const ups = hot.filter((theme) => (theme.weightedChange ?? 0) > 0)
  const downs = hot.filter((theme) => (theme.weightedChange ?? 0) < 0)
  let upTake = Math.ceil(count / 2)
  let downTake = count - upTake
  if (downs.length < downTake) upTake += downTake - downs.length
  if (ups.length < upTake) downTake += upTake - ups.length
  const chosen = new Set([...ups.slice(0, upTake), ...downs.slice(0, downTake)].map((theme) => theme.id))
  return hot.filter((theme) => chosen.has(theme.id))
}

interface MoverRow {
  ticker: string
  name: string
  change: number | null
}

export function themeMovers<T extends MoverRow>(rows: readonly T[], themeChange: number | null, count = HUB_THEME_STOCKS): T[] {
  const sign = (themeChange ?? 0) < 0 ? -1 : 1
  return rows
    .filter((row) => row.change !== null)
    .sort((a, b) => sign * ((b.change ?? 0) - (a.change ?? 0)) || a.name.localeCompare(b.name, 'ko'))
    .slice(0, count)
}

export function coveragePct(media: number, max: number): number {
  if (max <= 0) return 0
  return Math.round((media / max) * 100)
}

export function nextAuto(sel: number, count: number, loop: boolean): { sel: number; stop: boolean } {
  const next = count > 0 ? (sel + 1) % count : 0
  if (next === 0 && !loop) return { sel: 0, stop: true }
  return { sel: next, stop: false }
}

export interface AutoState {
  stopped: boolean
  paused: boolean
}

export function toggleAuto(state: AutoState, running: boolean): AutoState {
  if (running) return { ...state, paused: true }
  return { stopped: false, paused: false }
}

interface AutoInput extends AutoState {
  enabled: boolean
  hover: boolean
  hidden: boolean
}

export function autoFlags({ enabled, stopped, paused, hover, hidden }: AutoInput) {
  const autoOn = enabled && !stopped
  const running = autoOn && !paused
  return { autoOn, running, playing: running && !hover && !hidden }
}

export function shortDay(day: string): string {
  return `${day.slice(5, 7)}.${day.slice(8, 10)}`
}

export function nodeDate(day: string, today: string): string {
  return day === today ? `오늘 · ${shortDay(day)}` : shortDay(day)
}

export function monthDayWord(day: string): string {
  return `${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일`
}

export interface HubFlow {
  count: number
  since: string
}

export function flowLabels(flow: HubFlow) {
  const since = monthDayWord(flow.since)
  return {
    badge: `이슈 ${flow.count}개째`,
    since: `${since}부터 이어진 흐름`,
    meta: `이슈 ${flow.count}개 · ${since}부터`,
    count: `이슈 ${flow.count}개`,
  }
}

export interface HubIssueNode {
  id: string
  title: string
  summary: string | null
  day: string
  media: number
}

export function splitTimeline<T extends HubIssueNode>(nodes: readonly T[]): { current: T; past: T[] } | null {
  if (nodes.length === 0) return null
  return { current: nodes[0], past: nodes.slice(1, 1 + HUB_PAST_LIMIT) }
}

interface CaptionInput {
  day: string | null
  autoSec: number | null
}

const AI_NOTE = '요약은 AI가 만들었어요'

export function hubCaption(tab: HubTab, { day, autoSec }: CaptionInput): string {
  if (tab === 'stocks') {
    return `오늘 등락률이 큰 종목을 펼치면, 그 종목이 나온 이슈를 타임라인으로 이어 왜 움직였는지 보여 줘요 · 시가총액 상위 ${MOVER_UNIVERSE}종목 기준 · ${AI_NOTE}`
  }
  if (tab === 'themes') {
    return `오늘 많이 움직인 테마를 펼치면, 테마 종목이 나온 이슈를 타임라인으로 이어 보여 줘요 · ${AI_NOTE}`
  }
  const parts = ['여러 매체가 다룬 기사를 이슈로 묶고, 이어지는 이슈를 타임라인으로 보여 줘요']
  if (day) parts.push(`${day} 보도한 매체가 많은 순`)
  if (autoSec !== null) parts.push(`${autoSec}초마다 다음 이슈로 넘어가고, 마우스를 올리면 멈춰요`)
  parts.push(AI_NOTE)
  return parts.join(' · ')
}

export interface HubIssueRef {
  id: string
  title: string
  media: number
}

export interface HubTimeline {
  flow: HubFlow | null
  nodes: HubIssueNode[]
}

export interface HubThemeIssues {
  count: number
  ids: readonly string[]
  top: HubIssueRef | null
}

export function issueTitle(item: Pick<IssueSummaryRes, 'title'>): string {
  return item.title?.trim() || '제목 없는 이슈'
}

export function issueRef(item: IssueSummaryRes): HubIssueRef {
  return { id: String(item.id), title: issueTitle(item), media: item.mediaCount }
}

export function issueNode(item: IssueSummaryRes, day: string | null = null): HubIssueNode {
  return {
    id: String(item.id),
    title: issueTitle(item),
    summary: item.summary?.trim() || null,
    day: day ?? kstDayTime(item.lastPublishedAt ?? item.firstPublishedAt ?? '')?.day ?? '',
    media: item.mediaCount,
  }
}

export function themeIssueSet(entry: ThemeIssuesRes | undefined): HubThemeIssues {
  const top = entry?.issues[0]
  return {
    count: entry?.issueCount ?? 0,
    ids: entry ? entry.issueIds.map(String) : [],
    top: top ? issueRef(top) : null,
  }
}

export interface HubQuoteExt {
  gapFromHigh: number
  position: number | null
  high: boolean
}

type QuoteRow = Pick<StockRowRes, 'price'> & Week52Row

export function quoteExtOf(row: QuoteRow | null | undefined, baseDate: string | null | undefined): HubQuoteExt | null {
  if (!row || row.price === null) return null
  const range = week52Of(row)
  if (range === null) return null
  return {
    gapFromHigh: gapFromHigh(row.price, range.high),
    position: week52Position({ price: row.price, high: range.high, low: range.low }),
    high: week52Mark(row, baseDate) === 'high',
  }
}

export interface HubIssueExtra {
  flow: HubFlow
  past: HubIssueNode[]
  inferred: number
}

export interface HubFixture {
  stockFlow: (ticker: string) => HubFlow
  issueExtra: (index: number) => HubIssueExtra
}

export interface HubIssueItem extends HubIssueNode {
  articles: number
  pct: number
  companies: readonly IssueCompanyRes[]
}

export function hubIssueItems(
  items: readonly IssueSummaryRes[],
  listDay: string | null,
  extra: IssueSummaryRes | null = null,
): HubIssueItem[] {
  const all = extra && !items.some((item) => item.id === extra.id) ? [...items, extra] : [...items]
  const max = all.reduce((top, item) => Math.max(top, item.mediaCount), 0)
  return all.map((item) => {
    const own = kstDayTime(item.lastPublishedAt ?? item.firstPublishedAt ?? '')?.day ?? ''
    return {
      id: String(item.id),
      title: issueTitle(item),
      summary: item.summary?.trim() || null,
      day: item === extra ? own : (listDay ?? own),
      media: item.mediaCount,
      articles: item.articleCount,
      pct: coveragePct(item.mediaCount, max),
      companies: item.companies,
    }
  })
}

export interface PanelStocks<T> {
  rep: T | null
  chips: T[]
  extra: number
  total: number
}

export function panelStocks<T>(stocks: readonly T[], total: number, chipLimit = HUB_CHIPS): PanelStocks<T> {
  const count = Math.max(total, stocks.length)
  const rep = stocks[0] ?? null
  const chips = stocks.slice(1, 1 + chipLimit)
  return { rep, chips, extra: Math.max(0, count - (rep ? 1 : 0) - chips.length), total: count }
}
