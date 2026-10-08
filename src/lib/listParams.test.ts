import { describe, expect, it } from 'vitest'
import {
  pageBlock,
  readPage,
  readQuery,
  readSort,
  writePage,
  writeQuery,
  writeSort,
} from '@/lib/listParams'
import {
  applyStockFilters,
  filterFromParams,
  filterToParams,
  LARGE_CAP_RANK,
  type FilterState,
} from '@/lib/stockFilter'
import type { StockRowRes } from '@/lib/apiTypes'

describe('pageBlock', () => {
  it('5개씩 끊는다', () => {
    expect(pageBlock(1, 153)).toEqual([1, 2, 3, 4, 5])
    expect(pageBlock(5, 153)).toEqual([1, 2, 3, 4, 5])
    expect(pageBlock(6, 153)).toEqual([6, 7, 8, 9, 10])
    expect(pageBlock(10, 153)).toEqual([6, 7, 8, 9, 10])
  })

  it('마지막 묶음은 끝 페이지에서 끊긴다', () => {
    expect(pageBlock(152, 153)).toEqual([151, 152, 153])
    expect(pageBlock(1, 3)).toEqual([1, 2, 3])
    expect(pageBlock(1, 1)).toEqual([1])
  })
})

describe('page 쿼리', () => {
  it('없거나 잘못된 값은 1페이지', () => {
    expect(readPage(new URLSearchParams(''))).toBe(1)
    expect(readPage(new URLSearchParams('page=abc'))).toBe(1)
    expect(readPage(new URLSearchParams('page=0'))).toBe(1)
    expect(readPage(new URLSearchParams('page=2.5'))).toBe(1)
    expect(readPage(new URLSearchParams('page=7'))).toBe(7)
  })

  it('1페이지는 주소에 적지 않는다', () => {
    const params = new URLSearchParams('page=4&sort=m1')
    writePage(params, 1)
    expect(params.toString()).toBe('sort=m1')
    writePage(params, 3)
    expect(params.get('page')).toBe('3')
  })
})

describe('sort 쿼리', () => {
  const keys = ['name', 'w1', 'm3'] as const

  it('모르는 컬럼이면 기본 컬럼, 기본 방향은 내림차순', () => {
    expect(readSort(new URLSearchParams(''), keys, 'w1')).toEqual({ key: 'w1', desc: true })
    expect(readSort(new URLSearchParams('sort=nope'), keys, 'w1')).toEqual({ key: 'w1', desc: true })
    expect(readSort(new URLSearchParams('sort=m3&dir=asc'), keys, 'w1')).toEqual({
      key: 'm3',
      desc: false,
    })
  })

  it('기본 정렬은 주소에 적지 않는다', () => {
    const params = new URLSearchParams('sort=m3&dir=asc')
    writeSort(params, { key: 'w1', desc: true }, 'w1')
    expect(params.toString()).toBe('')
    writeSort(params, { key: 'name', desc: false }, 'w1')
    expect(params.toString()).toBe('sort=name&dir=asc')
  })
})

describe('주식 필터 쿼리', () => {
  it('기본 필터는 주소를 비운다', () => {
    const params = new URLSearchParams('market=KOSPI&preset=lowPer&per=..10&page=3')
    filterToParams(filterFromParams(new URLSearchParams('')), params)
    expect(params.toString()).toBe('page=3')
  })

  it('쓰고 다시 읽으면 같은 필터', () => {
    const state: FilterState = {
      market: 'KOSDAQ',
      presets: new Set(['highRoe', 'lowPer']),
      ranges: { per: { max: 10 }, marketCap: { min: 1000, max: 5000 }, roe: { min: -2.5 } },
      themeId: null,
      themeQ: null,
      nameQ: null,
    }
    const params = new URLSearchParams()
    filterToParams(state, params)
    expect(filterFromParams(new URLSearchParams(params.toString()))).toEqual(state)
  })

  it('잘못된 값은 버린다', () => {
    const state = filterFromParams(new URLSearchParams('market=NYSE&preset=nope,highRoe&per=a..b'))
    expect(state.market).toBe('ALL')
    expect([...state.presets]).toEqual(['highRoe'])
    expect(state.ranges).toEqual({})
  })
})

describe('q 쿼리', () => {
  it('검색어를 읽고 쓴다', () => {
    const params = new URLSearchParams('sort=m1')
    expect(readQuery(params)).toBe('')
    writeQuery(params, '반도체')
    expect(readQuery(params)).toBe('반도체')
  })

  it('빈 검색어는 주소에서 지운다', () => {
    const params = new URLSearchParams('q=게임&page=2')
    writeQuery(params, '  ')
    expect(params.toString()).toBe('page=2')
  })
})

describe('대형주 프리셋', () => {
  // 시가총액이 i에 비례하는 150종목 + 값 없는 1종목
  const rows = [
    ...Array.from({ length: 150 }, (_, i) => ({
      ticker: String(i).padStart(6, '0'),
      market: i % 2 === 0 ? 'KOSPI' : 'KOSDAQ',
      marketCap: (i + 1) * 1e9,
      per: null,
      roe: null,
    })),
    { ticker: '999999', market: 'KOSPI', marketCap: null, per: null, roe: null },
  ] as unknown as StockRowRes[]
  const largeCap: FilterState = { market: 'ALL', presets: new Set(['largeCap']), ranges: {} }

  it('시가총액 순위 1~100위만 남긴다', () => {
    const result = applyStockFilters(rows, largeCap)
    expect(result).toHaveLength(LARGE_CAP_RANK)
    expect(Math.min(...result.map((r) => r.marketCap ?? 0))).toBe(51 * 1e9)
  })

  it('순위는 시장 필터와 무관하게 전체에서 센다', () => {
    const result = applyStockFilters(rows, { ...largeCap, market: 'KOSPI' })
    expect(result).toHaveLength(50)
  })
})

describe('고배당 프리셋', () => {
  it('배당률 5% 이상만 남기고 값이 없으면 뺀다', () => {
    const rows = [
      { ticker: '000001', dividendYield: 5 },
      { ticker: '000002', dividendYield: 4.99 },
      { ticker: '000003', dividendYield: null },
    ] as unknown as StockRowRes[]
    const state: FilterState = { market: 'ALL', presets: new Set(['highDividend']), ranges: {} }
    expect(applyStockFilters(rows, state).map((r) => r.ticker)).toEqual(['000001'])
  })
})
