import { describe, expect, it } from 'vitest'
import { GAP_IDS, GAPS } from '@/lib/dataGaps'

describe('GAPS', () => {
  it('API 갭 문서에서 해소되지 않은 15개 id를 문서 순서대로 갖는다', () => {
    expect(GAP_IDS).toEqual([
      'stock-quote-ext',
      'stock-themes',
      'financials-quarter',
      'stock-keystats-compare',
      'issues',
      'issue-timeline',
      'theme-issue',
      'stock-issues',
      'watchlist-issues',
      'linked-companies',
      'disclosures',
      'investor-flow-amount',
      'movers',
      'search',
      'logos',
    ])
  })

  it('모든 갭에 제목·필요한 데이터·담당이 있다', () => {
    for (const id of GAP_IDS) {
      const gap = GAPS[id]
      expect(gap.title.length).toBeGreaterThan(0)
      expect(gap.needs.length).toBeGreaterThan(0)
      expect(gap.owners.length).toBeGreaterThan(0)
    }
  })

  it('이슈 갭은 이슈 API로 풀린 칸을 빼고 남은 칸만 적는다', () => {
    expect(GAPS.issues.needs).toContain('핵심 포인트')
    expect(GAPS.issues.needs).toContain('뉴스 속 역할')
    expect(GAPS.issues.needs).toContain('관계 문장')
    expect(GAPS.issues.needs).not.toMatch(/날짜별 이슈 목록|묶인 기사|서로 다른 매체 수|뉴스에 나온 종목,/)
    expect(GAPS['issue-timeline'].needs).toContain('이어진 흐름')
    expect(GAPS['linked-companies'].needs).toContain('관계 그래프 미리보기')
  })
})
