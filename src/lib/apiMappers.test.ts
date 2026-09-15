import { describe, expect, it } from 'vitest'
import { buildIssueTimeline } from '@/lib/apiMappers'
import type { CandleDate, NewsDetail } from '@/lib/apiTypes'

function news(id: string, collectedAt: string): NewsDetail {
  return { id, title: id, summary: '', url: '', collectedAt, tripleExtracted: null }
}

// 금(9/11) → 월(9/14) → 화(9/15): 주말이 낀 거래일 슬롯
const dates: CandleDate[] = [
  { label: '9/11', date: '2026.09.11' },
  { label: '9/14', date: '2026.09.14' },
  { label: '9/15', date: '2026.09.15' },
]

function idsOf(days: ReturnType<typeof buildIssueTimeline>) {
  return days.map((d) => d.items.map((i) => i.id))
}

describe('buildIssueTimeline', () => {
  it('거래일 당일 뉴스는 해당 슬롯에 들어간다', () => {
    const days = buildIssueTimeline([news('a', '2026-09-14T10:00:00+09:00')], dates, 'D')
    expect(idsOf(days)).toEqual([[], ['a'], []])
  })

  it('주말 뉴스는 다음 거래일 슬롯이 흡수한다', () => {
    const days = buildIssueTimeline(
      [news('sat', '2026-09-12T10:00:00+09:00'), news('sun', '2026-09-13T23:00:00+09:00')],
      dates,
      'D',
    )
    expect(idsOf(days)).toEqual([[], ['sat', 'sun'], []])
  })

  it('마지막 거래일 이후 뉴스는 마지막 슬롯에 들어간다', () => {
    const days = buildIssueTimeline([news('today', '2026-09-16T09:00:00+09:00')], dates, 'D')
    expect(idsOf(days)).toEqual([[], [], ['today']])
  })

  it('첫 거래일 이전 뉴스는 첫 슬롯 창(period 기준) 안이면 포함하고, 더 오래된 것은 버린다', () => {
    const days = buildIssueTimeline(
      [news('in', '2026-09-11T08:00:00+09:00'), news('old', '2026-09-01T08:00:00+09:00')],
      dates,
      'D',
    )
    expect(idsOf(days)).toEqual([['in'], [], []])
  })

  it('collectedAt 이 비었거나 파싱 불가하면 건너뛴다', () => {
    const days = buildIssueTimeline([news('x', ''), news('y', 'not-a-date')], dates, 'D')
    expect(idsOf(days)).toEqual([[], [], []])
    expect(days.map((d) => d.neutral)).toEqual([0, 0, 0])
  })
})
