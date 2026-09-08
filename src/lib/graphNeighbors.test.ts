import { describe, expect, it } from 'vitest'
import type { GraphLink, GraphNode, Predicate } from '@/data/graphTypes'
import { classifyNeighbors, EMPTY_NEIGHBORS } from '@/lib/graphNeighbors'

function node(id: string, type: GraphNode['type'] = 'company'): GraphNode {
  return { id, label: id, type, data: {} }
}
function link(id: string, type: Predicate, source: string, target: string): GraphLink {
  return { id, type, source, target, mentioned_count: 1, value: 1 }
}

const nodes = ['me', 'sup', 'cus', 'acq', 'own', 'inv', 'fund', 'theme', 'ev'].map((id) =>
  node(id, id === 'theme' ? 'theme' : id === 'ev' ? 'event' : 'company'),
)
const byId = new Map(nodes.map((n) => [n.id, n]))
const links: GraphLink[] = [
  link('l1', 'SUPPLIES_TO', 'sup', 'me'),
  link('l2', 'SUPPLIES_TO', 'me', 'cus'),
  link('l3', 'ACQUIRES', 'me', 'acq'),
  link('l4', 'ACQUIRES', 'own', 'me'),
  link('l5', 'INVESTS_IN', 'me', 'inv'),
  link('l6', 'INVESTS_IN', 'fund', 'me'),
  link('l7', 'BELONGS_TO', 'me', 'theme'),
  link('l8', 'HAS_EVENT', 'me', 'ev'),
  // 같은 이웃이 두 간선으로 이어져도 한 번만
  link('l9', 'SUPPLIES_TO', 'sup', 'me'),
  // 응답에 없는 노드는 건너뛴다
  link('l10', 'SUPPLIES_TO', 'ghost', 'me'),
]

describe('classifyNeighbors', () => {
  it('관계 타입과 방향으로 나눈다', () => {
    const n = classifyNeighbors('me', links, byId)
    expect(n.suppliers.map((x) => x.id)).toEqual(['sup'])
    expect(n.customers.map((x) => x.id)).toEqual(['cus'])
    expect(n.acquired.map((x) => x.id)).toEqual(['acq'])
    expect(n.acquirers.map((x) => x.id)).toEqual(['own'])
    expect(n.investees.map((x) => x.id)).toEqual(['inv'])
    expect(n.investors.map((x) => x.id)).toEqual(['fund'])
    expect(n.themes.map((x) => x.id)).toEqual(['theme'])
    expect(n.events.map((x) => x.id)).toEqual(['ev'])
    expect(n.members).toEqual([])
    expect(n.mentioners).toEqual([])
  })

  it('테마·이벤트 노드에서 보면 들어오는 쪽이 채워진다', () => {
    expect(classifyNeighbors('theme', links, byId).members.map((x) => x.id)).toEqual(['me'])
    expect(classifyNeighbors('ev', links, byId).mentioners.map((x) => x.id)).toEqual(['me'])
  })

  it('간선이 없으면 빈 묶음', () => {
    expect(classifyNeighbors('lonely', [], byId)).toEqual(EMPTY_NEIGHBORS)
  })

  it('알 수 없는 관계 타입의 간선은 던지지 않고 무시한다', () => {
    const badLink = link('l-unknown', 'MERGES_WITH' as never, 'sup', 'me')
    expect(() => classifyNeighbors('me', [...links, badLink], byId)).not.toThrow()
    // 나머지 분류에는 영향이 없다
    const n = classifyNeighbors('me', [...links, badLink], byId)
    expect(n.suppliers.map((x) => x.id)).toEqual(['sup'])
  })
})
