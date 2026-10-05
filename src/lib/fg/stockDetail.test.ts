import { describe, expect, it } from 'vitest'
import type { InvestorFlowRes, StockRowRes } from '@/lib/apiTypes'
import {
  capRankLabel,
  companySummary,
  isAiSummary,
  marketCapRank,
  median,
  navState,
  parseStockTab,
  sheetPushed,
  stockBasisLabel,
  stockTabSearch,
  streakLabels,
  themeCompare,
  withIssue,
} from '@/lib/fg/stockDetail'

function row(ticker: string, market: string, marketCap: number | null, extra: Partial<StockRowRes> = {}): StockRowRes {
  return {
    ticker,
    name: ticker,
    market,
    price: 1000,
    change: 0,
    w1: null,
    m1: null,
    m3: null,
    marketCap,
    per: null,
    pbr: null,
    roe: null,
    dividendYield: null,
    themeId: null,
    themeName: null,
    ...extra,
  }
}

function flow(date: string, foreignNet: number | null, institutionNet: number | null): InvestorFlowRes {
  return { date, foreignNet, institutionNet, individualNet: null, foreignRatio: null }
}

describe('parseStockTab', () => {
  it('쿼리가 없거나 모르는 값이면 개요', () => {
    expect(parseStockTab('')).toBe('overview')
    expect(parseStockTab('?tab=reason')).toBe('overview')
    expect(parseStockTab('?tab=')).toBe('overview')
  })

  it('네 탭 값을 읽는다', () => {
    expect(parseStockTab('?tab=news')).toBe('news')
    expect(parseStockTab('?tab=links')).toBe('links')
    expect(parseStockTab('?tab=finance&issue=export-3')).toBe('finance')
    expect(parseStockTab('?tab=overview')).toBe('overview')
  })
})

describe('stockTabSearch', () => {
  it('개요는 탭 쿼리를 남기지 않는다', () => {
    expect(stockTabSearch('?tab=news', 'overview')).toBe('')
    expect(stockTabSearch('', 'overview')).toBe('')
  })

  it('다른 탭은 tab=만 바꾸고 탭에 묶인 이슈 시트는 닫는다', () => {
    expect(stockTabSearch('', 'news')).toBe('?tab=news')
    expect(stockTabSearch('?issue=export-3', 'finance')).toBe('?tab=finance')
    expect(stockTabSearch('?tab=news&issue=export-3', 'links')).toBe('?tab=links')
  })

  it('탭과 상관없는 쿼리는 그대로 둔다', () => {
    expect(stockTabSearch('?gaps=off&tab=news', 'overview')).toBe('?gaps=off')
    expect(stockTabSearch('?gaps=off', 'news')).toBe('?gaps=off&tab=news')
  })
})

describe('withIssue', () => {
  it('이슈 시트를 열고 닫는 쿼리를 만든다', () => {
    expect(withIssue('', 'export-3')).toBe('?issue=export-3')
    expect(withIssue('?tab=news', 'export-3')).toBe('?tab=news&issue=export-3')
    expect(withIssue('?tab=news&issue=export-3', null)).toBe('?tab=news')
    expect(withIssue('?issue=export-3', null)).toBe('')
  })
})

describe('navState', () => {
  it('뒤로 가기 출발점만 넘기고, 시트를 열 때는 열었다는 표시를 더한다', () => {
    expect(navState({ from: '/stocks?code=005930', sheet: true })).toEqual({ from: '/stocks?code=005930' })
    expect(navState({ from: '/themes/26' }, true)).toEqual({ from: '/themes/26', sheet: true })
    expect(navState(null, true)).toEqual({ sheet: true })
    expect(navState(undefined)).toEqual({})
  })

  it('이 화면이 연 시트인지 안다', () => {
    expect(sheetPushed({ sheet: true })).toBe(true)
    expect(sheetPushed({ from: '/stocks' })).toBe(false)
    expect(sheetPushed(null)).toBe(false)
  })
})

describe('marketCapRank', () => {
  const stocks = [
    row('A', 'KOSPI', 500),
    row('B', 'KOSPI', 900),
    row('C', 'KOSDAQ', 2000),
    row('D', 'KOSPI', null),
    row('E', 'KOSPI', 700),
  ]

  it('같은 시장 안에서 시가총액이 더 큰 종목 수 + 1', () => {
    expect(marketCapRank(stocks, 'B')).toEqual({ market: 'KOSPI', rank: 1 })
    expect(marketCapRank(stocks, 'A')).toEqual({ market: 'KOSPI', rank: 3 })
    expect(marketCapRank(stocks, 'C')).toEqual({ market: 'KOSDAQ', rank: 1 })
  })

  it('목록에 없거나 시가총액이 없으면 null', () => {
    expect(marketCapRank(stocks, 'Z')).toBeNull()
    expect(marketCapRank(stocks, 'D')).toBeNull()
  })

  it('라벨은 시장 이름과 순위', () => {
    expect(capRankLabel({ market: 'KOSPI', rank: 3 })).toBe('코스피 3위')
    expect(capRankLabel({ market: 'KOSDAQ', rank: 12 })).toBe('코스닥 12위')
  })
})

