import { describe, expect, it } from 'vitest'
import { ALL_CATEGORIES, ALL_PREDICATES, type GraphData, type GraphLink, type GraphNode, type NodeCategory, type Predicate } from '@/data/graphTypes'
import { EVENT_NODE, eventNodeWidth, filterVisibleGraph, truncateEventLabel } from '@/lib/graphLayout'

describe('이벤트 태그 기하', () => {
  it('12자를 넘는 제목은 11자 + 말줄임', () => {
    expect(truncateEventLabel('로봇 액추에이터 수주 협의 확대')).toBe('로봇 액추에이터 수주…')
    expect(truncateEventLabel('로봇 액추에이터 수주 협의 확대')).toHaveLength(EVENT_NODE.maxChars)
    expect(truncateEventLabel('짧은 제목')).toBe('짧은 제목')
  })

  it('폭은 잘린 라벨 글자 수에 비례하고 좌우 여백을 더한다', () => {
    expect(eventNodeWidth('짧은 제목')).toBe(5 * EVENT_NODE.charWidth + EVENT_NODE.padX * 2)
    expect(eventNodeWidth('로봇 액추에이터 수주 협의 확대')).toBe(
      EVENT_NODE.maxChars * EVENT_NODE.charWidth + EVENT_NODE.padX * 2,
    )
  })
})

describe('filterVisibleGraph', () => {
  const company = (id: string, market = 'KOSPI'): GraphNode => ({ id, label: id, type: 'company', data: { market } })
  const link = (id: string, type: Predicate, source: string, target: string): GraphLink => ({
    id, type, source, target, mentioned_count: 1, value: 1,
  })
  const data: GraphData = {
    nodes: [company('me'), company('sup', 'KOSDAQ'), { id: 'ev', label: 'ev', type: 'event', data: {} }, company('lone')],
    links: [link('l1', 'SUPPLIES_TO', 'sup', 'me'), link('l2', 'HAS_EVENT', 'me', 'ev')],
    metadata: { centerId: 'me', entity_types: [], predicate_types: [], stats: { total_nodes: 4, total_edges: 2 } },
  }
  const all = new Set(ALL_CATEGORIES)
  const allPredicates = new Set(ALL_PREDICATES)

  it('간선이 없는 노드는 숨긴다 — 중심만 예외로 항상 남는다', () => {
    const { nodes, links } = filterVisibleGraph({ ...data, links: [] }, all, allPredicates, 'me')
    expect(nodes.map((n) => n.id)).toEqual(['me'])
    expect(links).toEqual([])
  })

  it('필터가 모든 간선을 지워도 중심은 남는다', () => {
    const { nodes } = filterVisibleGraph(data, all, new Set<Predicate>(['BELONGS_TO']), 'me')
    expect(nodes.map((n) => n.id)).toEqual(['me'])
  })

  it('중심도 자기 분류가 꺼지면 숨는다', () => {
    const { nodes } = filterVisibleGraph(data, new Set<NodeCategory>(['kosdaq', 'event']), allPredicates, 'me')
    expect(nodes).toEqual([])
  })

  it('양 끝 분류와 관계 타입이 모두 켜진 간선만, 그 끝점 노드만 남긴다', () => {
    const { nodes, links } = filterVisibleGraph(data, new Set<NodeCategory>(['kospi', 'kosdaq']), allPredicates, 'me')
    expect(links.map((l) => l.id)).toEqual(['l1'])
    expect(nodes.map((n) => n.id)).toEqual(['me', 'sup'])
  })

  it('중심이 없으면(테마 원점 등) 기존 규칙 그대로', () => {
    const { nodes } = filterVisibleGraph({ ...data, links: [] }, all, allPredicates, null)
    expect(nodes).toEqual([])
  })
})
