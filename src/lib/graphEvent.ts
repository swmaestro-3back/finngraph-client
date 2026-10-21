// 이벤트(뉴스 클러스터) 노드의 data를 읽고 사람이 읽는 문자열로 바꾼다 — 캔버스 툴팁과 상세 패널이 함께 쓴다.

import { endId, isEventLink, type GraphData, type GraphLink, type GraphNode } from '@/data/graphTypes'
import { issuePath } from '@/lib/fg/paths'
import type { KgEventDetailRes } from '@/lib/kgApiTypes'

export interface EventInfo {
  keywords: string[]
  /** 뉴스 건수 */
  newsCount: number | null
  firstPublishedAt: string | null
  lastPublishedAt: string | null
  representativeNewsId: number | null
}

/** GraphNode.data의 선택 필드를 확정된 형태로 — 소비자가 undefined 분기를 반복하지 않도록 */
export function eventInfo(node: GraphNode): EventInfo {
  const d = node.data
  return {
    keywords: d.keywords ?? [],
    newsCount: d.newsCount ?? null,
    firstPublishedAt: d.firstPublishedAt ?? null,
    lastPublishedAt: d.lastPublishedAt ?? null,
    representativeNewsId: d.representativeNewsId ?? null,
  }
}

function toDate(iso: string): string {
  return iso.slice(0, 10)
}

/** 첫 보도 ~ 마지막 보도. 같은 날이면 하루만, 하나만 있으면 그것만 */
export function eventPeriod(first: string | null, last: string | null): string {
  const a = first ? toDate(first) : null
  const b = last ? toDate(last) : null
  if (a && b) return a === b ? a : `${a} ~ ${b}`
  return a ?? b ?? ''
}

/** 캔버스 툴팁 둘째 줄 */
export function eventSubtitle(node: GraphNode): string {
  const info = eventInfo(node)
  const parts: string[] = []
  if (info.newsCount != null) parts.push(`뉴스 ${info.newsCount}건`)
  const period = eventPeriod(info.firstPublishedAt, info.lastPublishedAt)
  if (period) parts.push(period)
  return parts.length ? parts.join(' · ') : '이벤트'
}

/** 이벤트는 곧 이슈다 — KG의 cluster_id와 이슈 API의 id가 같은 번호 체계라 상세 페이지로 바로 이어진다 */
export function eventIssuePath(node: GraphNode): string | null {
  const clusterId = node.data.clusterId
  return clusterId != null ? issuePath(clusterId) : null
}

export interface EventArticle {
  id: string
  title: string
  url: string | null
  publishedAt: string | null
}

/** 이벤트 상세의 기사 → 타임라인 행. 위에서 아래로 보도가 이어지도록 오래된 순 */
export function eventArticles(res: KgEventDetailRes): EventArticle[] {
  return res.news
    .map((n) => ({
      id: n.news_id,
      title: n.title ?? '(제목 없음)',
      url: n.original_url || n.url,
      publishedAt: n.published_at,
    }))
    .sort((a, b) => (a.publishedAt ?? '').localeCompare(b.publishedAt ?? ''))
}

/** 타임라인 아래 안내 — 서버는 분석된 기사만 준다. 다 보여주면 null */
export function eventArticlesNote(shown: number, total: number): string | null {
  if (total <= shown) return null
  if (shown === 0) return `기사 ${total}건이 아직 분석되지 않아 제목을 불러오지 못했습니다.`
  return `분석된 기사 ${shown}건만 보여줍니다. 전체 ${total}건.`
}

/** 그래프의 기업 노드 색인 — 이벤트 상세의 언급 기업을 노드로 잇는다 */
export interface CompanyIndex {
  byTicker: Map<string, GraphNode>
  /** 동명이면 먼저 온 노드(중심에 가까운 쪽) */
  byName: Map<string, GraphNode>
}

export function indexCompanies(nodes: readonly GraphNode[]): CompanyIndex {
  const byTicker = new Map<string, GraphNode>()
  const byName = new Map<string, GraphNode>()
  nodes.forEach((n) => {
    if (n.type !== 'company') return
    if (n.data.ticker && !byTicker.has(n.data.ticker)) byTicker.set(n.data.ticker, n)
    if (!byName.has(n.label)) byName.set(n.label, n)
  })
  return { byTicker, byName }
}

/** 티커가 있으면 티커로(동명 기업·이름 없는 노드도 정확히), 없으면 이름으로 */
export function findCompanyNode(
  index: CompanyIndex,
  company: { name: string; ticker: string | null },
): GraphNode | undefined {
  return (company.ticker ? index.byTicker.get(company.ticker) : undefined) ?? index.byName.get(company.name)
}

export function mergeSameEvents(data: GraphData, leads: ReadonlyMap<number, number>): GraphData {
  const groups = new Map<number, GraphNode[]>()
  data.nodes.forEach((n) => {
    const cluster = n.type === 'event' ? n.data.clusterId : undefined
    if (cluster == null) return
    const lead = leads.get(cluster) ?? cluster
    groups.set(lead, [...(groups.get(lead) ?? []), n])
  })
  const replaced = new Map<string, string>()
  const keepers = new Map<string, GraphNode>()
  groups.forEach((members, lead) => {
    if (members.length < 2) return
    const keeper =
      members.find((n) => n.data.clusterId === lead) ??
      [...members].sort((a, b) => (b.data.newsCount ?? 0) - (a.data.newsCount ?? 0))[0]
    const firsts = members.flatMap((n) => (n.data.firstPublishedAt ? [n.data.firstPublishedAt] : [])).sort()
    const lasts = members.flatMap((n) => (n.data.lastPublishedAt ? [n.data.lastPublishedAt] : [])).sort()
    const counts = members.flatMap((n) => (n.data.newsCount != null ? [n.data.newsCount] : []))
    keepers.set(keeper.id, {
      ...keeper,
      data: {
        ...keeper.data,
        firstPublishedAt: firsts[0] ?? keeper.data.firstPublishedAt,
        lastPublishedAt: lasts[lasts.length - 1] ?? keeper.data.lastPublishedAt,
        newsCount: counts.length > 0 ? counts.reduce((sum, c) => sum + c, 0) : keeper.data.newsCount,
      },
    })
    members.forEach((n) => {
      if (n.id !== keeper.id) replaced.set(n.id, keeper.id)
    })
  })
  if (replaced.size === 0) return data
  const seen = new Set<string>()
  const links = data.links.flatMap((l): GraphLink[] => {
    const source = endId(l.source)
    const target = endId(l.target)
    const from = replaced.get(source) ?? source
    const to = replaced.get(target) ?? target
    if (!isEventLink(l)) return [from === source && to === target ? l : { ...l, source: from, target: to }]
    const key = `${from}|${to}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{ ...l, source: from, target: to }]
  })
  const nodes = data.nodes.filter((n) => !replaced.has(n.id)).map((n) => keepers.get(n.id) ?? n)
  return {
    ...data,
    nodes,
    links,
    metadata: { ...data.metadata, stats: { ...data.metadata.stats, total_nodes: nodes.length, total_edges: links.length } },
  }
}

