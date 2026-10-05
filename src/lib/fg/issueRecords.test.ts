import { describe, expect, it } from 'vitest'
import {
  buildIssueBook,
  clockOf,
  findIssue,
  resolveIssueId,
  type IssueBookInput,
  type IssueSeed,
} from '@/lib/fg/issueRecords'
import type { LinkedCompany } from '@/lib/fg/stockLinks'

function seed(id: string, over: Partial<IssueSeed> = {}): IssueSeed {
  return {
    id,
    title: `이슈 ${id}`,
    media: 5,
    articles: 6,
    minutesAgo: 10,
    theme: '반도체',
    steps: [],
    summary: `요약 ${id}`,
    stocks: [],
    inferred: 0,
    ...over,
  }
}

function company(name: string, over: Partial<LinkedCompany> = {}): LinkedCompany {
  return {
    id: name,
    code: null,
    name,
    market: 'KOSDAQ',
    price: 1000,
    change: 1,
    gapFromHigh: -10,
    position: 0.5,
    type: 'supply',
    relation: `${name} 관계`,
    tag: '공급',
    title: `${name} 제목`,
    hops: [{ edge: 'supply', node: name }],
    strength: 2,
    confirmed: false,
    evidence: [],
    ...over,
  }
}

function input(over: Partial<IssueBookInput> = {}): IssueBookInput {
  return {
    snapshot: '15:30',
    days: [
      {
        date: '2026-10-02',
        issues: [
          seed('a', {
            steps: [
              { date: '09.12', title: '처음 보도' },
              { date: '10.01', title: '이슈 b' },
            ],
            minutesAgo: 12,
          }),
          seed('c'),
        ],
      },
      { date: '2026-10-01', issues: [seed('b', { steps: [{ date: '09.12', title: '처음 보도' }], minutesAgo: 75 })] },
    ],
    archive: [{ date: '2026-09-12', issues: [seed('a1', { title: '처음 보도', minutesAgo: 0 })] }],
    extras: { a: { shortTitle: '짧은 제목', flowTitle: '흐름 이름', detail: '상세 요약', points: [{ label: '무엇이', text: '바뀌어요' }] } },
    links: () => [],
    aliases: { '103': 'a', 'a-3': 'a', ghost: 'nope' },
    ...over,
  }
}

describe('clockOf', () => {
  it('기준 시각에서 분을 빼요', () => {
    expect(clockOf('15:30', 12)).toBe('15:18')
    expect(clockOf('15:30', 95)).toBe('13:55')
    expect(clockOf('00:10', 30)).toBe('00:00')
  })
})

describe('buildIssueBook', () => {
  it('가장 최근 날을 오늘로 삼고 날짜·갱신 시각을 붙여요', () => {
    const book = buildIssueBook(input())
    expect(book.today).toBe('2026-10-02')
    const a = findIssue(book, 'a')
    expect(a?.date).toBe('2026-10-02')
    expect(a?.updated).toBe('15:18')
    expect(findIssue(book, 'b')?.date).toBe('2026-10-01')
    expect(findIssue(book, 'b')?.updated).toBe('14:15')
    expect(findIssue(book, 'a1')?.date).toBe('2026-09-12')
  })

  it('앞선 이슈 제목을 이슈 id로 이어 흐름 전체를 만들어요', () => {
    const book = buildIssueBook(input())
    expect(findIssue(book, 'a')?.chain).toEqual(['a1', 'b', 'a'])
    expect(findIssue(book, 'b')?.chain).toEqual(['a1', 'b', 'a'])
    expect(findIssue(book, 'a1')?.chain).toEqual(['a1', 'b', 'a'])
    expect(findIssue(book, 'c')?.chain).toEqual(['c'])
  })

  it('제목 별칭으로 다른 제목의 이슈를 이어요', () => {
    const book = buildIssueBook(
      input({
        days: [{ date: '2026-10-02', issues: [seed('x', { steps: [{ date: '09.30', title: '협상 보도' }] }), seed('y', { title: '분리막 협상 보도' })] }],
        archive: [],
        titleAliases: { '협상 보도': 'y' },
      }),
    )
    expect(findIssue(book, 'x')?.chain).toEqual(['y', 'x'])
  })

  it('찾지 못한 앞선 이슈는 흐름에서 빼요', () => {
    const book = buildIssueBook(
      input({ days: [{ date: '2026-10-02', issues: [seed('x', { steps: [{ date: '09.30', title: '없는 이슈' }] })] }], archive: [] }),
    )
    expect(findIssue(book, 'x')?.chain).toEqual(['x'])
  })

  it('보강 정보가 없으면 제목·요약·빈 핵심 포인트로 채워요', () => {
    const book = buildIssueBook(input())
    const a = findIssue(book, 'a')
    expect(a?.shortTitle).toBe('짧은 제목')
    expect(a?.flowTitle).toBe('흐름 이름')
    expect(a?.detail).toBe('상세 요약')
    expect(a?.points).toHaveLength(1)
    const c = findIssue(book, 'c')
    expect(c?.shortTitle).toBe('이슈 c')
    expect(c?.flowTitle).toBe('이슈 c')
    expect(c?.detail).toBe('요약 c')
    expect(c?.points).toEqual([])
  })

  it('흐름 이름이 없으면 같은 흐름에 붙은 이름을 따라요', () => {
    const book = buildIssueBook(input())
    expect(findIssue(book, 'b')?.flowTitle).toBe('흐름 이름')
    expect(findIssue(book, 'a1')?.flowTitle).toBe('흐름 이름')
  })

  it('이어진 기업은 넘겨준 함수로 만들어요', () => {
    const book = buildIssueBook(
      input({ links: (s) => (s.id === 'a' ? [{ from: '한빛', company: company('누리') }] : []) }),
    )
    expect(findIssue(book, 'a')?.links.map((l) => l.company.name)).toEqual(['누리'])
    expect(findIssue(book, 'c')?.links).toEqual([])
  })
})

describe('resolveIssueId', () => {
  const book = buildIssueBook(input())
  it('있는 id는 그대로, 별칭은 원래 id로 바꿔요', () => {
    expect(resolveIssueId(book, 'a')).toBe('a')
    expect(resolveIssueId(book, '103')).toBe('a')
    expect(resolveIssueId(book, 'a-3')).toBe('a')
  })
  it('없는 id와 가리키는 이슈가 없는 별칭은 null이에요', () => {
    expect(resolveIssueId(book, 'zzz')).toBeNull()
    expect(resolveIssueId(book, 'ghost')).toBeNull()
    expect(resolveIssueId(book, '')).toBeNull()
  })
})
