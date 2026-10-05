import { describe, expect, it } from 'vitest'
import type { FavoriteItemRes, IssueSummaryRes, StockRowRes, ThemeRes } from '@/lib/apiTypes'
import {
  chipThemes,
  feedGroups,
  feedSortSearch,
  filterGroups,
  moreLabel,
  nextFeedRequest,
  parseFeedSort,
  resolveFilter,
  splitChips,
  timelineBadge,
  watchRows,
  type FeedChunk,
} from '@/lib/fg/home'
import type { HubThemeIssues } from '@/lib/fg/hub'

function issue(id: number, tickers: string[] = []): IssueSummaryRes {
  return {
    id,
    title: `이슈 ${id}`,
    titleSource: 'cluster',
    articleCount: 1,
    mediaCount: 1,
    firstPublishedAt: '2026-09-30T09:00:00+09:00',
    lastPublishedAt: '2026-09-30T10:00:00+09:00',
    keywords: [],
    summary: null,
    representativeNewsId: id * 10,
    companies: tickers.map((ticker) => ({ ticker, name: `종목${ticker}`, mentionCount: 1 })),
  }
}

function chunk(date: string | null, page: number, totalPages: number, ids: number[], prevDate: string | null = null): FeedChunk {
  return { date, page, totalPages, prevDate, items: ids.map((id) => issue(id)) }
}

function theme(id: number, name = `테마${id}`): ThemeRes {
  return {
    id,
    name,
    description: null,
    change: null,
    weightedChange: 1,
    tradingValue: null,
    w1: null,
    m1: null,
    m3: null,
    marketCap: null,
    stockCount: 3,
    topStocks: [],
  }
}

function themeIssues(count: number, ids: string[] = []): HubThemeIssues {
  return { count, ids, top: null }
}

function row(ticker: string, price: number | null, change: number | null): StockRowRes {
  return {
    ticker,
    name: `종목${ticker}`,
    market: 'KOSDAQ',
    price,
    change,
    w1: null,
    m1: null,
    m3: null,
    marketCap: 1,
    per: null,
    pbr: null,
    roe: null,
    dividendYield: null,
    themeId: null,
    themeName: null,
  }
}

function fav(type: 'STOCK' | 'THEME', key: string, price: number | null = 100, change: number | null = 1): FavoriteItemRes {
  return {
    type,
    key,
    createdAt: '2026-10-01T00:00:00Z',
    resolved: true,
    stock: type === 'STOCK' ? { ticker: key, name: `관심${key}`, market: 'KOSPI', price, change, marketCap: 1 } : null,
    theme: null,
  }
}

describe('parseFeedSort · feedSortSearch', () => {
  it('정렬은 기본이 매체 많은 순이고 모르는 값도 기본으로 읽어요', () => {
    expect(parseFeedSort('')).toBe('media')
    expect(parseFeedSort('?sort=recent')).toBe('recent')
    expect(parseFeedSort('?sort=oops')).toBe('media')
  })

  it('기본 정렬은 쿼리에서 빼고 다른 쿼리는 그대로 둬요', () => {
    expect(feedSortSearch('?hub=issues&issue=4', 'recent')).toBe('?hub=issues&issue=4&sort=recent')
    expect(feedSortSearch('?hub=issues&sort=recent', 'media')).toBe('?hub=issues')
    expect(feedSortSearch('?sort=recent', 'media')).toBe('')
  })
})

