import { describe, expect, it } from 'vitest'
import type { ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import {
  defaultThemeId,
  memberRows,
  parseThemeId,
  parseThemeQuery,
  resolveSort,
  resolveView,
  sortThemes,
  stableDefaultId,
  themeBasisLabel,
  themeLead,
  themeLeader,
  themeQueryString,
  themeTiles,
  tileAria,
  tileGrade,
  toMapCount,
  visibleThemes,
  type ChangeOf,
} from '@/lib/fg/themes'

function theme(id: number, patch: Partial<ThemeRes> = {}): ThemeRes {
  return {
    id,
    name: `테마${id}`,
    description: null,
    change: null,
    tradingValue: null,
    w1: null,
    m1: null,
    m3: null,
    marketCap: null,
    stockCount: 10,
    topStocks: [],
    ...patch,
  }
}

function stock(ticker: string, change: number | null): ThemeStockRes {
  return {
    ticker,
    name: ticker,
    market: 'KOSPI',
    price: 1000,
    change,
    tradingValue: null,
    marketCap: null,
    reason: null,
  }
}

const byChange: ChangeOf = (t) => t.change

describe('parseThemeQuery / themeQueryString', () => {
  it('알 수 없는 값은 기본값으로 읽는다', () => {
    expect(parseThemeQuery('?view=grid&sort=cap&count=15&fav=yes')).toEqual({
      view: null,
      sort: null,
      count: 20,
      fav: false,
    })
  })

  it('정상 값을 그대로 읽는다', () => {
    expect(parseThemeQuery('?view=map&sort=value&count=30&fav=1')).toEqual({
      view: 'map',
      sort: 'value',
      count: 30,
      fav: true,
    })
  })

  it('기본값은 URL에 남기지 않는다', () => {
    expect(themeQueryString({ view: null, sort: null, count: 20, fav: false })).toBe('')
    expect(themeQueryString({ view: 'table', sort: 'change', count: 10, fav: true })).toBe(
      '?view=table&sort=change&count=10&fav=1',
    )
  })

  it('표시 개수는 10·20·30만 받는다', () => {
    expect(toMapCount('10')).toBe(10)
    expect(toMapCount('25')).toBe(20)
    expect(toMapCount(null)).toBe(20)
  })
})

describe('parseThemeId', () => {
  it('양의 정수만 테마 id로 읽는다', () => {
    expect(parseThemeId('59')).toBe(59)
    expect(parseThemeId(undefined)).toBeNull()
    expect(parseThemeId('0')).toBeNull()
    expect(parseThemeId('-3')).toBeNull()
    expect(parseThemeId('12a')).toBeNull()
    expect(parseThemeId('99999999999999999999')).toBeNull()
  })
})

describe('resolveView / resolveSort', () => {
  it('등락률이 없으면 지도 없이 표, 거래대금 순만 쓴다', () => {
    expect(resolveView('map', false, false)).toBe('table')
    expect(resolveSort('change', false)).toBe('value')
  })

  it('요청이 없으면 넓은 화면은 지도, 좁은 화면은 표', () => {
    expect(resolveView(null, true, false)).toBe('map')
    expect(resolveView(null, true, true)).toBe('table')
    expect(resolveView('map', true, true)).toBe('map')
  })

  it('등락률이 있으면 기본 정렬은 등락률 순', () => {
    expect(resolveSort(null, true)).toBe('change')
    expect(resolveSort('value', true)).toBe('value')
  })
})

describe('sortThemes', () => {
  const list = [
    theme(1, { name: '나', tradingValue: 100, change: -1 }),
    theme(2, { name: '가', tradingValue: 300, change: 2 }),
    theme(3, { name: '다', tradingValue: null, change: 5 }),
    theme(4, { name: '라', tradingValue: 300, change: null }),
  ]

  it('거래대금 순은 큰 값부터, 없는 값은 맨 뒤, 같으면 이름 순', () => {
    expect(sortThemes(list, 'value', byChange).map((t) => t.id)).toEqual([2, 4, 1, 3])
  })

  it('등락률 순은 등락률 출처로 정렬한다', () => {
    expect(sortThemes(list, 'change', byChange).map((t) => t.id)).toEqual([3, 2, 1, 4])
  })

  it('등락률 출처가 없으면 등락률 순이어도 거래대금으로 정렬한다', () => {
    expect(sortThemes(list, 'change', null).map((t) => t.id)).toEqual([2, 4, 1, 3])
  })
})

describe('visibleThemes', () => {
  const sorted = Array.from({ length: 13 }, (_, i) => theme(i + 1))

  it('기본은 상위 10행', () => {
    expect(visibleThemes(sorted, false, null)).toHaveLength(10)
  })

  it('고른 테마가 10행 밖이면 그 행을 덧붙인다', () => {
    expect(visibleThemes(sorted, false, 12).map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12])
  })

  it('모두 보기면 전부', () => {
    expect(visibleThemes(sorted, true, null)).toHaveLength(13)
  })
})

