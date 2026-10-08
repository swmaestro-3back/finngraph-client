import { describe, expect, it } from 'vitest'
import type { StockRowRes } from '@/lib/apiTypes'
import {
  columnSort,
  filterStocks,
  keepCode,
  nextColumnSort,
  pageItems,
  pageOfCode,
  pageRowsOf,
  parseStockCode,
  parseStockQuery,
  resolveStockPage,
  resolveStockSort,
  scopeCaption,
  scopeTitle,
  sortStocks,
  stockPageCount,
  stockQueryFix,
  stockQueryString,
  stockSelection,
  STOCK_PAGE_SIZE,
  type StockQuery,
} from '@/lib/fg/stocks'

function row(ticker: string, patch: Partial<StockRowRes> = {}): StockRowRes {
  return {
    ticker,
    name: `종목${ticker}`,
    market: 'KOSPI',
    price: 1000,
    change: 0,
    w1: null,
    m1: null,
    m3: null,
    marketCap: 1e11,
    per: null,
    pbr: null,
    roe: null,
    dividendYield: null,
    themeId: null,
    themeName: null,
    ...patch,
  }
}

const BASE: StockQuery = {
  market: 'ALL',
  presets: [],
  fav: false,
  sort: null,
  page: null,
  code: null,
  ranges: {},
  themeId: null,
  themeQ: null,
  nameQ: null,
}

describe('parseStockQuery / stockQueryString', () => {
  it('빈 주소는 기본값이다', () => {
    expect(parseStockQuery('')).toEqual(BASE)
    expect(stockQueryString(BASE)).toBe('')
  })

  it('옛 목록 주소의 시장·조건 칩을 그대로 읽는다', () => {
    expect(parseStockQuery('?market=KOSDAQ&preset=highRoe,lowPer&fav=1')).toEqual({
      ...BASE,
      market: 'KOSDAQ',
      presets: ['lowPer', 'highRoe'],
      fav: true,
    })
  })

  it('모르는 값과 옛 정렬은 버리고, 범위 필터는 읽는다', () => {
    expect(parseStockQuery('?market=NYSE&sort=per&dir=asc&per=..10&page=0&code=abc')).toEqual({
      ...BASE,
      ranges: { per: { max: 10 } },
    })
    expect(parseStockQuery('?sort=w1&page=-2&code=0059300')).toEqual(BASE)
  })

  it('정렬·페이지·고른 종목을 읽는다', () => {
    expect(parseStockQuery('?sort=fall&page=3&code=005930')).toEqual({ ...BASE, sort: 'fall', page: 3, code: '005930' })
    expect(parseStockQuery('?code=0030R0').code).toBe('0030R0')
  })

  it('기본값이 아닌 것만 정해진 순서로 쓴다', () => {
    const query: StockQuery = {
      market: 'KOSPI',
      presets: ['largeCap', 'highDividend'],
      fav: true,
      sort: 'rise',
      page: 2,
      code: '000660',
      ranges: {},
      themeId: null,
      themeQ: null,
      nameQ: null,
    }
    const text = stockQueryString(query)
    expect(text).toBe('?market=KOSPI&preset=largeCap%2ChighDividend&fav=1&sort=rise&page=2&code=000660')
    expect(parseStockQuery(text)).toEqual(query)
    expect(stockQueryString({ ...BASE, sort: 'cap', page: 1 })).toBe('')
  })
})

describe('parseStockCode', () => {
  it('6자리 영문 대문자·숫자만 종목 코드로 본다', () => {
    expect(parseStockCode('005930')).toBe('005930')
    expect(parseStockCode('0030R0')).toBe('0030R0')
    expect(parseStockCode('0030r0')).toBeNull()
    expect(parseStockCode('59300')).toBeNull()
    expect(parseStockCode(null)).toBeNull()
  })
})

describe('resolveStockSort', () => {
  it('기본은 시가총액 순이다', () => {
    expect(resolveStockSort(null, true)).toBe('cap')
  })

  it('거래대금이 없으면 거래대금 순을 시가총액 순으로 돌린다', () => {
    expect(resolveStockSort('value', false)).toBe('cap')
    expect(resolveStockSort('value', true)).toBe('value')
    expect(resolveStockSort('fall', false)).toBe('fall')
  })
})