describe('nextFeedRequest', () => {
  it('처음에는 기본 날짜 첫 쪽을 요청해요', () => {
    expect(nextFeedRequest([], true)).toEqual({ date: null, page: 0 })
  })

  it('같은 날짜에 남은 쪽이 있으면 다음 쪽을 요청해요', () => {
    expect(nextFeedRequest([chunk('2026-09-17', 0, 2, [1, 2])], true)).toEqual({ date: '2026-09-17', page: 1 })
  })

  it('날짜를 다 보면 이전 날짜 첫 쪽으로 넘어가요', () => {
    const chunks = [chunk('2026-09-30', 0, 1, [1], '2026-09-28')]
    expect(nextFeedRequest(chunks, true)).toEqual({ date: '2026-09-28', page: 0 })
  })

  it('날짜를 넘지 않을 때는 첫 날짜 안에서만 이어 받아요', () => {
    expect(nextFeedRequest([chunk('2026-09-30', 0, 1, [1], '2026-09-28')], false)).toBeNull()
    expect(nextFeedRequest([chunk('2026-09-17', 0, 2, [1], '2026-09-16')], false)).toEqual({ date: '2026-09-17', page: 1 })
    const crossed = [chunk('2026-09-30', 0, 1, [1], '2026-09-28'), chunk('2026-09-28', 0, 2, [2], '2026-09-27')]
    expect(nextFeedRequest(crossed, false)).toBeNull()
  })

  it('이전 날짜가 없거나 이슈가 하나도 없으면 더 받지 않아요', () => {
    expect(nextFeedRequest([chunk('2026-09-01', 0, 1, [1])], true)).toBeNull()
    expect(nextFeedRequest([chunk(null, 0, 0, [])], true)).toBeNull()
  })
})

describe('feedGroups', () => {
  it('날짜별로 묶고 앞서 나온 이슈는 다시 넣지 않아요', () => {
    const groups = feedGroups([
      chunk('2026-09-18', 0, 1, [1, 162], '2026-09-17'),
      chunk('2026-09-17', 0, 2, [1, 276]),
      chunk('2026-09-17', 1, 2, [15]),
    ])
    expect(groups.map((g) => [g.date, g.items.map((i) => i.id)])).toEqual([
      ['2026-09-18', [1, 162]],
      ['2026-09-17', [276, 15]],
    ])
  })

  it('모두 중복인 날짜는 묶음을 만들지 않아요', () => {
    const groups = feedGroups([chunk('2026-09-18', 0, 1, [1]), chunk('2026-09-17', 0, 1, [1])])
    expect(groups.map((g) => g.date)).toEqual(['2026-09-18'])
  })
})

describe('filterGroups', () => {
  const groups = feedGroups([
    { date: '2026-09-30', page: 0, totalPages: 1, prevDate: '2026-09-28', items: [issue(1, ['000660']), issue(2, ['005930'])] },
    { date: '2026-09-28', page: 0, totalPages: 1, prevDate: null, items: [issue(3, ['000660']), issue(4, [])] },
  ])

  it('전체는 그대로 둬요', () => {
    expect(filterGroups(groups, { kind: 'all' }, { favorites: new Set(), themeIssueIds: null })).toBe(groups)
  })

  it('관심 종목은 불러온 모든 날짜에서 관심 종목이 나온 이슈만 남겨요', () => {
    const result = filterGroups(groups, { kind: 'fav' }, { favorites: new Set(['000660']), themeIssueIds: null })
    expect(result.map((g) => [g.date, g.items.map((i) => i.id)])).toEqual([
      ['2026-09-30', [1]],
      ['2026-09-28', [3]],
    ])
  })

  it('테마는 첫 날짜 묶음에서 테마 이슈 id만 남기고, id를 모르면 비워요', () => {
    const result = filterGroups(groups, { kind: 'theme', id: 7 }, { favorites: new Set(), themeIssueIds: new Set(['2', '3']) })
    expect(result.map((g) => [g.date, g.items.map((i) => i.id)])).toEqual([['2026-09-30', [2]]])
    expect(filterGroups(groups, { kind: 'theme', id: 7 }, { favorites: new Set(), themeIssueIds: null })).toEqual([])
  })
})

