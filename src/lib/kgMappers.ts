import {
  ALL_ENTITY_TYPES,
  ALL_PREDICATES,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from '@/data/graphTypes'
import type {
  KgBelongsToRelRes,
  KgCompanyEventsRes,
  KgCompanyNode,
  KgCompanyRelRes,
  KgCompanyRes,
  KgEventNode,
  KgHasEventRelRes,
  KgSupplyChainRes,
  KgSupplyRelRes,
  KgThemeNode,
  KgThemeRes,
} from '@/lib/kgApiTypes'

/** 기업 노드 — 라벨은 이름, 없으면 티커, 그것도 없으면 element_id */
function toCompanyNode(c: KgCompanyNode): GraphNode {
  return {
    id: c.id,
    label: c.name ?? c.ticker ?? c.id,
    type: 'company',
    data: {
      ticker: c.ticker ?? undefined,
      market: c.market ?? undefined,
      krx100: c.krx100,
      krx300: c.krx300,
      kosdaq150: c.kosdaq150,
    },
  }
}

function toThemeNode(t: KgThemeNode): GraphNode {
  return {
    id: t.id,
    label: t.name ?? t.id,
    type: 'theme',
    data: { description: t.description ?? undefined },
  }
}

/** 이벤트 노드 — 제목이 라벨. 제목이 없거나 빈 문자열이면 클러스터 번호로라도 부른다 */
function toEventNode(e: KgEventNode): GraphNode {
  return {
    id: e.id,
    label: e.title || (e.cluster_id != null ? `이벤트 #${e.cluster_id}` : e.id),
    type: 'event',
    data: {
      clusterId: e.cluster_id ?? undefined,
      keywords: e.keywords,
      companies: e.companies,
      memberCount: e.member_count ?? undefined,
      firstPublishedAt: e.first_published_at ?? undefined,
      lastPublishedAt: e.last_published_at ?? undefined,
      representativeNewsId: e.representative_news_id ?? undefined,
    },
  }
}

/** 기업→기업 간선. 굵기는 뉴스·공시 근거를 합쳐 잰다 — 상세 패널에서는 둘을 따로 보여준다 */
function toSupplyLink(r: KgSupplyRelRes): GraphLink {
  const weight = r.news_mention_count + r.disclosure_count
  return {
    id: r.id,
    source: r.start,
    target: r.end,
    type: r.type,
    mentioned_count: weight,
    value: weight,
    news_mention_count: r.news_mention_count,
    news: r.news,
    disclosure_count: r.disclosure_count,
    disclosures: r.disclosures,
    first_mentioned_at: r.first_mentioned_at,
    last_mentioned_at: r.last_mentioned_at,
  }
}

/** 테마 소속 — 큐레이션된 관계라 언급 횟수가 없다. 굵기 기준선 1 */
function toBelongsLink(r: KgBelongsToRelRes): GraphLink {
  return {
    id: r.id,
    source: r.start,
    target: r.end,
    type: 'BELONGS_TO',
    mentioned_count: 1,
    value: 1,
    reason: r.reason,
  }
}

/** 이벤트 언급 — 근거 필드가 없어 굵기는 고정 1 (캔버스가 점선으로 그린다) */
function toEventLink(r: KgHasEventRelRes): GraphLink {
  return {
    id: r.id,
    source: r.start,
    target: r.end,
    type: 'HAS_EVENT',
    mentioned_count: 1,
    value: 1,
  }
}

function toCompanyLink(r: KgCompanyRelRes): GraphLink {
  switch (r.type) {
    case 'SUPPLIES_TO':
    case 'ACQUIRES':
    case 'INVESTS_IN':
      return toSupplyLink(r)
    case 'BELONGS_TO':
      return toBelongsLink(r)
    case 'HAS_EVENT':
      return toEventLink(r)
  }
}

/**
 * 서버가 이 다섯 관계 타입 밖의 값을 보낼 수 있다 — 새 관계가 클라이언트 배포보다 먼저 나갈 수 있어서다.
 * 매핑 전에 걸러 두면 toCompanyLink의 switch가 안전하게 다섯 케이스로만 닫힌다.
 */
function isKnownPredicate(r: { type: string }): boolean {
  return (ALL_PREDICATES as string[]).includes(r.type)
}

function toGraph(nodes: GraphNode[], links: GraphLink[], center: GraphNode | undefined): GraphData {
  return {
    nodes,
    links,
    metadata: {
      center: center?.label,
      centerId: center?.id,
      entity_types: ALL_ENTITY_TYPES,
      predicate_types: ALL_PREDICATES,
      stats: { total_nodes: nodes.length, total_edges: links.length },
    },
  }
}

/** 양 끝이 모두 응답 노드에 있는 관계만 — 서버가 경로 단위로 모아 보내므로 보통 전부 통과한다 */
function hasBothEnds(nodeIds: Set<string>) {
  return (r: { start: string; end: string }) => nodeIds.has(r.start) && nodeIds.has(r.end)
}

/** 요청한 티커로 중심 기업을 찾는다 — 서버가 center를 주지 않는다 */
function findCenter(nodes: GraphNode[], ticker: string): GraphNode | undefined {
  return nodes.find((n) => n.type === 'company' && n.data.ticker === ticker)
}

/** 공급망 응답 → GraphData. 서버 Cypher가 SUPPLIES_TO만 따라가지만 타입은 응답을 믿고 그대로 옮긴다 */
export function toSupplyChainGraph(res: KgSupplyChainRes, ticker: string): GraphData {
  const nodes = res.companies.map(toCompanyNode)
  const nodeIds = new Set(nodes.map((n) => n.id))
  const links = res.relationships
    .filter(isKnownPredicate)
    .filter(hasBothEnds(nodeIds))
    .map(toSupplyLink)
  return toGraph(nodes, links, findCenter(nodes, ticker))
}

/** 테마 응답 → GraphData. 테마 노드 하나에 소속 기업들이 BELONGS_TO로 매달린다 */
export function toThemeGraph(res: KgThemeRes): GraphData {
  const theme = toThemeNode(res.theme)
  const nodes = [theme, ...res.companies.map(toCompanyNode)]
  const nodeIds = new Set(nodes.map((n) => n.id))
  const links = res.relationships.filter(hasBothEnds(nodeIds)).map(toBelongsLink)
  return toGraph(nodes, links, theme)
}

/**
 * 개요 응답 → GraphData. 기업·테마·이벤트를 전부 담는다.
 * 테마를 캔버스에서 숨기는 것은 여기가 아니라 필터 기본값의 일이다 — 켤 때 다시 받지 않아야 한다.
 */
export function toCompanyOverviewGraph(res: KgCompanyRes, ticker: string): GraphData {
  const nodes = [
    ...res.companies.map(toCompanyNode),
    ...res.themes.map(toThemeNode),
    ...res.events.map(toEventNode),
  ]
  const nodeIds = new Set(nodes.map((n) => n.id))
  const links = res.relationships
    .filter(isKnownPredicate)
    .filter(hasBothEnds(nodeIds))
    .map(toCompanyLink)
  return toGraph(nodes, links, findCenter(nodes, ticker))
}

/** 이벤트 응답 → GraphData. 기업과 이벤트가 HAS_EVENT로 번갈아 이어진다 */
export function toCompanyEventsGraph(res: KgCompanyEventsRes, ticker: string): GraphData {
  const nodes = [...res.companies.map(toCompanyNode), ...res.events.map(toEventNode)]
  const nodeIds = new Set(nodes.map((n) => n.id))
  const links = res.relationships.filter(hasBothEnds(nodeIds)).map(toEventLink)
  return toGraph(nodes, links, findCenter(nodes, ticker))
}
