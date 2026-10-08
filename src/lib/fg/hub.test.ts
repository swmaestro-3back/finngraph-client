import { describe, expect, it } from 'vitest'
import type { IssueSummaryRes, StockRowRes, ThemeRes } from '@/lib/apiTypes'
import {
  autoFlags,
  coveragePct,
  flowLabels,
  hubCaption,
  hubIssueItems,
  hubSearch,
  nextAuto,
  nodeDate,
  panelStocks,
  parseHubQuery,
  pickHubThemes,
  pickMovers,
  splitTimeline,
  themeMovers,
  toggleAuto,
} from '@/lib/fg/hub'

function stock(ticker: string, marketCap: number | null, change: number | null, price: number | null = 1000): StockRowRes {
  return {
    ticker,
    name: `종목${ticker}`,
    market: 'KOSPI',
    price,
    change,
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
  }
}

function theme(id: number, weightedChange: number | null): ThemeRes {
  return {
    id,
    name: `테마${id}`,
    description: null,
    change: null,
    weightedChange,
    tradingValue: null,
    w1: null,
    m1: null,
    m3: null,
    marketCap: null,
    stockCount: 3,
    topStocks: [],
  }
}

describe('parseHubQuery', () => {
  it('허브 탭은 기본이 뜨는 이슈이고 모르는 값도 기본으로 읽어요', () => {
    expect(parseHubQuery('').hub).toBe('issues')
    expect(parseHubQuery('?hub=stocks').hub).toBe('stocks')
    expect(parseHubQuery('?hub=themes').hub).toBe('themes')
    expect(parseHubQuery('?hub=news').hub).toBe('issues')
  })

  it('펼친 항목은 탭마다 따로 읽고 형식이 틀리면 버려요', () => {
    expect(parseHubQuery('?hub=issues&issue=454')).toEqual({ hub: 'issues', issue: '454', stock: null, theme: null })
    expect(parseHubQuery('?hub=stocks&stock=005930&theme=35')).toEqual({ hub: 'stocks', issue: null, stock: '005930', theme: 35 })
    expect(parseHubQuery('?issue=abc&stock=59&theme=0')).toEqual({ hub: 'issues', issue: null, stock: null, theme: null })
  })
})

describe('hubSearch', () => {
  it('기본 탭은 쿼리에서 빼고 펼친 항목은 그 탭의 키로만 둬요', () => {
    expect(hubSearch('', 'issues', null)).toBe('')
    expect(hubSearch('', 'issues', 454)).toBe('?issue=454')
    expect(hubSearch('?hub=themes&theme=35', 'stocks', '005930')).toBe('?hub=stocks&stock=005930')
    expect(hubSearch('?hub=stocks&stock=005930', 'stocks', null)).toBe('?hub=stocks')
  })

  it('허브 밖 쿼리(피드 정렬 등)는 순서 그대로 남겨요', () => {
    expect(hubSearch('?sort=recent&stock=005930', 'themes', 35)).toBe('?hub=themes&theme=35&sort=recent')
    expect(hubSearch('?gaps=off&hub=stocks&stock=005930', 'issues', null)).toBe('?gaps=off')
  })
})

describe('pickMovers', () => {
  it('시가총액 상위 안에서 등락률 절댓값이 큰 순으로 고르고 시세가 없는 종목은 빼요', () => {
    const rows = [
      stock('A', 900, 1.2),
      stock('B', 800, -6.2),
      stock('C', 700, 3),
      stock('D', 600, null),
      stock('E', 500, 4.1, null),
      stock('F', 10, 29.9),
      stock('G', null, 15),
    ]
    expect(pickMovers(rows, 5, 3).map((s) => s.ticker)).toEqual(['B', 'C', 'A'])
  })

  it('대상이 모자라면 있는 만큼만 돌려줘요', () => {
    expect(pickMovers([stock('A', 100, 1)], 300, 5).map((s) => s.ticker)).toEqual(['A'])
    expect(pickMovers([], 300, 5)).toEqual([])
  })

  it('절댓값이 같으면 이름 순이에요', () => {
    const rows = [stock('B', 100, -2), stock('A', 90, 2)]
    expect(pickMovers(rows, 300, 2).map((s) => s.ticker)).toEqual(['A', 'B'])
  })
})

