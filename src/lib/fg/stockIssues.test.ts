import { describe, expect, it } from 'vitest'
import type { CandleRes } from '@/lib/apiTypes'
import {
  flowSteps,
  issueBadge,
  issueDayLabel,
  placeIssues,
  reportedLabel,
  stackMarkers,
  tradingDayLabel,
  type IssueFlowsFixture,
} from '@/lib/fg/stockIssues'

function bar(date: string, close: number, volume = 100): CandleRes {
  return { date, open: close, high: close + 10, low: close - 10, close, volume }
}

const candles = [
  bar('2026-09-24', 1000),
  bar('2026-09-25', 1100),
  bar('2026-09-28', 990, 300),
  bar('2026-09-29', 1000),
  bar('2026-09-30', 1050),
]

const fixture: IssueFlowsFixture = {
  anchor: '2026-10-02',
  flows: [
    {
      id: 'export',
      title: '수출 규제',
      issues: [
        { date: '2026-09-29', title: '규제 검토', media: 8, articles: 9, summary: '검토', with: ['솔빛장비'] },
        { date: '2026-10-02', title: '공급망 재편', media: 23, articles: 31, summary: '재편', with: ['솔빛장비', '다온전자'], more: 4 },
      ],
    },
    {
      id: 'hbm',
      title: 'HBM 공급',
      issues: [{ date: '2026-10-01', title: 'HBM 협상', media: 13, articles: 16, summary: '협상' }],
    },
    {
      id: 'old',
      title: '옛 이슈',
      issues: [{ date: '2025-01-01', title: '범위 밖', media: 1, articles: 1, summary: '' }],
    },
  ],
}

describe('placeIssues', () => {
  const placed = placeIssues(fixture, candles)

  it('목업의 오늘을 마지막 봉 날짜에 맞춰 옮기고 최신순으로 늘어놓는다', () => {
    expect(placed.map((issue) => [issue.key, issue.date, issue.index])).toEqual([
      ['export-1', '2026-09-30', 4],
      ['hbm-0', '2026-09-29', 3],
      ['export-0', '2026-09-27', 2],
    ])
  })

  it('주말에 보도되면 다음 거래일 봉에 붙이고 그날 등락·종가·거래량 배수를 단다', () => {
    const weekend = placed.find((issue) => issue.key === 'export-0')
    expect(weekend).toMatchObject({ sameDay: false, close: 990, order: 1, total: 2, flowTitle: '수출 규제' })
    expect(weekend?.change).toBeCloseTo(-10, 6)
    expect(weekend?.volumeRatio).toBe(3)
    expect(placed[0]).toMatchObject({ sameDay: true, with: ['솔빛장비', '다온전자'], more: 4 })
  })

  it('봉이 없으면 비운다', () => {
    expect(placeIssues(fixture, [])).toEqual([])
  })
})

describe('표시', () => {
  const placed = placeIssues(fixture, candles)

  it('같은 봉에 여러 이슈가 있으면 마커를 위로 쌓는다', () => {
    const doubled = [placed[0], { ...placed[1], index: 4 }, placed[2]]
    expect(stackMarkers(doubled)).toEqual([
      { key: 'export-1', index: 4, stack: 0 },
      { key: 'hbm-0', index: 4, stack: 1 },
      { key: 'export-0', index: 2, stack: 0 },
    ])
  })

  it('목록 날짜는 오늘이면 "오늘", 아니면 MM.DD', () => {
    expect(issueDayLabel('2026-09-30', '2026-09-30')).toBe('오늘')
    expect(issueDayLabel('2026-09-07', '2026-09-30')).toBe('09.07')
  })

  it('흐름 이슈가 둘 이상이면 타임라인 순번, 하나면 새 이슈', () => {
    expect(issueBadge(placed[0])).toBe('타임라인 2번째')
    expect(issueBadge(placed[1])).toBe('새 이슈')
    expect(tradingDayLabel(placed[0])).toBe('이 날')
    expect(tradingDayLabel(placed[2])).toBe('다음 거래일')
  })

  it('시트 보도일 줄과 흐름 단계', () => {
    expect(reportedLabel(placed[0], 2026)).toBe('9월 30일(수) 보도 · 수출 규제 흐름')
    expect(reportedLabel(placed[1], 2025)).toBe('2026년 9월 29일(화) 보도')
    expect(flowSteps(placed, 'export').map((issue) => issue.key)).toEqual(['export-0', 'export-1'])
  })
})
