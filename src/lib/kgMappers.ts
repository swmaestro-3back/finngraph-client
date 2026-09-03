import {
  ALL_ENTITY_TYPES,
  ALL_PREDICATES,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from '@/data/graphTypes'
import type { KgCompanyNode, KgSupplyChainRes, KgThemeRes } from '@/lib/kgApiTypes'

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

/**
 * 공급망 응답 → GraphData. 관계 타입은 응답에 없고 전부 SUPPLIES_TO다.
 * 서버가 center를 주지 않으므로 요청한 티커로 중심 기업을 찾는다.
 */
export function toSupplyChainGraph(res: KgSupplyChainRes, ticker: string): GraphData {
  const nodes = res.companies.map(toCompanyNode)
  const nodeIds = new Set(nodes.map((n) => n.id))
  const links = res.relationships.filter(hasBothEnds(nodeIds)).map((r): GraphLink => {
    // 굵기는 뉴스·공시 근거를 합쳐 잰다 — 상세 패널에서는 둘을 따로 보여준다
    const weight = r.news_mention_count + r.disclosure_count
    return {
      id: r.id,
      source: r.start,
      target: r.end,
      type: 'SUPPLIES_TO',
      mentioned_count: weight,
      value: weight,
      news_mention_count: r.news_mention_count,
      news: r.news,
      disclosure_count: r.disclosure_count,
      disclosures: r.disclosures,
      first_mentioned_at: r.first_mentioned_at,
      last_mentioned_at: r.last_mentioned_at,
    }
  })
  const center = nodes.find((n) => n.data.ticker === ticker)
  return toGraph(nodes, links, center)
}

/** 테마 응답 → GraphData. 테마 노드 하나에 소속 기업들이 BELONGS_TO로 매달린다 */
export function toThemeGraph(res: KgThemeRes): GraphData {
  const theme: GraphNode = {
    id: res.theme.id,
    label: res.theme.name ?? res.theme.id,
    type: 'theme',
    data: { description: res.theme.description ?? undefined },
  }
  const nodes = [theme, ...res.companies.map(toCompanyNode)]
  const nodeIds = new Set(nodes.map((n) => n.id))
  const links = res.relationships.filter(hasBothEnds(nodeIds)).map(
    (r): GraphLink => ({
      id: r.id,
      source: r.start,
      target: r.end,
      type: 'BELONGS_TO',
      // 큐레이션된 소속 관계라 언급 횟수가 없다 — 굵기 기준선 1
      mentioned_count: 1,
      value: 1,
      reason: r.reason,
    }),
  )
  return toGraph(nodes, links, theme)
}
