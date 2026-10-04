import { describe, expect, it } from 'vitest'
import type { IssueDay } from '@/lib/apiTypes'
import { defaultIssueIndex } from '@/lib/issueSelection'

function day(label: string, count: number): IssueDay {
  return {
    label,
    date: label,
    good: 0,
    bad: 0,
    neutral: count,
    items: Array.from({ length: count }, (_, i) => ({
      id: `${label}-${i}`,
      title: `뉴스 ${i}`,
      meta: '',
      url: null,
      tripleExtracted: true,
      kind: '중립' as const,
    })),
  }
}

describe('defaultIssueIndex — 첫 화면 이슈 기본 선택', () => {
  it('구간이 없으면 선택하지 않는다', () => {
    expect(defaultIssueIndex([])).toBeNull()
  })

  it('마지막 구간에 뉴스가 있으면 마지막 구간', () => {
    expect(defaultIssueIndex([day('a', 1), day('b', 0), day('c', 2)])).toBe(2)
  })

  it('마지막 구간이 비어 있으면 뉴스가 있는 가장 최근 구간', () => {
    expect(defaultIssueIndex([day('a', 1), day('b', 3), day('c', 0), day('d', 0)])).toBe(1)
  })

  it('어느 구간에도 뉴스가 없으면 마지막 구간', () => {
    expect(defaultIssueIndex([day('a', 0), day('b', 0), day('c', 0)])).toBe(2)
  })

  it('잠긴 구간의 뉴스는 기본 선택하지 않고 마지막 구간으로 돌아간다', () => {
    expect(defaultIssueIndex([day('a', 4), day('b', 0), day('c', 0), day('d', 0)], 2)).toBe(3)
  })

  it('잠기지 않은 구간 안에서 뉴스가 있는 가장 최근 구간을 고른다', () => {
    expect(defaultIssueIndex([day('a', 4), day('b', 0), day('c', 1), day('d', 0)], 1)).toBe(2)
  })
})
