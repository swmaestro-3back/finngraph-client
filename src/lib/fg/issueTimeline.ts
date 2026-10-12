import type { IssueStoryCompanyRes, IssueTimelineNodeRes, IssueTimelineRes } from '@/lib/apiTypes'
import { chainRecords, mediaTrend, monthDay, SINGLE_FLOW, windowStart } from '@/lib/fg/issuePage'
import type { IssueArticleItem, IssueBook, IssueRecord, IssueStock } from '@/lib/fg/issueRecords'
import type { IssueQuote, LiveIssue } from '@/lib/fg/issueSubject'
import { shortDate } from '@/lib/fg/stockIssues'
import { kstDayTime } from '@/lib/fg/themeNews'

export type TimelineOrder = 'new' | 'old'

export const TIMELINE_ORDERS: readonly { value: TimelineOrder; label: string }[] = [
  { value: 'new', label: '최신순' },
  { value: 'old', label: '오래된 순' },
]

export const TIMELINE_LIMIT = 20
export const FREQUENT_LIMIT = 5
const STOCKS_SHOWN = 3
const DAY_MS = 86_400_000

export type TimelineTarget =
  | { kind: 'issue'; id: string }
  | { kind: 'news'; id: string }
  | { kind: 'url'; url: string }
  | null

export interface TimelineNode {
  key: string
  date: string
  badge: string | null
  meta: string
  title: string
  now: boolean
  target: TimelineTarget
  cov: { media: number; pct: number } | null
  summary: string | null
  stocks: string | null
  newsId: string | null
}

export interface GlanceStat {
  label: string
  value: string
}

export interface FrequentStock {
  name: string
  ticker: string | null
  change: number | null
  label: string
}

export interface TimelineModel {
  heading: string
  summaryLabel: string
  listLabel: string
  subtitle: string
  nodes: TimelineNode[]
  glanceTitle: string
  glance: GlanceStat[]
  glanceNote: string
  frequentTitle: string
  frequentNote: string
  frequent: FrequentStock[]
  footnote: string
}

export function stocksLine(names: readonly string[]): string | null {
  if (names.length === 0) return null
  const shown = names.slice(0, STOCKS_SHOWN).join(' · ')
  return names.length > STOCKS_SHOWN ? `${shown} 외 ${names.length - STOCKS_SHOWN}` : shown
}

export function leadSentences(text: string, count: number): string {
  const parts = text.trim().split(/(?<=[.!?])\s+/)
  return parts.slice(0, count).join(' ')
}

