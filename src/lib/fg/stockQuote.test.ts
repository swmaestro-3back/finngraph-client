import { describe, expect, it } from 'vitest'
import type { CandleRes, InvestorFlowRes, ThemeStockRes } from '@/lib/apiTypes'
import {
  changeAmount,
  flowTotals,
  formatManShares,
  formatRatio,
  formatTimes,
  sparkModel,
  stockStatus,
  stockSummary,
  tradingValueOf,
  week52FromCandles,
  week52State,
  week52Summary,
} from '@/lib/fg/stockQuote'

function candle(date: string, close: number, volume = 1000): CandleRes {
  return { date, open: close, high: close + 100, low: close - 100, close, volume }
}

function flow(date: string, foreignNet: number | null, institutionNet: number | null, individualNet: number | null, foreignRatio: number | null = null): InvestorFlowRes {
  return { date, foreignNet, institutionNet, individualNet, foreignRatio }
}

describe('week52FromCandles', () => {
  const candles = [
    candle('2025-09-01', 99999),
    candle('2025-09-30', 500),
    candle('2025-10-01', 700),
    candle('2026-03-02', 300),
    candle('2026-06-01', 900),
    candle('2026-09-29', 900),
    candle('2026-09-30', 800),
  ]

  it('마지막 거래일로부터 1년 안의 종가 최고·최저와 그날을 구한다', () => {
    expect(week52FromCandles(candles, false)).toEqual({
      high: 900,
      highDate: '2026-06-01',
      low: 300,
      lowDate: '2026-03-02',
    })
  })

  it('같은 종가가 다시 나와도 처음 그 값에 닿은 날을 최고·최저일로 둔다', () => {
    const ties = [candle('2025-12-01', 500), candle('2026-09-14', 8110), candle('2026-09-29', 500), candle('2026-09-30', 8110)]
    expect(week52FromCandles(ties, true)).toEqual({
      high: 8110,
      highDate: '2026-09-14',
      low: 500,
      lowDate: '2025-12-01',
    })
  })

  it('1년 전까지 닿지 못하고 더 받을 캔들이 남았으면 계산하지 않는다', () => {
    expect(week52FromCandles(candles.slice(2), false)).toBeNull()
  })

  it('상장 1년이 안 돼 캔들을 다 받았으면 그 구간으로 계산한다', () => {
    expect(week52FromCandles(candles.slice(2), true)).toMatchObject({ high: 900, low: 300 })
  })

  it('캔들이 없으면 null', () => {
    expect(week52FromCandles([], true)).toBeNull()
  })
})

describe('week52Summary', () => {
  it('목록 패널과 상세 머리가 같은 52주 값·상태·기준일을 쓴다', () => {
    const candles = [candle('2025-09-30', 500), candle('2026-09-29', 1000), candle('2026-09-30', 900)]
    expect(week52Summary(candles)).toEqual({
      range: { high: 1000, highDate: '2026-09-29', low: 900, lowDate: '2026-09-30' },
      state: 'low',
      asOf: '2026-09-30',
    })
    expect(week52Summary([])).toBeNull()
  })

  it('마지막 날 종가가 직전 최고와 같으면 신고가가 아니다', () => {
    const candles = [candle('2025-12-01', 3795), candle('2026-09-14', 8110), candle('2026-09-29', 6610), candle('2026-09-30', 8110)]
    expect(week52Summary(candles)).toMatchObject({ range: { high: 8110, highDate: '2026-09-14' }, state: 'normal' })
  })

  it('거래정지로 거래량이 0인 날은 같은 값이 이어져도 신고가·신저가로 보지 않는다', () => {
    const halted = [candle('2025-12-01', 2650), candle('2026-09-29', 16730), candle('2026-09-30', 16730, 0)]
    expect(week52Summary(halted)?.state).toBe('normal')
    const lows = [candle('2025-11-14', 2015), candle('2026-07-31', 561, 0), candle('2026-09-30', 561, 0)]
    expect(week52Summary(lows)).toMatchObject({ range: { low: 561, lowDate: '2026-07-31' }, state: 'normal' })
  })
})

describe('week52State', () => {
  const range = { high: 900, highDate: '2026-09-30', low: 300, lowDate: '2026-03-02' }

  const last = { date: '2026-09-30', volume: 1000 }

  it('마지막 거래일 종가가 최고면 신고가, 최저면 신저가', () => {
    expect(week52State(range, last)).toBe('high')
    expect(week52State({ ...range, highDate: '2026-06-01', lowDate: '2026-09-30' }, last)).toBe('low')
    expect(week52State({ ...range, highDate: '2026-06-01' }, last)).toBe('normal')
  })

  it('최고와 최저가 같으면 어느 쪽도 아니다', () => {
    expect(week52State({ high: 500, highDate: '2026-09-30', low: 500, lowDate: '2026-09-30' }, last)).toBe('normal')
  })

  it('마지막 날 거래량이 0이면 판정하지 않는다', () => {
    expect(week52State(range, { ...last, volume: 0 })).toBe('normal')
    expect(week52State({ ...range, highDate: '2026-06-01', lowDate: '2026-09-30' }, { ...last, volume: 0 })).toBe('normal')
  })
})

