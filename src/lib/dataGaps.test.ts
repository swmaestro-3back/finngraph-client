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
})
