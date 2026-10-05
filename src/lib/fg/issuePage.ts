import { issuePath } from '@/lib/fg/paths'
import type { IssueBook, IssueLink, IssueRecord, IssueStock } from '@/lib/fg/issueRecords'
import { shortDate } from '@/lib/fg/stockIssues'
import { josa } from '@/lib/josa'

export type IssueTab = 'summary' | 'timeline' | 'articles' | 'stocks'

export const ISSUE_TABS: readonly { value: IssueTab; label: string }[] = [
  { value: 'summary', label: '요약' },
  { value: 'timeline', label: '타임라인' },
  { value: 'articles', label: '기사' },
  { value: 'stocks', label: '연결된 종목' },
]

const STOCKS_TAB_KEYS = ['from', 'type']

function isIssueTab(value: string | null): value is IssueTab {
  return ISSUE_TABS.some((tab) => tab.value === value)
}

export function parseIssueTab(search: string): IssueTab {
  const value = new URLSearchParams(search).get('tab')
  return isIssueTab(value) ? value : 'summary'
}

export function issueTabSearch(search: string, tab: IssueTab): string {
  const params = new URLSearchParams(search)
  if (tab !== 'stocks') for (const key of STOCKS_TAB_KEYS) params.delete(key)
  if (tab === 'summary') params.delete('tab')
  else params.set('tab', tab)
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function issueTabPath(id: string, tab: IssueTab): string {
  return `${issuePath(id)}${issueTabSearch('', tab)}`
}

export function monthDay(date: string): string {
  return `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`
}

export function chainRecords(record: IssueRecord, book: IssueBook): IssueRecord[] {
  const found = record.chain.flatMap((id) => {
    if (id === record.id) return [record]
    const hit = book.records.find((r) => r.id === id)
    return hit ? [hit] : []
  })
  return found.length > 0 ? found : [record]
}

export interface IssueHead {
  badge: string | null
  tone: 'issue' | 'neutral'
  media: string
  when: string
  since: string | null
  counts: Readonly<Record<Exclude<IssueTab, 'summary'>, number>>
  keywords: readonly string[]
}

export function issueHead(record: IssueRecord, book: IssueBook): IssueHead {
  const chain = chainRecords(record, book)
  const position = chain.findIndex((r) => r.id === record.id) + 1
  const linked = chain.length > 1
  return {
    badge: linked ? `이슈 ${position}개째` : '새 이슈',
    tone: linked ? 'issue' : 'neutral',
    media: `${record.media}개 매체`,
    when: `${record.date === book.today ? '오늘' : monthDay(record.date)} ${record.updated} 갱신`,
    since: linked ? `${monthDay(chain[0].date)}부터 이어진 흐름` : null,
    counts: {
      timeline: chain.length,
      articles: record.articles,
      stocks: record.stocks.length + record.links.length,
    },
    keywords: [],
  }
}

export function summaryCaption(record: Pick<IssueRecord, 'articles' | 'media'>): string {
  return `묶인 기사 ${record.articles}건 · ${record.media}개 매체로 만들었어요`
}

export const FLOW_WINDOW = 4

export interface FlowStep {
  id: string
  date: string
  title: string
  media: number
  pct: number
  now: boolean
}

export interface IssueFlowModel {
  steps: FlowStep[]
  position: number
  total: number
  subtitle: string
  subtitleShort: string
}

export const SINGLE_FLOW = '아직 이어진 이슈가 없어요. 비슷한 소식이 나오면 이 흐름에 이어 붙여요'

export function mediaTrend(from: number, to: number, short: boolean): string {
  if (from === to) return `${short ? '매체 수는' : '다루는 매체 수는'} ${to}곳으로 처음과 같아요.`
  return `${short ? '매체가' : '다루는 매체가'} ${from}곳에서 ${to}곳으로 ${to > from ? '늘었어요' : '줄었어요'}.`
}

export function windowStart(index: number, length: number, size: number): number {
  return Math.min(Math.max(0, index - (size - 1)), Math.max(0, length - size))
}

export function issueFlow(record: IssueRecord, book: IssueBook, size = FLOW_WINDOW): IssueFlowModel {
  const chain = chainRecords(record, book)
  const index = Math.max(0, chain.findIndex((r) => r.id === record.id))
  const start = windowStart(index, chain.length, size)
  const max = Math.max(...chain.map((r) => r.media), 1)
  const steps = chain.slice(start, start + size).map((r): FlowStep => {
    const now = r.id === record.id
    return {
      id: r.id,
      date: r.date === book.today ? `오늘 · ${shortDate(r.date)}` : shortDate(r.date),
      title: now ? r.shortTitle : r.title,
      media: r.media,
      pct: Math.round((r.media / max) * 100),
      now,
    }
  })
  const position = index + 1
  const first = chain[0]
  const lead = `${monthDay(first.date)} 처음 보도된`
  let subtitle = SINGLE_FLOW
  let subtitleShort = SINGLE_FLOW
  if (chain.length > 1 && position === 1) {
    subtitle = `${lead} 이슈예요. 이후 이슈 ${chain.length - 1}개가 이어졌어요.`
    subtitleShort = subtitle
  } else if (chain.length > 1) {
    const head = `${lead} 뒤 ${position}번째 이슈예요.`
    subtitle = `${head} ${mediaTrend(first.media, record.media, false)}`
    subtitleShort = `${head} ${mediaTrend(first.media, record.media, true)}`
  }
  return { steps, position, total: chain.length, subtitle, subtitleShort }
}

export function rankLinks(links: readonly IssueLink[]): IssueLink[] {
  return links
    .map((link, i) => ({ link, i }))
    .sort(
      (a, b) =>
        a.link.company.hops.length - b.link.company.hops.length ||
        b.link.company.strength - a.link.company.strength ||
        a.i - b.i,
    )
    .map(({ link }) => link)
}

export const RAIL_CHIPS = 3
export const RAIL_TOP = 3

export interface IssueRailModel {
  stocks: readonly IssueStock[]
  extra: number
  top: IssueLink[]
  inferred: number
  connected: number
}

export function issueRail(record: Pick<IssueRecord, 'stocks' | 'links'>): IssueRailModel {
  return {
    stocks: record.stocks,
    extra: Math.max(0, record.stocks.length - RAIL_CHIPS),
    top: rankLinks(record.links).slice(0, RAIL_TOP),
    inferred: record.links.length,
    connected: record.stocks.length + record.links.length,
  }
}

export function graphSentence(news: number, inferred: number): string {
  if (news === 0) return '이 이슈에는 뉴스에 나온 종목이 없어요.'
  if (inferred === 0) return `이 이슈에서 뉴스에 나온 종목 ${news}개로 이어져요.`
  return `이 이슈에서 뉴스에 나온 종목 ${news}개를 거쳐 이런 기업 ${inferred}곳으로 이어져요.`
}

export function clipLabel(text: string, max: number): string {
  const chars = [...text]
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text
}

export type GraphNodeKind = 'event' | 'news' | 'news-more' | 'link' | 'link-more' | 'second'

export interface GraphNode {
  key: string
  kind: GraphNodeKind
  x: number
  y: number
  w: number
  label: string
}

export interface GraphEdge {
  key: string
  kind: 'direct' | 'inferred'
  d: string
}

export interface IssueGraphModel {
  width: number
  height: number
  nodes: GraphNode[]
  edges: GraphEdge[]
  news: number
  inferred: number
  memberLabel: string
  guestLabel: string
}

const G = {
  width: 840,
  top: 40,
  step: 46,
  bottom: 34,
  gap: 36,
  minSlots: 3,
  maxNews: 3,
  maxRows: 6,
  event: { x: 16, w: 180, max: 12 },
  news: { x: 260, w: 116, max: 6 },
  link: { x: 480, w: 124, max: 7 },
  second: { x: 680, w: 112, max: 6 },
} as const

interface Row {
  key: string
  kind: 'link' | 'link-more'
  label: string
  name: string | null
}

interface Source {
  name: string
  rows: Row[]
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const mid = (x1 + x2) / 2
  return `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`
}

function bundleLabel(names: readonly string[]): string {
  return names.length > 1 ? `${names[0]} 외 ${names.length - 1}` : names[0]
}

export function issueGraph(record: Pick<IssueRecord, 'flowTitle' | 'stocks' | 'links'>): IssueGraphModel | null {
  const { stocks, flowTitle } = record
  if (stocks.length === 0) return null
  const ranked = rankLinks(record.links)
  const directOf = (name: string) => ranked.filter((l) => l.from === name && l.company.hops.length <= 1)
  const secondOf = (from: string, via: string) =>
    ranked.filter((l) => l.from === from && l.company.hops.length > 1 && l.company.hops[0].node === via)

  const withLinks = stocks.filter((s) => directOf(s.name).length > 0).map((s) => s.name)
  const quiet = stocks.filter((s) => !withLinks.includes(s.name)).map((s) => s.name)
  let sourceNames = withLinks.slice(0, G.maxNews)
  let others = [...withLinks.slice(G.maxNews), ...quiet]
  if (others.length > G.maxNews - sourceNames.length && sourceNames.length === G.maxNews) {
    sourceNames = withLinks.slice(0, G.maxNews - 1)
    others = [...withLinks.slice(G.maxNews - 1), ...quiet]
  }
  const room = G.maxNews - sourceNames.length
  const solo = others.length <= room ? others : others.slice(0, room - 1)
  const bundled = others.length <= room ? [] : others.slice(room - 1)

  let remaining = G.maxRows - sourceNames.length
  const sources: Source[] = sourceNames.map((name) => {
    const direct = directOf(name)
    const extra = Math.min(direct.length - 1, remaining)
    remaining -= extra
    const alloc = 1 + extra
    const shown = direct.length <= alloc ? direct : direct.slice(0, alloc - 1)
    const rows: Row[] = shown.map((l) => ({
      key: `l-${l.company.id}`,
      kind: 'link',
      label: clipLabel(l.company.name, G.link.max),
      name: l.company.name,
    }))
    if (direct.length > alloc) {
      rows.push({ key: `lm-${name}`, kind: 'link-more', label: `외 ${direct.length - shown.length}곳`, name: null })
    }
    return { name, rows }
  })

  const rowCount = sources.reduce((sum, s) => sum + s.rows.length, 0)
  const newsCount = solo.length + (bundled.length > 0 ? 1 : 0) + sources.length
  const slots = Math.max(rowCount, newsCount, G.minSlots)
  const height = G.top + (slots - 1) * G.step + G.bottom
  const eventY = height / 2
  const rowOffset = ((slots - rowCount) * G.step) / 2
  const rowY = (i: number) => G.top + rowOffset + i * G.step

  const nodes: GraphNode[] = [
    { key: 'event', kind: 'event', x: G.event.x, y: eventY, w: G.event.w, label: clipLabel(flowTitle, G.event.max) },
  ]
  const edges: GraphEdge[] = []

  let rowIndex = 0
  const placedRows = sources.map((source) =>
    source.rows.map((row) => ({ ...row, from: source.name, y: rowY(rowIndex++) })),
  )

  interface NewsItem {
    key: string
    kind: 'news' | 'news-more'
    label: string
    desired: number | null
  }
  const items: NewsItem[] = [
    ...solo.map((name): NewsItem => ({ key: `n-${name}`, kind: 'news', label: clipLabel(name, G.news.max), desired: null })),
    ...(bundled.length > 0
      ? [{ key: 'n-more', kind: 'news-more' as const, label: bundleLabel(bundled), desired: null }]
      : []),
    ...sources.map((source, i): NewsItem => {
      const ys = placedRows[i].map((row) => row.y)
      return {
        key: `n-${source.name}`,
        kind: 'news',
        label: clipLabel(source.name, G.news.max),
        desired: ys.reduce((sum, y) => sum + y, 0) / ys.length,
      }
    }),
  ]
  const newsOffset = rowCount === 0 ? ((slots - items.length) * G.step) / 2 : 0
  const ys: number[] = []
  items.forEach((item, i) => {
    const want = item.desired ?? G.top + newsOffset + i * G.step
    ys.push(i === 0 ? want : Math.max(want, ys[i - 1] + G.gap))
  })
  for (let i = ys.length - 1; i >= 0; i--) {
    const ceiling = i === ys.length - 1 ? height - G.bottom : ys[i + 1] - G.gap
    ys[i] = Math.min(ys[i], ceiling)
  }

  items.forEach((item, i) => {
    nodes.push({ key: item.key, kind: item.kind, x: G.news.x, y: ys[i], w: G.news.w, label: item.label })
    edges.push({ key: `e-${item.key}`, kind: 'direct', d: curve(G.event.x + G.event.w, eventY, G.news.x, ys[i]) })
  })

  const sourceY = new Map(sources.map((source, i) => [source.name, ys[items.length - sources.length + i]]))
  for (const rows of placedRows) {
    for (const row of rows) {
      nodes.push({ key: row.key, kind: row.kind, x: G.link.x, y: row.y, w: G.link.w, label: row.label })
      const from = sourceY.get(row.from) ?? eventY
      edges.push({ key: `e-${row.key}`, kind: 'inferred', d: curve(G.news.x + G.news.w, from, G.link.x, row.y) })
      if (row.name === null) continue
      const seconds = secondOf(row.from, row.name)
      if (seconds.length === 0) continue
      const names = seconds.map((l) => l.company.name)
      nodes.push({
        key: `s-${row.key}`,
        kind: 'second',
        x: G.second.x,
        y: row.y,
        w: G.second.w,
        label: names.length > 1 ? bundleLabel(names) : clipLabel(names[0], G.second.max),
      })
      edges.push({ key: `e-s-${row.key}`, kind: 'inferred', d: `M${G.link.x + G.link.w} ${row.y} L${G.second.x} ${row.y}` })
    }
  }

  const news = stocks.length
  const inferred = record.links.length
  const plain = `관계 그래프: ${flowTitle}에서 뉴스에 나온 종목 ${news}개로 이어져요`
  let memberLabel = plain
  if (inferred > 0 && sources.length > 0) {
    const names = sources.map((s) => s.name).join('·')
    const last = sources[sources.length - 1].name
    const via = sources.length === news ? `${names}${josa(last, '을/를')}` : `${names} 등 뉴스에 나온 종목 ${news}개를`
    memberLabel = `관계 그래프: ${flowTitle}에서 ${via} 거쳐 이런 기업 ${inferred}곳으로 이어져요`
  }
  return {
    width: G.width,
    height,
    nodes,
    edges,
    news,
    inferred,
    memberLabel,
    guestLabel: inferred > 0 ? `${plain}. 이런 기업은 로그인하면 볼 수 있어요` : plain,
  }
}
