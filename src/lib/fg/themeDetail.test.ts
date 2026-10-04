import { describe, expect, it } from 'vitest'
import type { ThemeLeaderRes, ThemeStockRes } from '@/lib/apiTypes'
import {
  DEFAULT_MEMBER_SORT,
  capWeight,
  delistingCount,
  filterMarket,
  formatWeight,
  marketCounts,
  marketMix,
  memberAriaSort,
  memberCaption,
  memberSortGlyph,
  nextMemberSort,
  sortMembers,
  todayLeaders,
  visibleMembers,
  volumeRatioNote,
} from '@/lib/fg/themeDetail'

function stock(ticker: string, patch: Partial<ThemeStockRes> = {}): ThemeStockRes {
  return {
    ticker,
    name: ticker,
    market: 'KOSPI',
    price: null,
    change: null,
    tradingValue: null,
    marketCap: null,
    reason: null,
    ...patch,
  }
}

describe('nextMemberSort', () => {
  it('처음 정렬은 시가총액 큰 순', () => {
    expect(DEFAULT_MEMBER_SORT).toEqual({ key: 'cap', dir: 'desc' })
  })

  it('같은 머리를 다시 누르면 방향이 뒤집힌다', () => {
    expect(nextMemberSort({ key: 'cap', dir: 'desc' }, 'cap')).toEqual({ key: 'cap', dir: 'asc' })
    expect(nextMemberSort({ key: 'cap', dir: 'asc' }, 'cap')).toEqual({ key: 'cap', dir: 'desc' })
  })

  it('다른 머리를 누르면 내림차순부터 시작한다', () => {
    expect(nextMemberSort({ key: 'cap', dir: 'asc' }, 'change')).toEqual({ key: 'change', dir: 'desc' })
    expect(nextMemberSort({ key: 'change', dir: 'desc' }, 'r1m')).toEqual({ key: 'r1m', dir: 'desc' })
  })
})

describe('memberAriaSort / memberSortGlyph', () => {
  it('고른 열만 방향을 알리고 나머지는 none', () => {
    const sort = { key: 'value', dir: 'asc' } as const
    expect(memberAriaSort(sort, 'value')).toBe('ascending')
    expect(memberAriaSort({ key: 'value', dir: 'desc' }, 'value')).toBe('descending')
    expect(memberAriaSort(sort, 'cap')).toBe('none')
  })

  it('내림차순은 ▼, 오름차순은 ▲, 고르지 않은 열은 표시 없음', () => {
    expect(memberSortGlyph({ key: 'cap', dir: 'desc' }, 'cap')).toBe(' ▼')
    expect(memberSortGlyph({ key: 'cap', dir: 'asc' }, 'cap')).toBe(' ▲')
    expect(memberSortGlyph({ key: 'cap', dir: 'asc' }, 'price')).toBe('')
  })
})

