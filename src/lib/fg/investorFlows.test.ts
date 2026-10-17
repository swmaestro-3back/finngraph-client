import { describe, expect, it } from 'vitest'
import type { CandleRes, InvestorFlowRes } from '@/lib/apiTypes'
import {
  flowDateLabel,
  flowDays,
  flowHelp,
  flowLead,
  flowRangeOptions,
  flowReading,
  flowTail,
  flowValueText,
  flowWindow,
  foreignHolding,
  foreignSummary,
  formatAxisShares,
  formatShares,
  holdingText,
  recentFlowRows,
  runningTotals,
  sharedScale,
  streakNote,
} from '@/lib/fg/investorFlows'
import type { SupplyStreaks } from '@/lib/supplyStreak'

function candle(date: string, close: number): CandleRes {
  return { date, open: close, high: close, low: close, close, volume: 1 }
}

function flow(date: string, f: number | null, i: number | null, p: number | null, ratio: number | null = null): InvestorFlowRes {
  return { date, foreignNet: f, institutionNet: i, individualNet: p, foreignRatio: ratio }
}

const candles = [
  candle('2026-09-22', 270000),
  candle('2026-09-23', 272500),
  candle('2026-09-28', 271000),
  candle('2026-09-29', 272500),
  candle('2026-09-30', 268500),
]

const flows = [
  flow('2026-09-29', -2508369, 53759, 422277, 46.4653),
  flow('2026-09-23', 4513767, 1346883, -7630126, 46.6447),
]

const streaks: SupplyStreaks = {
  foreign: { days: 1, direction: 'sell' },
  institution: { days: 1, direction: 'buy' },
  individual: { days: 1, direction: 'buy' },
}

describe('수급 행', () => {
  it('날짜 순으로 놓고 그날 종가·등락률을 일봉에서 붙인다', () => {
    const days = flowDays(flows, candles)
    expect(days.map((d) => d.date)).toEqual(['2026-09-23', '2026-09-29'])
    expect(days[0]).toMatchObject({ foreign: 4513767, close: 272500 })
    expect(days[0].change).toBeCloseTo(0.9259, 3)
    expect(days[1].change).toBeCloseTo(0.5535, 3)
    expect(flowDays(flows, null)[1]).toMatchObject({ close: null, change: null })
  })

  it('일봉에 API 등락률이 있으면 직전 종가 대신 그 값을 붙인다', () => {
    const rated = candles.map((c) => (c.date === '2026-09-29' ? { ...c, changeRate: 0.3 } : c))
    const days = flowDays(flows, rated)
    expect(days[1].change).toBe(0.3)
    expect(days[0].change).toBeCloseTo(0.9259, 3)
    expect(flowDays([flow('2026-09-22', 1, 1, 1)], [{ ...candles[0], changeRate: -0.5 }])[0].change).toBe(-0.5)
    expect(flowDays([flow('2026-09-22', 1, 1, 1)], [{ ...candles[0], changeRate: null }])[0].change).toBeNull()
  })

  it('기간 선택지는 가진 기록을 넘는 만큼만', () => {
    expect(flowRangeOptions(2).map((r) => r.value)).toEqual(['20'])
    expect(flowRangeOptions(21).map((r) => r.value)).toEqual(['20', '60'])
    expect(flowRangeOptions(120).map((r) => r.value)).toEqual(['20', '60', '120'])
  })

  it('기간 창과 누적', () => {
    const days = flowDays(flows, candles)
    expect(flowWindow(days, '20')).toHaveLength(2)
    expect(runningTotals(days)).toEqual([
      { foreign: 4513767, institution: 1346883, individual: -7630126 },
      { foreign: 2005398, institution: 1400642, individual: -7207849 },
    ])
    expect(runningTotals([{ ...days[0], institution: null }])[0].institution).toBe(0)
  })

  it('세 투자자는 0을 넣은 같은 눈금을 쓴다', () => {
    const days = flowDays(flows, candles)
    expect(sharedScale(days, runningTotals(days), 'cum')).toEqual({ lo: -7630126, hi: 4513767 })
    expect(sharedScale(days, runningTotals(days), 'day')).toEqual({ lo: -7630126, hi: 4513767 })
    expect(sharedScale([], [], 'day')).toEqual({ lo: 0, hi: 0 })
  })
})