describe('median', () => {
  it('값이 있는 것만으로 중앙값을 구한다', () => {
    expect(median([3, null, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([null, null])).toBeNull()
    expect(median([])).toBeNull()
  })
})

describe('themeCompare', () => {
  const index = new Map(
    [
      row('A', 'KOSPI', 1, { per: 10, pbr: 1, roe: 5, dividendYield: 1 }),
      row('B', 'KOSPI', 1, { per: 20, pbr: 2, roe: null, dividendYield: 2 }),
      row('C', 'KOSDAQ', 1, { per: 30, pbr: 3, roe: 15, dividendYield: null }),
    ].map((stock) => [stock.ticker, stock]),
  )

  it('테마 구성 종목의 지표별 중앙값과 구성 종목 수', () => {
    expect(themeCompare([{ ticker: 'A' }, { ticker: 'B' }, { ticker: 'C' }, { ticker: 'X' }], index)).toEqual({
      count: 4,
      per: 20,
      pbr: 2,
      roe: 10,
      dividendYield: 1.5,
    })
  })

  it('견줄 종목이 셋보다 적으면 비교하지 않는다', () => {
    expect(themeCompare([{ ticker: 'A' }, { ticker: 'B' }], index)).toBeNull()
  })
})

describe('streakLabels', () => {
  it('외국인·기관의 2일 이상 연속 순매수·순매도를 배지 문구로', () => {
    const flows = [
      flow('2026-09-24', -1, 5),
      flow('2026-09-25', 3, -1),
      flow('2026-09-26', 2, -2),
      flow('2026-09-29', 1, 4),
      flow('2026-09-30', 5, 1),
    ]
    expect(streakLabels(flows)).toEqual(['외국인 4일 연속 순매수', '기관 2일 연속 순매수'])
  })

  it('하루뿐이거나 기록이 없으면 빼고, 날짜 순서를 믿지 않는다', () => {
    expect(streakLabels([flow('2026-09-30', -3, 2), flow('2026-09-29', -1, -2)])).toEqual(['외국인 2일 연속 순매도'])
    expect(streakLabels([])).toEqual([])
  })

  it('거래일 달력이 있으면 기록이 빠진 거래일에서 끊는다', () => {
    const flows = [flow('2026-09-23', 4, 1), flow('2026-09-29', 2, 1)]
    expect(streakLabels(flows)).toEqual(['외국인 2일 연속 순매수', '기관 2일 연속 순매수'])
    expect(streakLabels(flows, ['2026-09-23', '2026-09-28', '2026-09-29'])).toEqual([])
  })
})

describe('stockBasisLabel', () => {
  it('장 마감 뒤에는 종목 기준일의 종가 기준', () => {
    expect(stockBasisLabel({ baseDate: '2026-09-30', valuationDate: '2026-09-30' }, { updatedAt: '2026-09-30T07:10:00Z' })).toBe(
      '9월 30일(수) 종가 기준 · 통합(KRX+NXT)',
    )
  })

  it('장중에는 시세 갱신 시각', () => {
    expect(stockBasisLabel({ baseDate: '2026-10-05', valuationDate: '2026-10-02' }, { updatedAt: '2026-10-05T02:05:00Z' })).toBe(
      '10월 5일(월) 11:05 기준 · 통합(KRX+NXT)',
    )
  })

  it('기준일이 없으면 null', () => {
    expect(stockBasisLabel({ baseDate: null, valuationDate: null }, null)).toBeNull()
  })
})

describe('companySummary', () => {
  it('첫 문장을 머리에, 나머지를 펼침에 둔다', () => {
    expect(companySummary('메모리를 만듭니다. 공장은 두 곳입니다.\n해외에도 팝니다.')).toEqual({
      lead: '메모리를 만듭니다.',
      rest: ['공장은 두 곳입니다.', '해외에도 팝니다.'],
    })
  })

  it('비어 있으면 null', () => {
    expect(companySummary(null)).toBeNull()
    expect(companySummary('   ')).toBeNull()
  })
})

describe('isAiSummary', () => {
  it('DART 사업보고서 AI 요약만 AI 요약 배지를 단다', () => {
    expect(isAiSummary('DART_LLM')).toBe(true)
    expect(isAiSummary('NAVER')).toBe(false)
    expect(isAiSummary(null)).toBe(false)
  })
})