describe('chipThemes · resolveFilter', () => {
  const themes = [theme(1), theme(2), theme(3), theme(4)]
  const issues = new Map([
    [1, themeIssues(1, ['10'])],
    [2, themeIssues(0)],
    [3, themeIssues(3, ['10', '11', '12'])],
    [4, themeIssues(1, ['11'])],
  ])

  it('그날 이슈가 있는 테마만 이슈가 많은 순으로 고르고 같으면 원래 순서를 지켜요', () => {
    expect(chipThemes(themes, issues).map((t) => t.id)).toEqual([3, 1, 4])
    expect(chipThemes(themes, issues, 2).map((t) => t.id)).toEqual([3, 1])
    expect(chipThemes(themes, null)).toEqual([])
  })

  it('칩에 없는 테마와 비회원의 관심 종목은 전체로 돌려요', () => {
    const chips = chipThemes(themes, issues)
    expect(resolveFilter({ kind: 'theme', id: 3 }, chips, true)).toEqual({ kind: 'theme', id: 3 })
    expect(resolveFilter({ kind: 'theme', id: 2 }, chips, true)).toEqual({ kind: 'all' })
    expect(resolveFilter({ kind: 'fav' }, chips, false)).toEqual({ kind: 'all' })
    expect(resolveFilter({ kind: 'fav' }, chips, true)).toEqual({ kind: 'fav' })
  })
})

describe('timelineBadge · moreLabel · splitChips', () => {
  it('흐름의 첫 이슈는 새 이슈, 그다음은 몇 번째인지 보여요', () => {
    expect(timelineBadge(1)).toBe('새 이슈')
    expect(timelineBadge(4)).toBe('타임라인 4번째')
  })

  it('같은 날짜면 이슈 더 보기, 날짜가 바뀌면 그 날짜를 적어요', () => {
    expect(moreLabel({ date: '2026-09-17', page: 1 }, '2026-09-17', '2026-10-05')).toBe('이슈 더 보기')
    expect(moreLabel({ date: '2026-09-28', page: 0 }, '2026-09-30', '2026-10-05')).toBe('9월 28일 이슈 보기')
    expect(moreLabel({ date: '2026-10-05', page: 0 }, '2026-10-06', '2026-10-05')).toBe('오늘 이슈 보기')
  })

  it('종목 칩은 앞에서부터 보이고 나머지는 개수로 남겨요', () => {
    expect(splitChips(['a', 'b', 'c', 'd', 'e'], 3)).toEqual({ shown: ['a', 'b', 'c'], extra: 2 })
    expect(splitChips(['a'], 3)).toEqual({ shown: ['a'], extra: 0 })
  })
})

describe('watchRows', () => {
  it('찾을 수 있는 관심 종목만 사용자 순서대로 고르고 시세는 종목 목록 값을 먼저 써요', () => {
    const items = [fav('THEME', '7'), fav('STOCK', 'A0001', 100, 1), { ...fav('STOCK', 'GONE'), resolved: false, stock: null }, fav('STOCK', 'A0002', 200, -2)]
    const quotes = new Map([['A0001', row('A0001', 150, 3)]])
    const { rows, total } = watchRows(items, quotes, 5)
    expect(total).toBe(2)
    expect(rows).toEqual([
      { ticker: 'A0001', name: '관심A0001', market: 'KOSPI', price: 150, change: 3 },
      { ticker: 'A0002', name: '관심A0002', market: 'KOSPI', price: 200, change: -2 },
    ])
  })

  it('목록 시세가 비어 있으면 관심 목록 값을 쓰고 개수를 줄여 보여요', () => {
    const items = [fav('STOCK', 'A0001', 100, 1), fav('STOCK', 'A0002'), fav('STOCK', 'A0003')]
    const quotes = new Map([['A0001', row('A0001', null, null)]])
    const { rows, total } = watchRows(items, quotes, 2)
    expect(total).toBe(3)
    expect(rows.map((r) => [r.ticker, r.price, r.change])).toEqual([
      ['A0001', 100, 1],
      ['A0002', 100, 1],
    ])
  })
})
