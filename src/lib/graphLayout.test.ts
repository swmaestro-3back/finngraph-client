import { describe, expect, it } from 'vitest'
import { ALL_CATEGORIES, ALL_PREDICATES, type GraphData, type GraphLink, type GraphNode, type NodeCategory, type Predicate } from '@/data/graphTypes'
import { filterVisibleGraph, wrapEventLabel } from '@/lib/graphLayout'

describe('이벤트 라벨 줄바꿈', () => {
  it('한 줄 12자 안에서 단어 단위로 두 줄까지 나눈다', () => {
    expect(wrapEventLabel('로봇 액추에이터 수주 협의 확대')).toEqual(['로봇 액추에이터 수주', '협의 확대'])
    expect(wrapEventLabel('짧은 제목')).toEqual(['짧은 제목'])
  })

  it('두 줄을 넘으면 둘째 줄 끝을 말줄임하고 긴 단어는 글자로 끊는다', () => {
    expect(wrapEventLabel('가나다라마바사아자차카타파하 공장 증설 계약 체결')).toEqual([
      '가나다라마바사아자차카타',
      '파하 공장 증설 계약…',
    ])
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

  it('기간 밖 이벤트는 간선째 사라지고, 그 이벤트로만 이어지던 노드도 함께 빠진다', () => {
    const withDates: GraphData = {
      ...data,
      nodes: [
        company('me'),
        { id: 'old', label: 'old', type: 'event', data: { lastPublishedAt: '2026-06-17T15:51:00.000000000+09:00' } },
        { id: 'new', label: 'new', type: 'event', data: { lastPublishedAt: '2026-10-08T19:55:00.000000000+09:00' } },
        { id: 'undated', label: 'undated', type: 'event', data: {} },
        company('peer'),
      ],
      links: [
        link('a', 'HAS_EVENT', 'me', 'old'),
        link('b', 'HAS_EVENT', 'me', 'new'),
        link('c', 'HAS_EVENT', 'me', 'undated'),
        link('d', 'HAS_EVENT', 'peer', 'old'),
      ],
    }
    const { nodes, links } = filterVisibleGraph(withDates, all, allPredicates, 'me', '2026-10-02')
    expect(links.map((l) => l.id)).toEqual(['b'])
    expect(nodes.map((n) => n.id)).toEqual(['me', 'new'])
    // 기간을 안 고르면(기본값) 전과 같다
    expect(filterVisibleGraph(withDates, all, allPredicates, 'me').nodes.map((n) => n.id)).toEqual(['me', 'old', 'new', 'undated', 'peer'])
  })

  it('중심이 없으면(테마 원점 등) 기존 규칙 그대로', () => {
    const { nodes } = filterVisibleGraph({ ...data, links: [] }, all, allPredicates, null)
    expect(nodes).toEqual([])
  })
})