describe('sortStocks', () => {
  const rows = [
    row('A', { name: '가', marketCap: 300, change: 1 }),
    row('B', { name: '나', marketCap: null, change: null }),
    row('C', { name: '다', marketCap: 500, change: -2 }),
    row('D', { name: '라', marketCap: 300, change: 3 }),
  ]
  const valueOf = (stock: StockRowRes) => (stock.ticker === 'A' ? 9 : stock.ticker === 'D' ? 4 : null)

  it('시가총액 큰 순, 값이 없으면 맨 뒤, 같으면 이름 순', () => {
    expect(sortStocks(rows, 'cap', valueOf).map((s) => s.ticker)).toEqual(['C', 'A', 'D', 'B'])
  })

  it('상승률 순과 하락률 순은 서로 반대지만 값이 없는 종목은 둘 다 맨 뒤', () => {
    expect(sortStocks(rows, 'rise', valueOf).map((s) => s.ticker)).toEqual(['D', 'A', 'C', 'B'])
    expect(sortStocks(rows, 'fall', valueOf).map((s) => s.ticker)).toEqual(['C', 'A', 'D', 'B'])
  })

  it('거래대금 순은 넘겨받은 값으로 정렬한다', () => {
    expect(sortStocks(rows, 'value', valueOf).map((s) => s.ticker)).toEqual(['A', 'D', 'B', 'C'])
  })

  it('원본 배열을 바꾸지 않는다', () => {
    const before = rows.map((s) => s.ticker)
    sortStocks(rows, 'rise', valueOf)
    expect(rows.map((s) => s.ticker)).toEqual(before)
  })
})

describe('filterStocks', () => {
  const rows = [
    row('A', { market: 'KOSPI', per: 5 }),
    row('B', { market: 'KOSDAQ', per: 8 }),
    row('C', { market: 'KOSDAQ', per: 30 }),
  ]
  const fav = (ticker: string) => ticker !== 'B'

  it('시장과 조건 칩을 함께 건다', () => {
    expect(filterStocks(rows, { ...BASE, market: 'KOSDAQ' }, false, fav).map((s) => s.ticker)).toEqual(['B', 'C'])
    expect(filterStocks(rows, { ...BASE, presets: ['lowPer'] }, false, fav).map((s) => s.ticker)).toEqual(['A', 'B'])
  })

  it('관심 종목만 보기는 시장 대신 관심 여부로 거른다', () => {
    expect(filterStocks(rows, { ...BASE, market: 'KOSDAQ' }, true, fav).map((s) => s.ticker)).toEqual(['A', 'C'])
  })
})

describe('페이지', () => {
  const rows = Array.from({ length: 120 }, (_, i) => row(String(100000 + i)))

  it('50행씩 끊는다', () => {
    expect(STOCK_PAGE_SIZE).toBe(50)
    expect(stockPageCount(0)).toBe(1)
    expect(stockPageCount(120)).toBe(3)
    expect(pageRowsOf(rows, 3).map((s) => s.ticker)).toEqual(rows.slice(100).map((s) => s.ticker))
  })

  it('고른 종목이 있는 페이지를 찾는다', () => {
    expect(pageOfCode(rows, '100049')).toBe(1)
    expect(pageOfCode(rows, '100050')).toBe(2)
    expect(pageOfCode(rows, '999999')).toBeNull()
    expect(pageOfCode(rows, null)).toBeNull()
  })

  it('주소의 페이지를 먼저 쓰고, 없으면 처음 들어온 종목의 페이지, 범위를 넘으면 끝 페이지', () => {
    expect(resolveStockPage(2, 3, 3)).toBe(2)
    expect(resolveStockPage(null, 3, 3)).toBe(3)
    expect(resolveStockPage(null, null, 3)).toBe(1)
    expect(resolveStockPage(9, null, 3)).toBe(3)
  })
})

describe('stockQueryFix', () => {
  const rows = Array.from({ length: 120 }, (_, i) => row(String(100000 + i)))
  const fix = (search: string) => stockQueryFix(search, parseStockQuery(search), rows)

  it('맞는 주소는 고치지 않는다', () => {
    expect(fix('')).toBeNull()
    expect(fix('?page=3&code=100110')).toBeNull()
    expect(fix('?code=100110')).toBeNull()
    expect(fix('?code=999999')).toBeNull()
  })

  it('종목코드 꼴이 아닌 code는 주소에서 지운다', () => {
    expect(fix('?code=abc')).toEqual(BASE)
    expect(fix('?market=KOSDAQ&page=2&code=abc')).toEqual({ ...BASE, market: 'KOSDAQ', page: 2 })
  })

  it('범위를 넘은 페이지는 마지막 페이지로 맞춘다', () => {
    expect(fix('?page=999')).toEqual({ ...BASE, page: 3 })
    expect(stockQueryString(fix('?page=999') ?? BASE)).toBe('?page=3')
  })

  it('맞춘 페이지에 고른 종목이 없으면 덧붙이지 않고 선택을 지운다', () => {
    expect(fix('?page=999&code=100001')).toEqual({ ...BASE, page: 3 })
    expect(fix('?page=999&code=100110')).toEqual({ ...BASE, page: 3, code: '100110' })
  })

  it('1보다 작거나 숫자가 아닌 페이지는 지운다', () => {
    expect(fix('?page=0')).toEqual(BASE)
    expect(fix('?page=-3&code=100001')).toEqual({ ...BASE, code: '100001' })
    expect(fix('?page=abc')).toEqual(BASE)
  })

  it('한 페이지뿐이면 페이지를 지운다', () => {
    expect(stockQueryFix('?page=5', parseStockQuery('?page=5'), rows.slice(0, 10))).toEqual(BASE)
  })
})