describe('pickHubThemes', () => {
  it('핫테마 순서를 지키면서 상승 3개·하락 2개를 골라요', () => {
    const hot = [theme(1, 4), theme(2, 3), theme(3, 6), theme(4, 1), theme(5, -3), theme(6, -2), theme(7, -1)]
    expect(pickHubThemes(hot, 5).map((t) => t.id)).toEqual([1, 2, 3, 5, 6])
  })

  it('한쪽이 모자라면 다른 쪽에서 채우고 등락률이 없는 테마는 빼요', () => {
    const hot = [theme(1, 4), theme(2, 3), theme(3, 2), theme(4, 1), theme(5, null), theme(6, -2)]
    expect(pickHubThemes(hot, 5).map((t) => t.id)).toEqual([1, 2, 3, 4, 6])
    expect(pickHubThemes([theme(9, -1)], 5).map((t) => t.id)).toEqual([9])
  })
})

describe('themeMovers', () => {
  it('테마가 오른 날은 많이 오른 순, 내린 날은 많이 내린 순이에요', () => {
    const rows = [
      { ticker: 'A', name: '가', change: 1 },
      { ticker: 'B', name: '나', change: -4 },
      { ticker: 'C', name: '다', change: 3 },
      { ticker: 'D', name: '라', change: null },
    ]
    expect(themeMovers(rows, 2.1, 5).map((s) => s.ticker)).toEqual(['C', 'A', 'B'])
    expect(themeMovers(rows, -1, 2).map((s) => s.ticker)).toEqual(['B', 'A'])
  })
})

describe('coveragePct', () => {
  it('목록에서 매체가 가장 많은 이슈를 100으로 둬요', () => {
    expect(coveragePct(23, 23)).toBe(100)
    expect(coveragePct(15, 23)).toBe(65)
    expect(coveragePct(1, 0)).toBe(0)
  })
})

describe('nextAuto', () => {
  it('다음 항목으로 넘기고, 한 바퀴를 돌면 1위에서 멈춰요', () => {
    expect(nextAuto(0, 5, false)).toEqual({ sel: 1, stop: false })
    expect(nextAuto(4, 5, false)).toEqual({ sel: 0, stop: true })
    expect(nextAuto(4, 5, true)).toEqual({ sel: 0, stop: false })
  })
})

describe('toggleAuto', () => {
  it('넘기는 중이면 그 자리에서 멈추고, 멈춰 있으면 다시 켜요', () => {
    expect(toggleAuto({ stopped: false, paused: false }, true)).toEqual({ stopped: false, paused: true })
    expect(toggleAuto({ stopped: false, paused: true }, false)).toEqual({ stopped: false, paused: false })
    expect(toggleAuto({ stopped: true, paused: false }, false)).toEqual({ stopped: false, paused: false })
  })
})

describe('autoFlags', () => {
  it('켜져 있어도 마우스를 올리거나 탭이 가려지면 막대만 멈춰요', () => {
    expect(autoFlags({ enabled: true, stopped: false, paused: false, hover: false, hidden: false })).toEqual({
      autoOn: true,
      running: true,
      playing: true,
    })
    expect(autoFlags({ enabled: true, stopped: false, paused: false, hover: true, hidden: false })).toEqual({
      autoOn: true,
      running: true,
      playing: false,
    })
    expect(autoFlags({ enabled: true, stopped: false, paused: true, hover: false, hidden: false })).toEqual({
      autoOn: true,
      running: false,
      playing: false,
    })
    expect(autoFlags({ enabled: false, stopped: false, paused: false, hover: false, hidden: false }).autoOn).toBe(false)
    expect(autoFlags({ enabled: true, stopped: true, paused: false, hover: false, hidden: false }).running).toBe(false)
  })
})

describe('nodeDate', () => {
  it('오늘이면 앞에 오늘을 붙이고 아니면 날짜만 써요', () => {
    expect(nodeDate('2026-10-02', '2026-10-02')).toBe('오늘 · 10.02')
    expect(nodeDate('2026-09-30', '2026-10-05')).toBe('09.30')
  })
})

describe('flowLabels', () => {
  it('흐름 순번과 시작일 문구를 만들어요', () => {
    expect(flowLabels({ count: 4, since: '2026-09-12' })).toEqual({
      badge: '이슈 4개째',
      since: '9월 12일부터 이어진 흐름',
      meta: '이슈 4개 · 9월 12일부터',
      count: '이슈 4개',
    })
  })
})