describe('수급 문구', () => {
  it('수량은 만 주 소수 첫째 자리', () => {
    expect(formatShares(2005398)).toBe('+200.5만 주')
    expect(formatShares(-7207849)).toBe('−720.8만 주')
    expect(formatShares(null)).toBe('—')
    expect(formatAxisShares(-250.8)).toBe('−251')
    expect(formatAxisShares(5.4)).toBe('5.4')
    expect(formatAxisShares(0)).toBe('0')
  })

  it('연속 일수', () => {
    expect(streakNote({ days: 5, direction: 'buy' })).toBe('순매수 5일째')
    expect(streakNote({ days: 2, direction: 'sell' })).toBe('순매도 2일째')
    expect(streakNote({ days: 0, direction: null })).toBe('')
  })

  it('결론은 외국인·기관의 연속 일수, 하루면 일수를 빼고 말한다', () => {
    expect(
      flowLead({ foreign: { days: 5, direction: 'buy' }, institution: { days: 2, direction: 'sell' }, individual: { days: 1, direction: 'sell' } }),
    ).toBe('외국인은 5일 연속 사고, 기관은 2일 연속 팔았어요.')
    expect(flowLead(streaks)).toBe('외국인은 팔고, 기관은 샀어요.')
    expect(flowLead({ ...streaks, institution: { days: 2, direction: 'sell' } })).toBe('외국인은 팔고, 기관도 2일 연속 팔았어요.')
    expect(flowLead({ ...streaks, institution: { days: 0, direction: null } })).toBe('외국인은 팔았어요.')
    expect(flowLead({ ...streaks, foreign: { days: 0, direction: null }, institution: { days: 3, direction: 'buy' } })).toBe(
      '기관은 3일 연속 샀어요.',
    )
    expect(flowLead({ ...streaks, foreign: { days: 0, direction: null }, institution: { days: 0, direction: null } })).toBe('')
  })

  it('보충은 기간 개인 합계의 부호', () => {
    const days = flowDays(flows, candles)
    expect(flowTail(days)).toBe('개인은 최근 2일 동안 판 주식이 더 많아요.')
    expect(flowTail(days.slice(1))).toBe('개인은 최근 1일 동안 산 주식이 더 많아요.')
    expect(flowTail([])).toBeNull()
  })

  it('읽기 칸: 누적 기본은 연속 일수, 호버하면 그날 값', () => {
    const window = flowDays(flows, candles)
    const totals = runningTotals(window)
    const base = flowReading({ window, totals, hover: null, mode: 'cum', streaks, refYear: 2026 })
    expect(base.when).toBe('9월 29일(화)까지 2일 누적')
    expect(base.items).toEqual([
      { key: 'foreign', who: '외국인', value: '+200.5만 주', tone: 'up', note: '순매도 1일째' },
      { key: 'institution', who: '기관', value: '+140.1만 주', tone: 'up', note: '순매수 1일째' },
      { key: 'individual', who: '개인', value: '−720.8만 주', tone: 'down', note: '순매수 1일째' },
    ])
    const hovered = flowReading({ window, totals, hover: 0, mode: 'cum', streaks, refYear: 2026 })
    expect(hovered.when).toBe('9월 23일(수)까지 1일 누적')
    expect(hovered.items[0]).toMatchObject({ value: '+451.4만 주', note: '그날 +451.4만 주' })
    const day = flowReading({ window, totals, hover: 0, mode: 'day', streaks, refYear: 2026 })
    expect(day.when).toBe('9월 23일(수) 하루')
    expect(day.items[2]).toMatchObject({ value: '−763.0만 주', note: '' })
    expect(flowReading({ window, totals, hover: null, mode: 'day', streaks, refYear: 2026 }).items[0].note).toBe('순매도 1일째')
  })

  it('스크린리더 값과 도움말', () => {
    const [, last] = flowDays(flows, candles)
    expect(flowValueText(last, 2026)).toBe('9월 29일(화), 외국인 −250.8만 주, 기관 +5.4만 주, 개인 +42.2만 주')
    expect(flowHelp('cum')).toBe(
      '기간 첫날부터 더한 순매수예요 · 빨강은 산 주식이 더 많고 파랑은 판 주식이 더 많아요 · 세 투자자는 같은 눈금 · 키보드 ← →',
    )
    expect(flowHelp('day').startsWith('하루 순매수예요 · ')).toBe(true)
  })

  it('외국인 보유율과 기간 증감', () => {
    const days = flowDays(flows, candles)
    const holding = foreignHolding(days)
    expect(holding.ratio).toBe(46.4653)
    expect(holding.change).toBeCloseTo(-0.1794, 4)
    expect(holdingText(holding, 2)).toBe('외국인 보유율 46.5% · 최근 2일 동안 −0.18%p')
    expect(holdingText(foreignHolding(days.slice(1)), 1)).toBe('외국인 보유율 46.5%')
    expect(holdingText(foreignHolding([]), 0)).toBeNull()
  })

  it('최근 5거래일 표는 최신부터, 날짜는 MM.DD 요일', () => {
    const days = flowDays(flows, candles)
    expect(recentFlowRows(days).map((d) => d.date)).toEqual(['2026-09-29', '2026-09-23'])
    expect(flowDateLabel('2026-09-29')).toBe('09.29 화')
  })

  it('한눈에 보기 외국인 칸은 최근 20일 합', () => {
    const days = flowDays(flows, candles)
    expect(foreignSummary(days, streaks)).toEqual({ days: 2, total: 2005398, note: '순매도 1일째' })
    expect(foreignSummary([], streaks)).toBeNull()
  })
})