describe('stockStatus', () => {
  const traded = [candle('2026-09-29', 100), candle('2026-09-30', 99, 1634287)]
  const halted = [candle('2026-09-29', 16730), candle('2026-09-30', 16730, 0)]

  it('대표 테마 종목 목록의 정리매매·거래정지 표시를 그대로 쓴다', () => {
    expect(stockStatus({ changeStatus: 'DELISTING', tradingSuspended: false, delistingTrade: true }, traded)).toBe('DELISTING')
    expect(stockStatus({ changeStatus: 'SUSPENDED', tradingSuspended: true, delistingTrade: false }, halted)).toBe('SUSPENDED')
    expect(stockStatus({ tradingSuspended: true }, traded)).toBe('SUSPENDED')
    expect(stockStatus({ changeStatus: 'DELISTING' }, traded)).toBe('DELISTING')
  })

  it('테마 쪽에 상태가 있으면 캔들보다 그 값을 믿는다', () => {
    expect(stockStatus({ changeStatus: 'PRICED', tradingSuspended: false, delistingTrade: false }, halted)).toBeNull()
    expect(stockStatus({ changeStatus: 'TRIMMED' }, traded)).toBeNull()
  })

  it('상태 정보가 없으면 마지막 캔들 거래량 0을 거래정지로 본다', () => {
    expect(stockStatus(null, halted)).toBe('SUSPENDED')
    expect(stockStatus({}, halted)).toBe('SUSPENDED')
    expect(stockStatus(null, traded)).toBeNull()
    expect(stockStatus(null, [])).toBeNull()
    expect(stockStatus(null, null)).toBeNull()
  })
})

describe('changeAmount', () => {
  const candles = [candle('2026-09-29', 272500), candle('2026-09-30', 268500)]

  it('마지막 두 종가의 차이가 서버 등락률과 맞을 때만 변동액으로 쓴다', () => {
    expect(changeAmount(candles, 268500, -1.4679)).toBe(-4000)
  })

  it('현재가가 마지막 종가와 다르거나 등락률이 어긋나면 null', () => {
    expect(changeAmount(candles, 269000, -1.4679)).toBeNull()
    expect(changeAmount(candles, 268500, -1.2)).toBeNull()
    expect(changeAmount(candles.slice(1), 268500, -1.4679)).toBeNull()
    expect(changeAmount(candles, null, -1.4679)).toBeNull()
  })
})

describe('sparkModel', () => {
  const candles = [
    candle('2026-06-01', 100),
    candle('2026-06-30', 100),
    candle('2026-07-15', 200),
    candle('2026-08-14', 150),
    candle('2026-09-30', 120),
  ]

  it('최근 3달 종가로 선·면 경로와 끝점 위치, 기간 등락을 만든다', () => {
    const spark = sparkModel(candles, 3)
    expect(spark).not.toBeNull()
    expect(spark?.first).toEqual({ date: '2026-06-30', close: 100 })
    expect(spark?.last).toEqual({ date: '2026-09-30', close: 120 })
    expect(spark?.move).toBeCloseTo(20)
    expect(spark?.line).toBe('M0.0,52.0L100.0,4.0L200.0,28.0L300.0,42.4')
    expect(spark?.area).toBe('M0,56L0.0,52.0L100.0,4.0L200.0,28.0L300.0,42.4L300,56Z')
    expect(spark?.dotTop).toBeCloseTo((42.4 / 56) * 100)
  })

  it('값이 모두 같으면 가운데 줄, 점이 하나면 그리지 않는다', () => {
    const flat = sparkModel([candle('2026-09-29', 100), candle('2026-09-30', 100)], 3)
    expect(flat?.line).toBe('M0.0,28.0L300.0,28.0')
    expect(sparkModel([candle('2026-09-30', 100)], 3)).toBeNull()
  })
})

describe('flowTotals', () => {
  it('받은 날들의 순매수를 투자자별로 더하고 마지막 외국인 보유율을 쓴다', () => {
    const totals = flowTotals([
      flow('2026-09-23', 4513767, 1346883, -7630126, 46.6447),
      flow('2026-09-29', -2508369, 53759, 422277, 46.4653),
    ])
    expect(totals).toEqual({
      foreign: 2005398,
      institution: 1400642,
      individual: -7207849,
      days: 2,
      from: '2026-09-23',
      to: '2026-09-29',
      foreignRatio: 46.4653,
    })
  })

  it('한 투자자의 값이 모두 없으면 그 칸은 null', () => {
    expect(flowTotals([flow('2026-09-30', null, 10, null)])).toMatchObject({ foreign: null, institution: 10, individual: null, foreignRatio: null })
    expect(flowTotals([])).toBeNull()
  })
})

