import {
  ALL_PREDICATES,
  type GraphData,
  type GraphLink,
  type GraphNode,
  type Predicate,
} from '@/data/graphTypes'
import type {
  AnalyzedNewsRes,
  BriefingLockedRes,
  BriefingThemeRes,
  CitationRes,
  CitationType,
  RelationGraphRes,
  RelationLineRes,
  RelationPartyRes,
  RiskKind,
  RiskRes,
  StockRowRes,
  WatchKind,
} from '@/lib/apiTypes'

export const AI_NOTICE =
  '요약·해설 문장은 AI가 인용된 기사·공시에서 생성했으며 투자 판단의 근거가 아닙니다.'

export const RISK_LABELS: Record<RiskKind, string> = {
  ADMINISTRATION_NEW: '관리종목 신규 지정',
  SUSPENDED_NEW: '거래정지 신규',
  DELISTING_NEW: '정리매매 신규',
  CORRECTION: '정정 공시',
  RELATION_DENIED: '부인된 관계',
  RELATION_TERMINATED: '종료된 관계',
  SANCTION: '제재',
}

export const WATCH_LABELS: Record<WatchKind, string> = {
  CORRECTION: '정정 공시',
  CONTRACT_END: '계약 종료',
  PLANNED_RELATION: '계획 단계',
  ISSUE_SPREAD: '이슈 확산',
}

export const RELATION_LABELS: Record<string, string> = {
  SUPPLIES_TO: '공급',
  ACQUIRES: '인수',
  INVESTS_IN: '투자',
}

const CITATION_PREFIX: Record<CitationType, string> = {
  NEWS: '뉴스',
  DISCLOSURE: '공시',
  RELATION: '관계',
  CLUSTER: '이슈',
}

const RISK_ORDER: RiskKind[] = [
  'ADMINISTRATION_NEW',
  'SUSPENDED_NEW',
  'DELISTING_NEW',
  'CORRECTION',
  'RELATION_DENIED',
  'RELATION_TERMINATED',
  'SANCTION',
]

const TENSE_BADGES: Record<string, string> = {
  future_or_planned: '계획',
  modal_possibility: '가능성',
}

const POLARITY_BADGES: Record<string, string> = {
  denied: '부인',
  terminated: '종료',
}

export function pickMovers(stocks: StockRowRes[], count: number): StockRowRes[] {
  return stocks
    .filter((s) => s.change !== null)
    .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))
    .slice(0, count)
}

export function adjacentDates(
  datesDesc: string[],
  current: string,
): { prev: string | null; next: string | null } {
  const index = datesDesc.indexOf(current)
  if (index < 0) return { prev: null, next: null }
  return {
    prev: datesDesc[index + 1] ?? null,
    next: index > 0 ? datesDesc[index - 1] : null,
  }
}

export function lockedTeaser(locked: BriefingLockedRes): string {
  const parts = [
    locked.commentaries > 0 ? `해설 ${locked.commentaries}건` : null,
    locked.watchPoints > 0 ? `지켜볼 점 ${locked.watchPoints}건` : null,
    locked.risks > 0 ? `리스크 ${locked.risks}건` : null,
    locked.relations > 0 ? `관계 ${locked.relations}건` : null,
  ].filter((p): p is string => p !== null)
  if (parts.length === 0) return ''
  return `${parts.join(' · ')}은 로그인 후 볼 수 있습니다`
}

export function themeRadarSplit(themes: BriefingThemeRes[]): {
  up: BriefingThemeRes[]
  down: BriefingThemeRes[]
} {
  return {
    up: themes.filter((t) => t.hotSide === 'UP'),
    down: themes.filter((t) => t.hotSide === 'DOWN'),
  }
}

export interface RiskGroup {
  kind: RiskKind
  label: string
  items: RiskRes[]
}

export function groupRisks(risks: RiskRes[]): RiskGroup[] {
  return RISK_ORDER.flatMap((kind) => {
    const items = risks.filter((r) => r.kind === kind)
    return items.length > 0 ? [{ kind, label: RISK_LABELS[kind], items }] : []
  })
}

export function relationLineLabel(line: RelationLineRes): { predicate: string; badges: string[] } {
  const badges = [TENSE_BADGES[line.tense], POLARITY_BADGES[line.polarity]].filter(
    (b): b is string => b !== undefined,
  )
  return { predicate: RELATION_LABELS[line.relation] ?? line.relation, badges }
}

function partyNodeId(party: RelationPartyRes): string {
  return party.ticker ? `T:${party.ticker}` : `N:${party.name}`
}

export function edgeIdOf(line: RelationLineRes): string {
  return `${partyNodeId(line.subject)}|${line.relation}|${partyNodeId(line.object)}`
}

export function citationLabel(citation: CitationRes): string {
  return `${CITATION_PREFIX[citation.type]} · ${citation.label}`
}

export function relationDigestCaption(
  analyzed: AnalyzedNewsRes[],
  graph: RelationGraphRes | null,
  locked: BriefingLockedRes | null,
): string {
  const articles = `관계가 추출된 기사 ${analyzed.length}건`
  if (graph) {
    return `${articles} · 관계 ${graph.edges.length}건 · 기업 ${graph.nodes.length}곳`
  }
  return `${articles} · 관계 ${locked?.graphEdges ?? 0}건`
}

function isPredicate(value: string): value is Predicate {
  return (ALL_PREDICATES as string[]).includes(value)
}

export function toRelationGraphData(graph: RelationGraphRes): GraphData {
  const nodes: GraphNode[] = graph.nodes.map((n) => ({
    id: n.id,
    label: n.name,
    type: 'company',
    data: {
      ticker: n.ticker ?? undefined,
      market: n.market ?? undefined,
      country: n.ticker ? 'KR' : undefined,
    },
  }))

  const links: GraphLink[] = graph.edges.flatMap((e) => {
    if (!isPredicate(e.relation)) return []
    const news = e.sources.filter((s) => s.type === 'NEWS').map((s) => ({ news_id: s.id, item: e.item }))
    const disclosures = e.sources
      .filter((s) => s.type === 'DISCLOSURE')
      .map((s) => ({ rcept_no: s.id, item: e.item }))
    return [
      {
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.relation,
        item: e.item ? { text: e.item, type: 'company' as const } : null,
        mentioned_count: e.mentionedCount,
        value: e.mentionedCount,
        is_negated: e.polarity !== 'affirmed',
        tense: e.tense === 'past_or_present_fact' ? 'past_or_present_fact' : 'future_or_planned',
        news,
        disclosures,
        news_mention_count: news.length,
        disclosure_count: disclosures.length,
      },
    ]
  })

  return {
    nodes,
    links,
    metadata: {
      entity_types: ['company'],
      predicate_types: [...new Set(links.map((l) => l.type))],
      stats: { total_nodes: nodes.length, total_edges: links.length },
    },
  }
}
