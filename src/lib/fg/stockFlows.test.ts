import { describe, expect, it } from 'vitest'
import type { CandleRes } from '@/lib/apiTypes'
import {
  flowCaption,
  flowChartLabel,
  flowChartWindow,
  flowCompareNote,
  flowListTitle,
  flowMediaLabel,
  flowMeta,
  flowSpan,
  flowStatus,
  issueFlows,
  timelineNodes,
  visibleFlows,
  widenOffer,
  type IssueFlow,
} from '@/lib/fg/stockFlows'
import { placeIssues, type IssueFlowsFixture } from '@/lib/fg/stockIssues'

function bar(date: string, close: number): CandleRes {
  return { date, open: close, high: close + 10, low: close - 10, close, volume: 100 }
}

const candles = [
  bar('2025-12-01', 900),
  bar('2026-05-01', 1000),
  bar('2026-06-30', 1000),
  bar('2026-07-01', 1000),
  bar('2026-07-02', 1010),
  bar('2026-08-03', 1100),
  bar('2026-09-01', 1200),
  bar('2026-09-11', 1250),
  bar('2026-09-14', 1300),
  bar('2026-09-24', 1400),
  bar('2026-09-25', 1380),
  bar('2026-09-29', 1450),
  bar('2026-09-30', 1500),
]

const issue = (date: string, title: string, media: number) => ({ date, title, media, articles: media + 1, summary: title })

const fixture: IssueFlowsFixture = {
  anchor: '2026-09-30',
  flows: [
    {
      id: 'export',
      title: '수출 규제',
      issues: [issue('2026-09-12', '규제 검토', 8), issue('2026-09-24', '대응 회의', 12), issue('2026-09-30', '공급망 재편', 23)],
    },
    { id: 'memory', title: '메모리 반등', issues: [issue('2026-07-02', 'D램 가격 반등', 10), issue('2026-09-25', 'D램 계약가 인상', 15)] },
    { id: 'buyback', title: '자사주 매입', issues: [issue('2026-09-01', '자사주 매입 결정', 20)] },
    { id: 'q1', title: '1분기 실적', issues: [issue('2026-05-01', '1분기 실적 발표', 10)] },
    { id: 'downturn', title: '메모리 감산', issues: [issue('2025-12-01', '감산 연장', 11)] },
  ],
}

const TODAY = '2026-10-04'
const flows = issueFlows(placeIssues(fixture, candles), candles, TODAY)
const byId = (id: string): IssueFlow => {
  const found = flows.find((flow) => flow.id === id)
  if (!found) throw new Error(id)
  return found
}

describe('issueFlows', () => {
  it('흐름마다 이슈를 순서대로 모으고 첫 보도 전날 종가부터 주가를 잰다', () => {
    const exp = byId('export')
    expect(exp.items.map((item) => item.date)).toEqual(['2026-09-12', '2026-09-24', '2026-09-30'])
    expect(exp).toMatchObject({ live: true, daysAgo: 4, fromIndex: 7, toIndex: 12, fromClose: 1250, toClose: 1500, toDate: '2026-09-30', maxMedia: 23 })
    expect(exp.change).toBeCloseTo(20, 6)
  })

  it('마지막 보도가 7일보다 오래되면 진행 중이 아니고 마지막 이슈 날 종가로 끝낸다', () => {
    const memory = byId('memory')
    expect(memory).toMatchObject({ live: false, daysAgo: 9, fromIndex: 3, toIndex: 10, toDate: '2026-09-25' })
    expect(memory.change).toBeCloseTo(38, 6)
  })

  it('첫 봉에 걸린 흐름은 그 봉에서 시작한다', () => {
    expect(byId('downturn')).toMatchObject({ fromIndex: 0, toIndex: 0, change: 0 })
  })
})