function orderLabel(order: TimelineOrder): string {
  return TIMELINE_ORDERS.find((o) => o.value === order)?.label ?? ''
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

function ordered<T>(oldestFirst: T[], order: TimelineOrder): T[] {
  return order === 'new' ? [...oldestFirst].reverse() : oldestFirst
}

function mockFrequent(record: IssueRecord, chain: readonly IssueRecord[]): FrequentStock[] {
  const latestFirst = [record, ...[...chain].reverse().filter((r) => r.id !== record.id)]
  const seen = new Map<string, { stock: IssueStock; rank: number }>()
  for (const r of latestFirst) {
    for (const stock of r.stocks) if (!seen.has(stock.name)) seen.set(stock.name, { stock, rank: seen.size })
  }
  const counts = new Map<string, number>()
  for (const r of chain) for (const name of new Set(r.stocks.map((s) => s.name))) counts.set(name, (counts.get(name) ?? 0) + 1)
  const total = chain.length
  return [...seen.values()]
    .map(({ stock, rank }) => ({ stock, rank, count: counts.get(stock.name) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.rank - b.rank)
    .slice(0, FREQUENT_LIMIT)
    .map(({ stock, count }) => ({
      name: stock.name,
      ticker: stock.ticker,
      change: stock.change,
      label: total > 1 && count === total ? `이슈 ${count}개 모두` : `이슈 ${count}개`,
    }))
}

export function mockTimeline(record: IssueRecord, book: IssueBook, order: TimelineOrder): TimelineModel {
  const chain = chainRecords(record, book)
  const index = Math.max(0, chain.findIndex((r) => r.id === record.id))
  const start = windowStart(index, chain.length, TIMELINE_LIMIT)
  const max = Math.max(...chain.map((r) => r.media), 1)
  const single = chain.length === 1
  const nodes = chain.slice(start, start + TIMELINE_LIMIT).map((r, i): TimelineNode => {
    const now = r.id === record.id
    let badge = `타임라인 ${start + i + 1}번째`
    if (now) badge = single ? '새 이슈' : '지금 보는 이슈'
    return {
      key: r.id,
      date: r.date === book.today ? `오늘 · ${shortDate(r.date)}` : shortDate(r.date),
      badge,
      meta: `${r.media}개 매체 · 기사 ${r.articles}건`,
      title: r.title,
      now,
      target: now ? null : { kind: 'issue', id: r.id },
      cov: { media: r.media, pct: Math.round((r.media / max) * 100) },
      summary: now ? leadSentences(r.detail, 2) : r.summary,
      stocks: stocksLine(r.stocks.map((s) => s.name)),
      newsId: null,
    }
  })
  const first = chain[0]
  const last = chain[chain.length - 1]
  const days = daysBetween(first.date, last.date)
  const heading = '이슈 타임라인'
  return {
    heading,
    summaryLabel: '요약',
    listLabel: `${heading}, ${orderLabel(order)}`,
    subtitle: single
      ? SINGLE_FLOW
      : `${monthDay(first.date)} 처음 보도된 뒤 ${days}일 동안 이슈 ${chain.length}개로 이어졌어요. ${mediaTrend(first.media, last.media, false)}`,
    nodes: ordered(nodes, order),
    glanceTitle: '흐름 한눈에',
    glance: [
      { label: '처음 보도', value: monthDay(first.date) },
      { label: '이어진 기간', value: days === 0 ? '하루' : `${days}일` },
      { label: '이슈', value: `${chain.length}개` },
      { label: '묶인 기사', value: `${chain.reduce((sum, r) => sum + r.articles, 0)}건` },
    ],
    glanceNote: `매체 수는 이슈마다 서로 다른 매체를 셌어요 · ${monthDay(book.today)} ${book.snapshot} 기준`,
    frequentTitle: '이 흐름에 자주 나온 종목',
    frequentNote: `이슈 ${chain.length}개 중 몇 번 나왔는지 · 오늘 등락`,
    frequent: mockFrequent(record, chain),
    footnote: '이전 이슈 제목을 누르면 그 이슈 페이지로 가요 · 타임라인은 최대 20개까지 보여 줘요',
  }
}

function minuteOf(article: IssueArticleItem): number | null {
  if (!article.day || !article.time) return null
  const [h, m] = article.time.split(':').map(Number)
  return Date.parse(`${article.day}T00:00:00Z`) / 60_000 + h * 60 + m
}

function byId(a: IssueArticleItem, b: IssueArticleItem): number {
  return a.id.localeCompare(b.id, 'en', { numeric: true })
}

export function byPublished(a: IssueArticleItem, b: IssueArticleItem): number {
  const x = minuteOf(a)
  const y = minuteOf(b)
  if (x === null || y === null) return x === y ? byId(a, b) : x === null ? 1 : -1
  return x - y || byId(a, b)
}

function nodeDay(node: IssueTimelineNodeRes): string | null {
  if (node.date) return node.date
  const at = node.firstPublishedAt ?? node.lastPublishedAt
  return at ? (kstDayTime(at)?.day ?? null) : null
}

function currentNode(subject: LiveIssue): IssueTimelineNodeRes {
  const first = subject.detail.firstPublishedAt
  return {
    issueId: subject.detail.id,
    title: subject.title,
    summary: subject.detail.summary,
    date: first ? (kstDayTime(first)?.day ?? null) : null,
    firstPublishedAt: first,
    lastPublishedAt: subject.detail.lastPublishedAt,
    current: true,
    mergedIssueIds: [subject.detail.id],
    articleCount: subject.articleCount,
    mediaCount: subject.media,
    companies: subject.detail.companies,
  }
}

function withCurrent(nodes: readonly IssueTimelineNodeRes[], current: IssueTimelineNodeRes): IssueTimelineNodeRes[] {
  const at = current.firstPublishedAt ? Date.parse(current.firstPublishedAt) : Number.POSITIVE_INFINITY
  const index = nodes.findIndex((node) => node.firstPublishedAt !== null && Date.parse(node.firstPublishedAt) < at)
  return index === -1 ? [...nodes, current] : [...nodes.slice(0, index), current, ...nodes.slice(index)]
}

function storyCompanies(story: IssueTimelineRes, extra: IssueTimelineNodeRes | null): IssueStoryCompanyRes[] {
  if (!extra) return story.companies
  const counts = new Map(story.companies.map((company) => [company.ticker, { ...company }]))
  for (const company of extra.companies) {
    const hit = counts.get(company.ticker)
    if (hit) hit.issueCount += 1
    else counts.set(company.ticker, { ticker: company.ticker, name: company.name, issueCount: 1 })
  }
  return [...counts.values()].sort((a, b) => b.issueCount - a.issueCount)
}

function storyFrequent(
  companies: readonly IssueStoryCompanyRes[],
  total: number,
  quotes: ReadonlyMap<string, IssueQuote> | null,
): FrequentStock[] {
  return companies.slice(0, FREQUENT_LIMIT).map((company) => ({
    name: company.name,
    ticker: company.ticker,
    change: quotes?.get(company.ticker)?.change ?? null,
    label: total > 1 && company.issueCount === total ? `이슈 ${company.issueCount}개 모두` : `이슈 ${company.issueCount}개`,
  }))
}

export function storyTimeline(
  subject: LiveIssue,
  story: IssueTimelineRes,
  quotes: ReadonlyMap<string, IssueQuote> | null,
  order: TimelineOrder,
): TimelineModel {
  const extra = story.nodes.some((node) => node.current) ? null : currentNode(subject)
  const chain = [...(extra ? withCurrent(story.nodes, extra) : story.nodes)].reverse()
  const max = Math.max(...chain.map((node) => node.mediaCount), 1)
  const single = chain.length === 1
  const nodes = chain.map((node): TimelineNode => {
    const day = nodeDay(node)
    let badge: string | null = null
    if (node.current) badge = single ? '새 이슈' : '지금 보는 이슈'
    return {
      key: String(node.issueId),
      date: day ? (day === subject.today ? `오늘 · ${shortDate(day)}` : shortDate(day)) : '날짜 미상',
      badge,
      meta: `${node.mediaCount}개 매체 · 기사 ${node.articleCount}건`,
      title: node.title.trim() || '제목 없는 이슈',
      now: node.current,
      target: node.current ? null : { kind: 'issue', id: String(node.issueId) },
      cov: { media: node.mediaCount, pct: Math.round((node.mediaCount / max) * 100) },
      summary: node.summary?.trim() || null,
      stocks: stocksLine(node.companies.map((company) => company.name)),
      newsId: null,
    }
  })
  const first = chain[0]
  const last = chain[chain.length - 1]
  const firstDay = nodeDay(first)
  const lastDay = nodeDay(last)
  const days = firstDay && lastDay ? daysBetween(firstDay, lastDay) : null
  const heading = '이슈 타임라인'
  const opening = firstDay ? `${monthDay(firstDay)} 처음 보도된 뒤 ` : ''
  const span = days === null ? '' : days === 0 ? '하루 동안 ' : `${days}일 동안 `
  return {
    heading,
    summaryLabel: '요약',
    listLabel: `${heading}, ${orderLabel(order)}`,
    subtitle: single
      ? SINGLE_FLOW
      : `${opening}${span}이슈 ${chain.length}개로 이어졌어요. ${mediaTrend(first.mediaCount, last.mediaCount, false)}`,
    nodes: ordered(nodes, order),
    glanceTitle: '흐름 한눈에',
    glance: [
      { label: '처음 보도', value: firstDay ? monthDay(firstDay) : '—' },
      { label: '이어진 기간', value: days === null ? '—' : days === 0 ? '하루' : `${days}일` },
      { label: '이슈', value: `${chain.length}개` },
      { label: '묶인 기사', value: `${chain.reduce((sum, node) => sum + node.articleCount, 0)}건` },
    ],
    glanceNote: '매체 수는 이슈마다 서로 다른 매체를 셌어요',
    frequentTitle: '이 흐름에 자주 나온 종목',
    frequentNote: `이슈 ${chain.length}개 중 몇 번 나왔는지 · 오늘 등락`,
    frequent: storyFrequent(storyCompanies(story, extra), chain.length, quotes),
    footnote: '다른 이슈 제목을 누르면 그 이슈 페이지로 가요 · 타임라인은 최대 20개까지 보여 줘요',
  }
}