describe('sortMembers', () => {
  const list = [
    stock('A', { name: '가', marketCap: 100, change: 1, r1m: null, price: 500, tradingValue: 30 }),
    stock('B', { name: '나', marketCap: 300, change: -2, r1m: 4, price: 100, tradingValue: 10 }),
    stock('C', { name: '다', marketCap: null, change: 3, r1m: -1, price: 900, tradingValue: null }),
    stock('D', { name: '라', marketCap: 200, change: null, r1m: 2, price: null, tradingValue: 20 }),
  ]
  const ids = (sorted: ThemeStockRes[]) => sorted.map((s) => s.ticker)

  it('열마다 그 값으로 정렬하고 값이 없는 종목은 방향과 상관없이 맨 뒤', () => {
    expect(ids(sortMembers(list, { key: 'cap', dir: 'desc' }))).toEqual(['B', 'D', 'A', 'C'])
    expect(ids(sortMembers(list, { key: 'cap', dir: 'asc' }))).toEqual(['A', 'D', 'B', 'C'])
    expect(ids(sortMembers(list, { key: 'change', dir: 'desc' }))).toEqual(['C', 'A', 'B', 'D'])
    expect(ids(sortMembers(list, { key: 'r1m', dir: 'asc' }))).toEqual(['C', 'D', 'B', 'A'])
    expect(ids(sortMembers(list, { key: 'price', dir: 'desc' }))).toEqual(['C', 'A', 'B', 'D'])
    expect(ids(sortMembers(list, { key: 'value', dir: 'asc' }))).toEqual(['B', 'D', 'A', 'C'])
  })

  it('1달 수익률 필드가 없는 옛 응답도 맨 뒤로 보낸다', () => {
    const old = [stock('X', { name: '가' }), stock('Y', { name: '나', r1m: 1 })]
    delete old[0].r1m
    expect(ids(sortMembers(old, { key: 'r1m', dir: 'desc' }))).toEqual(['Y', 'X'])
  })

  it('값이 같으면 이름 순이고 원본 배열은 건드리지 않는다', () => {
    const tie = [stock('Z', { name: '하', marketCap: 5 }), stock('Y', { name: '가', marketCap: 5 })]
    expect(ids(sortMembers(tie, { key: 'cap', dir: 'desc' }))).toEqual(['Y', 'Z'])
    expect(ids(tie)).toEqual(['Z', 'Y'])
  })
})

describe('시장 거르기', () => {
  const list = [
    stock('A', { market: 'KOSPI' }),
    stock('B', { market: 'KOSDAQ' }),
    stock('C', { market: 'KOSDAQ' }),
    stock('D', { market: 'KONEX' }),
  ]

  it('전체는 모든 시장, 코스피·코스닥은 그 시장만', () => {
    expect(filterMarket(list, 'all').map((s) => s.ticker)).toEqual(['A', 'B', 'C', 'D'])
    expect(filterMarket(list, 'kospi').map((s) => s.ticker)).toEqual(['A'])
    expect(filterMarket(list, 'kosdaq').map((s) => s.ticker)).toEqual(['B', 'C'])
  })

  it('칩 숫자는 시장별 종목 수', () => {
    expect(marketCounts(list)).toEqual({ all: 4, kospi: 1, kosdaq: 2 })
  })

  it('머리 통계의 시장 구성은 코스피·코스닥을 0이어도 함께 쓴다', () => {
    expect(marketMix(list)).toBe('코스피 1 · 코스닥 2')
    expect(marketMix([stock('A', { market: 'KOSPI' })])).toBe('코스피 1 · 코스닥 0')
  })
})

describe('정리매매 종목', () => {
  const list = [
    stock('A', { market: 'KOSPI', changeStatus: 'PRICED' }),
    stock('B', { market: 'KOSDAQ', changeStatus: 'SUSPENDED' }),
    stock('C', { market: 'KOSDAQ', changeStatus: 'DELISTING' }),
    stock('D', { market: 'KOSDAQ', changeStatus: 'TRIMMED' }),
  ]

  it('머리 시장 구성은 테마 종목 수(stockCount)처럼 정리매매를 빼고 센다', () => {
    expect(marketMix(list)).toBe('코스피 1 · 코스닥 2')
  })

  it('표와 칩은 정리매매까지 센다', () => {
    expect(marketCounts(list)).toEqual({ all: 4, kospi: 1, kosdaq: 3 })
    expect(delistingCount(list)).toBe(1)
    expect(delistingCount(list.slice(0, 2))).toBe(0)
  })
})

describe('visibleMembers', () => {
  const list = Array.from({ length: 12 }, (_, i) => stock(String(i)))

  it('처음에는 10행, 모두 보기면 전부', () => {
    expect(visibleMembers(list, false)).toHaveLength(10)
    expect(visibleMembers(list, true)).toHaveLength(12)
    expect(visibleMembers(list.slice(0, 4), false)).toHaveLength(4)
  })
})