describe('defaultThemeId', () => {
  const sorted = [theme(1, { change: 1 }), theme(2, { change: -4 })]
  const map = [theme(5, { change: 2 }), theme(6, { change: -3 }), theme(7, { change: null })]

  it('지도는 등락률 크기가 가장 큰 칸', () => {
    expect(defaultThemeId('map', sorted, map, byChange)).toBe(6)
  })

  it('표는 정렬된 첫 행', () => {
    expect(defaultThemeId('table', sorted, map, byChange)).toBe(1)
  })

  it('지도 칸이 없으면 표 규칙으로, 테마가 없으면 null', () => {
    expect(defaultThemeId('map', sorted, [], byChange)).toBe(1)
    expect(defaultThemeId('table', [], [], null)).toBeNull()
  })
})

describe('stableDefaultId', () => {
  const sorted = [theme(1, { change: 1 }), theme(2, { change: -4 }), theme(3, { change: 0.5 })]
  const map = [theme(5, { change: 2 }), theme(6, { change: -3 })]

  it('잡아 둔 기본 선택이 없으면 기본 규칙으로 고른다', () => {
    expect(stableDefaultId(null, 'map', 'change', sorted, map, byChange)).toBe(6)
    expect(stableDefaultId(null, 'table', 'change', sorted, map, byChange)).toBe(1)
  })

  it('같은 보기·정렬에서 후보에 남아 있으면 갱신 뒤에도 그대로 둔다', () => {
    expect(stableDefaultId({ view: 'table', sort: 'change', id: 3 }, 'table', 'change', sorted, map, byChange)).toBe(3)
    expect(stableDefaultId({ view: 'map', sort: 'change', id: 5 }, 'map', 'change', sorted, map, byChange)).toBe(5)
  })

  it('보기가 바뀌면 다시 고른다', () => {
    expect(stableDefaultId({ view: 'table', sort: 'change', id: 3 }, 'map', 'change', sorted, map, byChange)).toBe(6)
    expect(stableDefaultId({ view: 'map', sort: 'change', id: 5 }, 'table', 'change', sorted, map, byChange)).toBe(1)
  })

  it('정렬이 바뀌면 정렬된 목록의 첫 행으로 다시 고른다', () => {
    expect(stableDefaultId({ view: 'table', sort: 'change', id: 3 }, 'table', 'value', sorted, map, byChange)).toBe(1)
  })

  it('잡아 둔 테마가 후보에서 빠지면 다시 고른다', () => {
    expect(stableDefaultId({ view: 'map', sort: 'change', id: 1 }, 'map', 'change', sorted, map, byChange)).toBe(6)
    expect(stableDefaultId({ view: 'table', sort: 'change', id: 9 }, 'table', 'change', sorted, map, byChange)).toBe(1)
  })

  it('지도 후보가 비어 있으면 표 목록을 후보로 본다', () => {
    expect(stableDefaultId({ view: 'map', sort: 'change', id: 3 }, 'map', 'change', sorted, [], byChange)).toBe(3)
  })
})

describe('themeLead', () => {
  it('오른 테마 수와 가장 많이 오른 테마', () => {
    const lead = themeLead(
      [
        theme(1, { name: '전력', change: 3.84 }),
        theme(2, { change: -1 }),
        theme(3, { name: '조선', change: 1.2 }),
        theme(4),
      ],
      byChange,
    )
    expect(lead).toEqual({ total: 3, ups: 2, best: { name: '전력', change: 3.84 } })
  })

  it('오른 테마가 없으면 best가 없다', () => {
    expect(themeLead([theme(1, { change: -1 }), theme(2, { change: 0 })], byChange)).toEqual({
      total: 2,
      ups: 0,
      best: null,
    })
  })

  it('등락률이 하나도 없으면 null', () => {
    expect(themeLead([theme(1)], byChange)).toBeNull()
  })
})