describe('formatManShares', () => {
  it('만 주 단위 소수 첫째 자리, 부호와 U+2212', () => {
    expect(formatManShares(2005398)).toBe('+200.5')
    expect(formatManShares(-7207849)).toBe('−720.8')
    expect(formatManShares(123456789)).toBe('+12,345.7')
    expect(formatManShares(400)).toBe('0.0')
  })
})

describe('formatTimes / formatRatio', () => {
  it('배수는 소수 첫째 자리 배, 비율은 소수 첫째 자리 %', () => {
    expect(formatTimes(12.02)).toBe('12.0배')
    expect(formatTimes(-3.26)).toBe('−3.3배')
    expect(formatTimes(null)).toBe('—')
    expect(formatRatio(46.4653)).toBe('46.5%')
    expect(formatRatio(-44.32)).toBe('−44.3%')
    expect(formatRatio(-0.01)).toBe('0.0%')
    expect(formatRatio(null)).toBe('—')
  })
})

describe('tradingValueOf', () => {
  const stocks = [
    { ticker: '005930', tradingValue: 4456294195882 },
    { ticker: '000660', tradingValue: null },
  ] as ThemeStockRes[]

  it('테마 종목 목록에서 그 종목의 거래대금을 찾는다', () => {
    expect(tradingValueOf(stocks, '005930')).toBe(4456294195882)
    expect(tradingValueOf(stocks, '000660')).toBeNull()
    expect(tradingValueOf(stocks, '035420')).toBeNull()
    expect(tradingValueOf(null, '005930')).toBeNull()
  })
})

describe('stockSummary', () => {
  const candles = [candle('2025-09-30', 500), candle('2026-09-29', 1000), candle('2026-09-30', 1100)]

  it('캔들·수급·테마 종목이 모두 오면 요약 칸을 채운다', () => {
    const summary = stockSummary({
      ticker: '005930',
      price: 1100,
      change: 10,
      candles,
      flows: [flow('2026-09-30', 20000, -10000, -10000, 50.12)],
      themeStocks: [{ ticker: '005930', tradingValue: 777 }],
    })
    expect(summary.loading).toBe(false)
    expect(summary.amount).toBe(100)
    expect(summary.week52).toEqual({
      range: { high: 1100, highDate: '2026-09-30', low: 1000, lowDate: '2026-09-29' },
      state: 'high',
      asOf: '2026-09-30',
    })
    expect(summary.spark?.last.close).toBe(1100)
    expect(summary.flows?.foreign).toBe(20000)
    expect(summary.flowsLoading).toBe(false)
    expect(summary.tradingValue).toBe(777)
    expect(summary.tradingLoading).toBe(false)
    expect(summary.status).toBeNull()
  })

  it('아직 오지 않은 것은 로딩으로 두고 값은 비운다', () => {
    const summary = stockSummary({ ticker: '005930', price: 1100, change: 10, candles: null, flows: null, themeStocks: null })
    expect(summary).toEqual({
      loading: true,
      candlesFailed: false,
      amount: null,
      week52: null,
      spark: null,
      flows: null,
      flowsLoading: true,
      flowsFailed: false,
      tradingValue: null,
      tradingLoading: true,
      tradingFailed: false,
      status: null,
    })
  })

  it('받지 못한 것은 로딩도 빈 값도 아닌 실패로 둔다', () => {
    const summary = stockSummary({
      ticker: '005930',
      price: 1100,
      change: 10,
      candles: [],
      flows: [],
      themeStocks: [],
      failed: { candles: true, flows: true, themeStocks: true },
    })
    expect(summary).toMatchObject({
      loading: false,
      candlesFailed: true,
      flowsLoading: false,
      flowsFailed: true,
      tradingLoading: false,
      tradingFailed: true,
    })
  })

  it('정리매매·거래정지 상태를 테마 종목 목록이나 캔들 거래량에서 가져온다', () => {
    const base = { ticker: '196490', price: 99, change: -1, flows: [] }
    expect(
      stockSummary({
        ...base,
        candles,
        themeStocks: [{ ticker: '196490', tradingValue: 161807830, changeStatus: 'DELISTING', tradingSuspended: false, delistingTrade: true }],
      }).status,
    ).toBe('DELISTING')
    const halted = [candle('2026-09-29', 16730), candle('2026-09-30', 16730, 0)]
    expect(stockSummary({ ...base, ticker: '109670', candles: halted, themeStocks: [] }).status).toBe('SUSPENDED')
  })
})
