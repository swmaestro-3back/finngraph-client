import { chainRecords, mediaTrend, monthDay, SINGLE_FLOW, windowStart } from '@/lib/fg/issuePage'
import type { IssueArticleItem, IssueBook, IssueRecord, IssueStock } from '@/lib/fg/issueRecords'
import { dayWord, type LiveIssue } from '@/lib/fg/issueSubject'
import { shortDate } from '@/lib/fg/stockIssues'

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
    summaryLabel: 'AI 요약',
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

function spanText(first: IssueArticleItem, last: IssueArticleItem): string | null {
  const from = minuteOf(first)
  const to = minuteOf(last)
  if (from === null || to === null || to <= from) return null
  if (first.day !== last.day) return `${daysBetween(first.day ?? '', last.day ?? '')}일`
  const minutes = to - from
  return minutes < 60 ? `${minutes}분` : `${Math.floor(minutes / 60)}시간`
}

function stamp(article: IssueArticleItem, today: string): string | null {
  return article.day && article.time ? `${dayWord(article.day, today)} ${article.time}` : null
}

function liveFrequent(subject: LiveIssue): FrequentStock[] {
  const total = subject.articles.length
  return [...subject.stocks]
    .sort((a, b) => (b.mentions ?? 0) - (a.mentions ?? 0))
    .slice(0, FREQUENT_LIMIT)
    .map((stock) => {
      const count = stock.mentions ?? 0
      return {
        name: stock.name,
        ticker: stock.ticker,
        change: stock.change,
        label: total > 1 && count === total ? `기사 ${count}건 모두` : `기사 ${count}건`,
      }
    })
}

function liveSubtitle(sorted: readonly IssueArticleItem[], subject: LiveIssue): string {
  const n = sorted.length
  const dated = sorted.filter((a) => minuteOf(a) !== null)
  const media = `${subject.media}개 매체가 다뤘어요.`
  if (dated.length === 0) return `기사 ${n}건이 묶였어요. ${media}`
  const first = dated[0]
  const when = stamp(first, subject.today)
  if (n === 1) return `${when} ${first.press}에서 처음 보도했어요. 아직 이어진 기사가 없어요.`
  const span = spanText(first, dated[dated.length - 1])
  if (span === null) return `${when}에 기사 ${n}건이 함께 나왔어요. ${media}`
  return `${when} 처음 보도된 뒤 ${span} 동안 기사 ${n}건이 이어졌어요. ${media}`
}

export function liveTimeline(subject: LiveIssue, order: TimelineOrder): TimelineModel {
  const sorted = [...subject.articles].sort(byPublished)
  const rep = subject.representative?.id ?? null
  const nodes = sorted.map((article, i): TimelineNode => {
    const now = article.id === rep
    let badge = i === 0 ? '처음 보도' : `${i + 1}번째 보도`
    if (now) badge = '대표 기사'
    const day = article.day ? (article.day === subject.today ? '오늘' : shortDate(article.day)) : null
    let target: TimelineTarget = null
    if (article.analyzed) target = { kind: 'news', id: article.id }
    else if (article.url) target = { kind: 'url', url: article.url }
    return {
      key: article.id,
      date: day && article.time ? `${day} ${article.time}` : '시각 미상',
      badge,
      meta: article.press,
      title: article.title,
      now,
      target,
      cov: null,
      summary: article.summary,
      stocks: null,
      newsId: article.id,
    }
  })
  const dated = sorted.filter((a) => minuteOf(a) !== null)
  const span = dated.length > 1 ? spanText(dated[0], dated[dated.length - 1]) : null
  const heading = '보도 타임라인'
  return {
    heading,
    summaryLabel: '기사 요약',
    listLabel: `${heading}, ${orderLabel(order)}`,
    subtitle: liveSubtitle(sorted, subject),
    nodes: ordered(nodes, order),
    glanceTitle: '보도 한눈에',
    glance: [
      { label: '처음 보도', value: dated[0] ? (stamp(dated[0], subject.today) ?? '—') : '—' },
      { label: '이어진 기간', value: span ?? '—' },
      { label: '매체', value: `${subject.media}곳` },
      { label: '묶인 기사', value: `${sorted.length}건` },
    ],
    glanceNote: '매체는 기사 원문 주소로 셌어요',
    frequentTitle: '이 이슈에 자주 나온 종목',
    frequentNote: `기사 ${sorted.length}건 중 몇 건에 나왔는지 · 오늘 등락`,
    frequent: liveFrequent(subject),
    footnote: '기사 제목을 누르면 기사 분석을 보여 드려요 · 원문은 각 매체 사이트에서 열려요',
  }
}