describe('visibleFlows', () => {
  it('마지막 보도일이 기간 안에 있는 흐름만 남기고 최근 보도 순으로 늘어놓는다', () => {
    expect(visibleFlows(flows, { period: '3m', sort: 'recent', query: '', today: TODAY }).map((f) => f.id)).toEqual([
      'export',
      'memory',
      'buyback',
    ])
    expect(visibleFlows(flows, { period: '1m', sort: 'recent', query: '', today: TODAY }).map((f) => f.id)).toEqual([
      'export',
      'memory',
    ])
  })

  it('화제 순은 가장 많이 보도한 매체 수가 큰 흐름부터', () => {
    expect(visibleFlows(flows, { period: '3m', sort: 'hot', query: '', today: TODAY }).map((f) => f.id)).toEqual([
      'export',
      'buyback',
      'memory',
    ])
  })

  it('검색어는 흐름 제목이나 이슈 제목에서 대소문자 없이 찾는다', () => {
    expect(visibleFlows(flows, { period: '1y', sort: 'recent', query: ' d램 ', today: TODAY }).map((f) => f.id)).toEqual(['memory'])
    expect(visibleFlows(flows, { period: '1y', sort: 'recent', query: '자사주', today: TODAY }).map((f) => f.id)).toEqual(['buyback'])
  })
})

describe('widenOffer', () => {
  it('다음 기간에 더 있는 흐름 수를 알려 준다', () => {
    expect(widenOffer(flows, '3m', '', 3, TODAY)).toEqual({ next: '6m', text: '더 지난 흐름 1개가 6달 안에 있어요', label: '6달까지 보기' })
    expect(widenOffer(flows, '6m', '', 4, TODAY)).toEqual({ next: '1y', text: '더 지난 흐름 1개가 1년 안에 있어요', label: '1년까지 보기' })
  })

  it('바로 다음 기간에 더 없으면 더 있는 기간까지 건너뛴다', () => {
    const noQ1 = flows.filter((flow) => flow.id !== 'q1')
    expect(widenOffer(noQ1, '3m', '', 3, TODAY)).toEqual({ next: '1y', text: '더 지난 흐름 1개가 1년 안에 있어요', label: '1년까지 보기' })
  })

  it('검색 중이거나 1년이거나 더 없으면 묻지 않는다', () => {
    expect(widenOffer(flows, '3m', '규제', 1, TODAY)).toBeNull()
    expect(widenOffer(flows, '1y', '', 5, TODAY)).toBeNull()
    expect(widenOffer(flows.slice(0, 3), '3m', '', 3, TODAY)).toBeNull()
  })
})