describe('themeLeader / memberRows', () => {
  it('등락률이 있는 첫 주도주', () => {
    expect(
      themeLeader({
        leaders: [
          { ticker: 'A', name: 'A', change: null },
          { ticker: 'B', name: 'B', change: 1 },
        ],
      })?.ticker,
    ).toBe('B')
    expect(themeLeader({ leaders: undefined })).toBeNull()
  })

  it('주도주를 맨 위에 두고 나머지는 등락률 내림차순, 없는 값은 뒤', () => {
    const rows = memberRows([stock('A', 1), stock('B', null), stock('C', 3), stock('D', -2)], 'A')
    expect(rows.map((r) => r.ticker)).toEqual(['A', 'C', 'D', 'B'])
    expect(rows.filter((r) => r.leader).map((r) => r.ticker)).toEqual(['A'])
  })

  it('내린 테마의 주도주는 등락률이 음수여도 맨 위다', () => {
    const rows = memberRows([stock('A', 7.93), stock('B', 2), stock('M', -4.82), stock('C', -1), stock('D', null)], 'M')
    expect(rows.map((r) => r.ticker)).toEqual(['M', 'A', 'B', 'C', 'D'])
    expect(rows[0].leader).toBe(true)
    expect(rows.slice(1).some((r) => r.leader)).toBe(false)
  })

  it('주도주가 목록에 없으면 순서를 바꾸지 않는다', () => {
    const rows = memberRows([stock('A', 1), stock('B', null), stock('C', 3), stock('D', -2)], 'Z')
    expect(rows.map((r) => r.ticker)).toEqual(['C', 'A', 'D', 'B'])
    expect(rows.some((r) => r.leader)).toBe(false)
  })

  it('주도주가 없으면 순서를 바꾸지 않는다', () => {
    const rows = memberRows([stock('A', 1), stock('B', null), stock('C', 3), stock('D', -2)], null)
    expect(rows.map((r) => r.ticker)).toEqual(['C', 'A', 'D', 'B'])
    expect(rows.some((r) => r.leader)).toBe(false)
  })
})

describe('tileGrade', () => {
  it('칸 크기로 글자 등급을 정한다', () => {
    expect(tileGrade(50, 100)).toBe('xs')
    expect(tileGrade(100, 30)).toBe('xs')
    expect(tileGrade(200, 50)).toBe('s')
    expect(tileGrade(110, 100)).toBe('m')
    expect(tileGrade(200, 80)).toBe('m')
    expect(tileGrade(240, 160)).toBe('xl')
    expect(tileGrade(200, 100)).toBe('l')
  })
})

describe('tileAria / themeTiles', () => {
  it('이름·등락률·상승 하락 종목 수', () => {
    expect(tileAria({ name: '메모리', upCount: 8, downCount: 3 }, 1.41)).toBe('메모리 +1.41%, 상승 8종목 하락 3종목')
    expect(tileAria({ name: 'HBM' }, -0.38)).toBe('HBM −0.38%')
  })

  it('등락률이 없는 테마는 칸을 만들지 않는다', () => {
    const tiles = themeTiles(
      [
        theme(1, { change: 2, pricedCount: 9, upCount: 6, downCount: 3 }),
        theme(2, { change: null }),
        theme(3, { change: -1 }),
      ],
      byChange,
    )
    expect(tiles.map((t) => t.id)).toEqual([1, 3])
    expect(tiles[0].detail).toBe('▲6 ▼3')
    expect(tiles[1].detail).toBeNull()
    expect(tiles[0].size).toBeGreaterThanOrEqual(tiles[1].size)
    expect(tiles[1].size).toBeGreaterThan(0)
  })
})

describe('themeBasisLabel', () => {
  it('장 마감 뒤에는 종가 기준', () => {
    expect(
      themeBasisLabel({ baseDate: '2026-10-02', valuationDate: '2026-10-02', updatedAt: '2026-10-02T07:10:00Z' }),
    ).toBe('10월 2일(금) 종가 기준')
  })

  it('장중에는 갱신 시각(KST) 기준', () => {
    expect(
      themeBasisLabel({ baseDate: '2026-10-02', valuationDate: '2026-10-01', updatedAt: '2026-10-02T01:12:00Z' }),
    ).toBe('10월 2일(금) 10:12 기준')
  })

  it('기준일이 없으면 null', () => {
    expect(themeBasisLabel(null)).toBeNull()
    expect(themeBasisLabel({ baseDate: null })).toBeNull()
  })
})