describe('pageItems', () => {
  it('7쪽 이하는 모두 보인다', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('앞쪽에서는 시안처럼 1 2 3 … 끝', () => {
    expect(pageItems(1, 54)).toEqual([1, 2, 3, 'gap', 54])
    expect(pageItems(2, 54)).toEqual([1, 2, 3, 'gap', 54])
    expect(pageItems(3, 54)).toEqual([1, 2, 3, 4, 'gap', 54])
  })

  it('가운데에서는 앞뒤 한 쪽씩, 숫자 하나만 숨으면 줄임표 대신 그 숫자', () => {
    expect(pageItems(10, 54)).toEqual([1, 'gap', 9, 10, 11, 'gap', 54])
    expect(pageItems(4, 54)).toEqual([1, 2, 3, 4, 5, 'gap', 54])
  })

  it('끝쪽은 앞쪽과 대칭이다', () => {
    expect(pageItems(54, 54)).toEqual([1, 'gap', 52, 53, 54])
    expect(pageItems(52, 54)).toEqual([1, 'gap', 51, 52, 53, 54])
  })
})

describe('정렬 머리', () => {
  it('지금 정렬된 열에만 방향을 단다', () => {
    expect(columnSort('rise', 'change')).toBe('descending')
    expect(columnSort('fall', 'change')).toBe('ascending')
    expect(columnSort('cap', 'cap')).toBe('descending')
    expect(columnSort('value', 'value')).toBe('descending')
    expect(columnSort('cap', 'change')).toBeUndefined()
  })

  it('등락률 머리는 상승률·하락률을 오가고, 나머지는 큰 순으로 고른다', () => {
    expect(nextColumnSort('cap', 'change')).toBe('rise')
    expect(nextColumnSort('rise', 'change')).toBe('fall')
    expect(nextColumnSort('fall', 'change')).toBe('rise')
    expect(nextColumnSort('rise', 'cap')).toBe('cap')
    expect(nextColumnSort('cap', 'value')).toBe('value')
  })
})

describe('scopeTitle / scopeCaption', () => {
  it('시안의 제목과 범위 문구', () => {
    expect(scopeTitle('ALL', false)).toBe('전체 종목')
    expect(scopeTitle('KOSPI', false)).toBe('코스피 종목')
    expect(scopeTitle('KOSDAQ', false)).toBe('코스닥 종목')
    expect(scopeTitle('KOSPI', true)).toBe('관심 종목')
    expect(scopeCaption('ALL', false, 2693)).toBe('코스피·코스닥 2,693종목')
    expect(scopeCaption('KOSDAQ', false, 1745)).toBe('코스닥 1,745종목')
    expect(scopeCaption('ALL', true, 4)).toBe('관심 종목 4개')
  })
})

describe('stockSelection', () => {
  const all = [row('A'), row('B'), row('C'), row('D')]
  const filtered = [all[0], all[1], all[2]]
  const page = [all[0], all[1]]

  it('고른 종목이 없으면 이 페이지의 첫 행', () => {
    expect(stockSelection(page, filtered, all, null)).toEqual({ rows: page, selected: all[0], missing: false })
  })

  it('이 페이지에 있으면 그 행', () => {
    expect(stockSelection(page, filtered, all, 'B').selected).toBe(all[1])
  })

  it('목록에 있지만 다른 페이지면 행을 덧붙여 고른 상태가 보이게 한다', () => {
    const view = stockSelection(page, filtered, all, 'C')
    expect(view.rows.map((s) => s.ticker)).toEqual(['A', 'B', 'C'])
    expect(view.selected).toBe(all[2])
  })

  it('거른 목록 밖이면 행은 덧붙이지 않고 요약만 보인다', () => {
    const view = stockSelection(page, filtered, all, 'D')
    expect(view.rows).toBe(page)
    expect(view.selected).toBe(all[3])
  })

  it('전체 목록에도 없으면 찾지 못한 것으로 본다', () => {
    expect(stockSelection(page, filtered, all, 'Z')).toEqual({ rows: page, selected: null, missing: true })
  })
})

describe('keepCode', () => {
  it('바뀐 목록에 남아 있을 때만 고른 종목을 유지한다', () => {
    const rows = [row('A'), row('B')]
    expect(keepCode('B', rows)).toBe('B')
    expect(keepCode('C', rows)).toBeNull()
    expect(keepCode(null, rows)).toBeNull()
  })
})