describe('흐름 문구', () => {
  it('캡션은 개수·기간·정렬과 검색어를 잇는다', () => {
    expect(flowCaption(3, '3m', 'recent', '')).toBe('흐름 3개 · 최근 3달 · 최근 보도 순')
    expect(flowCaption(1, '1y', 'hot', ' d램 ')).toBe('흐름 1개 · 최근 1년 · 매체 많은 흐름 순 · "d램" 검색')
  })

  it('기간은 첫 보도부터 마지막 보도까지, 오늘이면 오늘', () => {
    expect(flowSpan(byId('export'), TODAY)).toBe('09.12 → 09.30')
    expect(flowSpan(byId('export'), '2026-09-30')).toBe('09.12 → 오늘')
    expect(flowSpan(byId('buyback'), TODAY)).toBe('09.01')
  })

  it('매체 수 변화', () => {
    expect(flowMediaLabel(byId('export'))).toBe('매체 8곳 → 23곳')
    expect(flowMediaLabel(byId('buyback'))).toBe('매체 20곳')
  })

  it('상태는 진행 중이면 며칠 전 보도, 아니면 마지막 소식 날짜', () => {
    expect(flowStatus(byId('export'), TODAY)).toBe('4일 전 보도')
    expect(flowStatus(byId('export'), '2026-09-30')).toBe('오늘도 보도')
    expect(flowStatus(byId('memory'), TODAY)).toBe('9월 25일 이후 소식 없음')
    expect(flowStatus(byId('downturn'), TODAY)).toBe('2025년 12월 1일 이후 소식 없음')
  })

  it('고른 흐름 머리 메타', () => {
    expect(flowMeta(byId('export'), TODAY)).toBe('9월 12일 → 9월 30일 · 19일 · 매체 8곳 → 23곳')
    expect(flowMeta(byId('export'), '2026-09-30')).toBe('9월 12일 → 오늘 · 19일 · 매체 8곳 → 23곳')
    expect(flowMeta(byId('buyback'), TODAY)).toBe('9월 1일 · 매체 20곳')
  })

  it('비교 기준 문구는 진행 중이면 최근 거래일, 끝났으면 마지막 이슈 날', () => {
    expect(flowCompareNote(byId('export'), TODAY)).toBe('첫 보도 전날 종가와 최근 거래일 종가를 비교했어요')
    expect(flowCompareNote(byId('export'), '2026-09-30')).toBe('첫 보도 전날 종가와 오늘 종가를 비교했어요')
    expect(flowCompareNote(byId('memory'), TODAY)).toBe('첫 보도 전날 종가와 마지막 이슈 날 종가를 비교했어요')
  })

  it('목록 제목과 차트 이름', () => {
    expect(flowListTitle(byId('export'), 'time')).toBe('이슈 3개를 시간순으로')
    expect(flowListTitle(byId('export'), 'new')).toBe('이슈 3개를 최신순으로')
    expect(flowListTitle(byId('buyback'), 'time')).toBe('이 흐름의 이슈')
    expect(flowChartLabel(byId('export'), '삼성전자')).toBe('수출 규제 흐름 동안 삼성전자 주가, +20.00%')
  })
})

describe('flowChartWindow', () => {
  it('첫 보도 전 4봉부터, 끝난 흐름은 6봉 뒤까지, 진행 중이면 마지막 봉까지', () => {
    expect(flowChartWindow(byId('export'), candles.length)).toEqual({ from: 3, to: 12 })
    expect(flowChartWindow(byId('memory'), candles.length)).toEqual({ from: 0, to: 12 })
    expect(flowChartWindow(byId('buyback'), candles.length)).toEqual({ from: 1, to: 12 })
  })
})

describe('timelineNodes', () => {
  it('시간순이면 앞 이슈와의 날짜 차이와 그 사이 주가를 붙인다', () => {
    const nodes = timelineNodes(byId('export'), 'time', candles, TODAY)
    expect(nodes.map((node) => [node.dateText, node.dateSub, node.badge, node.now])).toEqual([
      ['09.12', '토요일', '첫 보도', false],
      ['09.24', '목요일', '타임라인 2번째', false],
      ['09.30', '수요일', '타임라인 3번째', true],
    ])
    expect(nodes[0].since).toBeNull()
    expect(nodes[1].since?.days).toBe(12)
    expect(nodes[1].since?.change).toBeCloseTo((1400 / 1300 - 1) * 100, 6)
    expect(nodes[2].since?.days).toBe(6)
  })

  it('최신순이면 뒤집고 사이 줄을 뺀다', () => {
    const nodes = timelineNodes(byId('export'), 'new', candles, TODAY)
    expect(nodes.map((node) => node.issue.date)).toEqual(['2026-09-30', '2026-09-24', '2026-09-12'])
    expect(nodes.every((node) => node.since === null)).toBe(true)
  })

  it('오늘 나온 이슈는 날짜 자리에 오늘을 쓰고, 이슈 하나뿐이면 새 이슈', () => {
    expect(timelineNodes(byId('export'), 'time', candles, '2026-09-30')[2]).toMatchObject({ dateText: '오늘', dateSub: '09.30' })
    expect(timelineNodes(byId('buyback'), 'time', candles, TODAY)[0]).toMatchObject({ badge: '새 이슈', now: false })
  })
})