describe('splitTimeline', () => {
  it('맨 앞을 현재 노드로, 나머지 최대 3개를 이전 노드로 나눠요', () => {
    const nodes = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, title: id, summary: null, day: '2026-10-01', media: 1 }))
    const split = splitTimeline(nodes)
    expect(split?.current.id).toBe('a')
    expect(split?.past.map((n) => n.id)).toEqual(['b', 'c', 'd'])
    expect(splitTimeline([])).toBeNull()
  })
})

describe('hubCaption', () => {
  it('뜨는 이슈는 날짜와 자동 넘김 여부에 맞춰 문구를 바꿔요', () => {
    expect(hubCaption('issues', { day: '오늘', autoSec: 8 })).toBe(
      '여러 매체가 다룬 기사를 이슈로 묶고, 이어지는 이슈를 타임라인으로 보여 줘요 · 오늘 보도한 매체가 많은 순 · 8초마다 다음 이슈로 넘어가고, 마우스를 올리면 멈춰요',
    )
    expect(hubCaption('issues', { day: '9월 30일', autoSec: null })).toBe(
      '여러 매체가 다룬 기사를 이슈로 묶고, 이어지는 이슈를 타임라인으로 보여 줘요 · 9월 30일 보도한 매체가 많은 순',
    )
  })

  it('움직인 종목과 테마는 고정 문구예요', () => {
    expect(hubCaption('stocks', { day: null, autoSec: null })).toContain('시가총액 상위 300종목')
    expect(hubCaption('themes', { day: null, autoSec: null })).toBe(
      '오늘 많이 움직인 테마를 펼치면, 테마 종목이 나온 이슈를 타임라인으로 이어 보여 줘요',
    )
  })
})

function issue(id: number, mediaCount: number, title: string | null = `이슈 ${id}`): IssueSummaryRes {
  return {
    id,
    title,
    titleSource: 'cluster',
    articleCount: mediaCount + 1,
    mediaCount,
    firstPublishedAt: '2026-09-30T09:32:00+09:00',
    lastPublishedAt: '2026-09-30T23:50:00+09:00',
    keywords: [],
    summary: ' 요약 ',
    representativeNewsId: id * 10,
    companies: [{ ticker: '000660', name: '가상반도체', mentionCount: 2 }],
  }
}

describe('hubIssueItems', () => {
  it('화제성 막대는 목록 최댓값 기준이고 보도일은 목록 날짜를 따라요', () => {
    const items = hubIssueItems([issue(1, 4), issue(2, 1, null)], '2026-09-30')
    expect(items.map((i) => [i.id, i.pct, i.day])).toEqual([
      ['1', 100, '2026-09-30'],
      ['2', 25, '2026-09-30'],
    ])
    expect(items[1].title).toBe('제목 없는 이슈')
    expect(items[0].summary).toBe('요약')
  })

  it('목록 날짜가 없으면 마지막 기사 보도일(KST)을 써요', () => {
    expect(hubIssueItems([issue(3, 2)], null)[0].day).toBe('2026-09-30')
  })

  it('목록에 없는 이슈로 들어오면 맨 뒤에 붙이고 그 이슈의 보도일을 써요', () => {
    const extra = { ...issue(9, 8), lastPublishedAt: '2026-09-27T10:00:00+09:00' }
    const items = hubIssueItems([issue(1, 4)], '2026-09-30', extra)
    expect(items.map((i) => [i.id, i.pct, i.day])).toEqual([
      ['1', 50, '2026-09-30'],
      ['9', 100, '2026-09-27'],
    ])
    expect(hubIssueItems([issue(1, 4)], '2026-09-30', issue(1, 4))).toHaveLength(1)
  })
})

describe('panelStocks', () => {
  const stocks = ['가', '나', '다', '라', '마', '바'].map((name) => ({ name, ticker: name, change: null }))

  it('대표 1개, 칩 3개, 남는 수를 나눠요', () => {
    const split = panelStocks(stocks, 6)
    expect(split.rep?.name).toBe('가')
    expect(split.chips.map((s) => s.name)).toEqual(['나', '다', '라'])
    expect(split.extra).toBe(2)
    expect(split.total).toBe(6)
  })

  it('전체 수가 받은 목록보다 많으면 남는 수에 더해요', () => {
    expect(panelStocks(stocks.slice(0, 5), 9).extra).toBe(5)
    expect(panelStocks([], 0)).toEqual({ rep: null, chips: [], extra: 0, total: 0 })
  })
})