describe('memberCaption', () => {
  it('시장·종목 수·정렬을 한 줄로 쓴다', () => {
    expect(memberCaption('all', 21, { key: 'cap', dir: 'desc' })).toBe(
      '21종목 · 시가총액 큰 순 · 테마 포함 사유는 테마 출처의 설명을 그대로 옮겼어요',
    )
    expect(memberCaption('kosdaq', 15, { key: 'change', dir: 'asc' })).toBe(
      '코스닥 15종목 · 등락률 낮은 순 · 테마 포함 사유는 테마 출처의 설명을 그대로 옮겼어요',
    )
    expect(memberCaption('kospi', 6, { key: 'value', dir: 'desc' })).toBe(
      '코스피 6종목 · 거래대금 많은 순 · 테마 포함 사유는 테마 출처의 설명을 그대로 옮겼어요',
    )
    expect(memberCaption('all', 3, { key: 'r1m', dir: 'asc' })).toContain('1달 수익률 낮은 순')
    expect(memberCaption('all', 3, { key: 'price', dir: 'desc' })).toContain('현재가 높은 순')
  })

  it('정리매매 종목이 있으면 종목 수 뒤에 그 수를 쓴다', () => {
    expect(memberCaption('all', 55, { key: 'cap', dir: 'desc' }, 1)).toBe(
      '55종목 · 정리매매 1 · 시가총액 큰 순 · 테마 포함 사유는 테마 출처의 설명을 그대로 옮겼어요',
    )
    expect(memberCaption('kospi', 7, { key: 'cap', dir: 'desc' }, 0)).toBe(
      '코스피 7종목 · 시가총액 큰 순 · 테마 포함 사유는 테마 출처의 설명을 그대로 옮겼어요',
    )
  })
})

describe('capWeight / formatWeight', () => {
  it('테마 시가총액 합에서 종목 시가총액이 차지하는 비율(%)', () => {
    expect(capWeight(25, 100)).toBe(25)
    expect(formatWeight(capWeight(154000, 481400))).toBe('32.0%')
  })

  it('값이 없거나 합이 0 이하이면 비율을 만들지 않는다', () => {
    expect(capWeight(null, 100)).toBeNull()
    expect(capWeight(10, null)).toBeNull()
    expect(capWeight(10, 0)).toBeNull()
    expect(formatWeight(null)).toBe('—')
  })
})

describe('volumeRatioNote', () => {
  it('20일 평균 대비 배수를 소수 한 자리로 쓴다', () => {
    expect(volumeRatioNote(1.0812)).toBe('20일 평균의 1.1배')
    expect(volumeRatioNote(0.5662)).toBe('20일 평균의 0.6배')
  })

  it('배수가 없으면 줄을 만들지 않는다', () => {
    expect(volumeRatioNote(null)).toBeNull()
    expect(volumeRatioNote(undefined)).toBeNull()
  })
})

describe('todayLeaders', () => {
  const leaders: ThemeLeaderRes[] = [
    { ticker: '010950', name: 'S-Oil', change: 2.47 },
    { ticker: '096770', name: 'SK이노베이션', change: 1.99 },
    { ticker: '000000', name: '빈값', change: null },
  ]

  it('등락률이 있는 주도주만, 가격은 구성 종목에서 가져온다', () => {
    const stocks = [stock('096770', { price: 148800 })]
    expect(todayLeaders(leaders, stocks)).toEqual([
      { ticker: '010950', name: 'S-Oil', change: 2.47, price: null },
      { ticker: '096770', name: 'SK이노베이션', change: 1.99, price: 148800 },
    ])
  })

  it('주도주나 구성 종목이 없어도 동작한다', () => {
    expect(todayLeaders(undefined, null)).toEqual([])
    expect(todayLeaders(leaders.slice(0, 1), null)).toEqual([{ ticker: '010950', name: 'S-Oil', change: 2.47, price: null }])
  })
})
