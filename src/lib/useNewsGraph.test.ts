import { describe, expect, it } from 'vitest'
import type { GraphNode } from '@/data/graphTypes'
import { primaryNodeIds } from '@/lib/useNewsGraph'

function node(id: string, ticker?: string): GraphNode {
  return { id, label: id, type: 'company', data: { ticker } }
}

describe('primaryNodeIds', () => {
  const nodes = [node('a', '005930'), node('b', '000660'), node('c'), node('d', '035420')]

  it('시드 기업과 관련 기업 칩의 ticker에 맞는 노드를 합친다', () => {
    const ids = primaryNodeIds(nodes, ['a'], ['035420', '999999'])
    expect([...ids].sort()).toEqual(['a', 'd'])
  })

  it('ticker가 없는 노드는 칩으로 잡히지 않고, 중복은 한 번만', () => {
    const ids = primaryNodeIds(nodes, ['a', 'a'], ['005930'])
    expect([...ids]).toEqual(['a'])
  })
})
