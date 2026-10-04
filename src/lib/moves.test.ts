import { describe, expect, it } from 'vitest'
import type { CandleRes, InvestorFlowRes, NewsDetail, StockContractRes } from '@/lib/apiTypes'
import {
  MOVE_LIMIT,
  NO_ISSUE_DETAIL,
  NO_ISSUE_TITLE,
  NO_MOVES_TEXT,
  evidenceCountText,
  flowText,
  limitText,
  notableMoves,
  volumeRatioText,
} from '@/lib/moves'

function tradingDays(count: number, end = '2026-09-30'): string[] {
  const days: string[] = []
  const d = new Date(`${end}T00:00:00Z`)
  while (days.length < count) {
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) days.unshift(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return days
}

function flatCandles(count: number, overrides: Record<string, { close?: number; volume?: number }> = {}): CandleRes[] {
  return tradingDays(count).map((date) => {
    const o = overrides[date] ?? {}
    const close = o.close ?? 10_000
    return { date, open: close, high: close, low: close, close, volume: o.volume ?? 1_000 }
  })
}

const news = (id: string, at: string): NewsDetail => ({
  id,
  title: `뉴스 ${id}`,
  summary: '',
  url: '',
  collectedAt: at,
  tripleExtracted: true,
})

const contract = (rceptDate: string, role: StockContractRes['role'] = 'FILER'): StockContractRes => ({
  rceptNo: `${rceptDate}-${role}`,
  rceptDate,
  reportName: '단일판매ㆍ공급계약체결',
  role,
  contractType: null,
  contractName: '장비 공급',
  counterpartyName: '상대방',
  counterpartyTicker: null,
  contractAmount: 1_000_000_000,
  salesRatio: 12.3,
  startDate: null,
  endDate: null,
  link: 'https://dart.fss.or.kr',
  isCorrection: false,
})

describe('notableMoves — 선별 기준', () => {
  it('등락률 5% 이상은 포함하고 4.99%는 뺀다', () => {
    const days = tradingDays(30)
    const candles = flatCandles(30, {
      [days[28]]: { close: 10_499 },
      [days[29]]: { close: 11_024 },
    })
    const moves = notableMoves(candles, [], [], [])
    expect(moves.map((m) => m.date)).toEqual([days[29]])
    expect(moves[0].change).toBeCloseTo(5.0, 1)
  })

  it('거래량이 직전 20거래일 평균의 3배 이상이면 포함한다', () => {
    const days = tradingDays(30)
    const candles = flatCandles(30, { [days[29]]: { volume: 3_000 }, [days[8]]: { volume: 2_990 } })
    const moves = notableMoves(candles, [], [], [])
    expect(moves.map((m) => m.date)).toEqual([days[29]])
    expect(moves[0].volumeRatio).toBeCloseTo(3, 5)
  })

  it('거래량 0은 거래 정지로 포함하고 거래량 배수는 비운다', () => {
    const days = tradingDays(30)
    const moves = notableMoves(flatCandles(30, { [days[29]]: { volume: 0 } }), [], [], [])
    expect(moves).toHaveLength(1)
    expect(moves[0].halted).toBe(true)
    expect(moves[0].volumeRatio).toBeNull()
  })

  it('연속 상한가는 며칠째인지 센다', () => {
    const days = tradingDays(30)
    const moves = notableMoves(
      flatCandles(30, { [days[28]]: { close: 13_000 }, [days[29]]: { close: 16_900 } }),
      [],
      [],
      [],
    )
    expect(moves[0].date).toBe(days[29])
    expect(moves[0].limit).toBe('UP')
    expect(moves[0].limitStreak).toBe(2)
    expect(moves[1].limitStreak).toBe(1)
  })

  it('최근 60거래일 밖의 움직임은 보지 않는다', () => {
    const days = tradingDays(90)
    const candles = flatCandles(90, { [days[29]]: { close: 12_000 } })
    const moves = notableMoves(candles, [], [], [])
    expect(moves.map((m) => m.date)).toEqual([days[30]])
    expect(moves[0].change).toBeCloseTo(-16.67, 1)
  })

  it('최신순 최대 20건', () => {
    const days = tradingDays(60)
    const overrides: Record<string, { close: number }> = {}
    days.forEach((d, i) => {
      overrides[d] = { close: i % 2 === 0 ? 10_000 : 11_000 }
    })
    const moves = notableMoves(flatCandles(60, overrides), [], [], [])
    expect(moves).toHaveLength(MOVE_LIMIT)
    expect(moves[0].date).toBe(days[59])
    expect(moves[0].date > moves[1].date).toBe(true)
  })

  it('정렬되지 않은 일봉도 날짜순으로 계산한다', () => {
    const days = tradingDays(30)
    const candles = flatCandles(30, { [days[29]]: { close: 11_000 } }).reverse()
    expect(notableMoves(candles, [], [], [])[0].date).toBe(days[29])
  })

  it('큰 움직임이 없으면 빈 배열', () => {
    expect(notableMoves(flatCandles(40), [], [], [])).toEqual([])
    expect(notableMoves([], [], [], [])).toEqual([])
  })
})

describe('notableMoves — 근거 붙이기', () => {
  const days = tradingDays(30, '2026-09-30')
  const candles = flatCandles(30, {
    '2026-09-25': { close: 11_000 },
    '2026-09-28': { close: 12_100 },
    '2026-09-29': { close: 13_310 },
    '2026-09-30': { close: 14_641 },
  })

  it('뉴스는 KST 날짜 기준 그 거래일 칸에, 주말 뉴스는 다음 거래일에 붙는다', () => {
    const moves = notableMoves(
      candles,
      [],
      [
        news('a', '2026-09-29T06:00:00Z'),
        news('b', '2026-09-26T03:00:00Z'),
        news('c', '2026-09-29T15:30:00Z'),
        news('d', '2026-09-24T14:59:00Z'),
      ],
      [],
    )
    const byDate = Object.fromEntries(moves.map((m) => [m.date, m.news.map((n) => n.id)]))
    expect(byDate['2026-09-29']).toEqual(['a'])
    expect(byDate['2026-09-28']).toEqual(['b'])
    expect(byDate['2026-09-30']).toEqual(['c'])
    expect(byDate['2026-09-25']).toEqual([])
    expect(days).toContain('2026-09-25')
  })

  it('공시는 이 종목이 제출한 것만 접수일 칸에 붙인다', () => {
    const moves = notableMoves(
      candles,
      [],
      [],
      [contract('2026-09-29'), contract('2026-09-29', 'COUNTERPARTY'), contract('2026-09-27')],
    )
    const byDate = Object.fromEntries(moves.map((m) => [m.date, m.contracts.length]))
    expect(byDate['2026-09-29']).toBe(1)
    expect(byDate['2026-09-28']).toBe(1)
  })

  it('수급은 같은 날짜 것을 붙이고 없으면 null', () => {
    const flows: InvestorFlowRes[] = [
      { date: '2026-09-29', foreignNet: 7, institutionNet: 0, individualNet: -542, foreignRatio: 0.6 },
    ]
    const moves = notableMoves(candles, flows, [], [])
    const at = (d: string) => moves.find((m) => m.date === d)
    expect(at('2026-09-29')?.flows).toEqual({ foreign: 7, institution: 0, individual: -542 })
    expect(at('2026-09-30')?.flows).toBeNull()
  })
})

describe('문구', () => {
  it('거래량 배수·상한가·수급·근거 개수', () => {
    expect(volumeRatioText(4.83)).toBe('거래량 평소의 4.8배')
    expect(limitText({ limit: 'UP', limitStreak: 1 })).toBe('상한가')
    expect(limitText({ limit: 'UP', limitStreak: 2 })).toBe('상한가 2일 연속')
    expect(limitText({ limit: 'DOWN', limitStreak: 3 })).toBe('하한가 3일 연속')
    expect(limitText({ limit: null, limitStreak: 0 })).toBeNull()
    expect(flowText({ foreign: 7, institution: 0, individual: -542 })).toBe('외국인 +7주 · 기관 0주 · 개인 −542주')
    expect(flowText({ foreign: -11_805, institution: null, individual: 1_200_000 })).toBe(
      '외국인 −11,805주 · 개인 +1,200,000주',
    )
    expect(flowText(null)).toBeNull()
    expect(evidenceCountText({ news: [news('a', '2026-09-29T06:00:00Z')], contracts: [] })).toBe('뉴스 1 · 공시 0')
  })

  it('근거 없음·움직임 없음 문구는 상수 한 곳', () => {
    expect(NO_ISSUE_TITLE).toBe('확인된 이슈 없음')
    expect(NO_ISSUE_DETAIL).toBe('수집된 뉴스·공시가 없습니다')
    expect(NO_MOVES_TEXT).toBe('최근 60거래일 동안 큰 움직임이 없었습니다')
  })
})
