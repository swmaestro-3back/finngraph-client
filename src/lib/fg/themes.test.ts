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
  TILE_ENTER_MS,
  TILE_REFLOW_HOLD_MS,
  TILE_REFLOW_MS,
  enteringIds,
  tileAria,
  tileEnterDelay,
  tileGrade,
  tileText,
  toMapCount,
  visibleThemes,
  weightedChangeOf,
  type ChangeOf,
  type MeasureText,
} from '@/lib/fg/themes'

function theme(id: number, patch: Partial<ThemeRes> = {}): ThemeRes {
  return {
    id,
    name: `테마${id}`,
    description: null,
    change: null,
    weightedChange: null,
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
    expect(parseThemeQuery('?view=grid&sort=cap&count=15&fav=yes&id=abc')).toEqual({
      view: null,
      sort: null,
      count: 20,
      fav: false,
      id: null,
    })
  })

  it('정상 값을 그대로 읽는다', () => {
    expect(parseThemeQuery('?view=map&sort=value&count=30&fav=1&id=59')).toEqual({
      view: 'map',
      sort: 'value',
      count: 30,
      fav: true,
      id: 59,
    })
  })

  it('기본값은 URL에 남기지 않는다', () => {
    expect(themeQueryString({ view: null, sort: null, count: 20, fav: false, id: null })).toBe('')
    expect(themeQueryString({ view: 'table', sort: 'change', count: 10, fav: true, id: null })).toBe(
      '?view=table&sort=change&count=10&fav=1',
    )
  })

  it('목록에서 고른 테마는 id 쿼리로 남긴다', () => {
    expect(themeQueryString({ view: null, sort: null, count: 20, fav: false, id: 1016 })).toBe('?id=1016')
    expect(themeQueryString({ view: 'table', sort: null, count: 20, fav: false, id: 7 })).toBe('?view=table&id=7')
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
    expect(parseThemeId(null)).toBeNull()
    expect(parseThemeId('0')).toBeNull()
    expect(parseThemeId('-3')).toBeNull()
    expect(parseThemeId('12a')).toBeNull()
    expect(parseThemeId('99999999999999999999')).toBeNull()
  })
})

describe('weightedChangeOf', () => {
  it('테마 등락률은 절사평균이 아닌 가중 등락률이다', () => {
    expect(weightedChangeOf(theme(1, { change: 2.27, weightedChange: 1.41 }))).toBe(1.41)
  })

  it('가중 등락률이 없으면 절사평균이 있어도 null', () => {
    expect(weightedChangeOf(theme(1, { change: 2.27, weightedChange: null }))).toBeNull()
  })

  it('필드가 없는 옛 응답이어도 null', () => {
    const { weightedChange, ...old } = theme(1, { change: 2.27, weightedChange: 1 })
    expect(weightedChange).toBe(1)
    expect(weightedChangeOf(old as ThemeRes)).toBeNull()
  })
})

describe('resolveView / resolveSort', () => {
  it('요청이 없으면 넓은 화면은 지도, 좁은 화면은 표', () => {
    expect(resolveView(null, false)).toBe('map')
    expect(resolveView(null, true)).toBe('table')
    expect(resolveView('map', true)).toBe('map')
    expect(resolveView('table', false)).toBe('table')
  })

  it('기본 정렬은 등락률 순', () => {
    expect(resolveSort(null)).toBe('change')
    expect(resolveSort('value')).toBe('value')
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

  it('가중 등락률 순은 가중 등락률로 정렬하고 없는 테마는 맨 뒤', () => {
    const weighted = [
      theme(1, { name: '가', change: 9, weightedChange: -2 }),
      theme(2, { name: '나', change: -9, weightedChange: 3 }),
      theme(3, { name: '다', change: 5, weightedChange: null }),
      theme(4, { name: '라', change: 0, weightedChange: 0.5 }),
    ]
    expect(sortThemes(weighted, 'change', weightedChangeOf).map((t) => t.id)).toEqual([2, 4, 1, 3])
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
    expect(defaultThemeId('table', [], [], byChange)).toBeNull()
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
  it('아주 작은 칸은 글씨를 숨기는 xs', () => {
    expect(tileGrade(50, 100)).toBe('xs')
    expect(tileGrade(55, 200)).toBe('xs')
    expect(tileGrade(100, 30)).toBe('xs')
    expect(tileGrade(56, 36)).toBe('s')
  })

  it('글자 크기는 칸 폭으로 정한다', () => {
    expect(tileGrade(71, 100)).toBe('s')
    expect(tileGrade(72, 100)).toBe('m')
    expect(tileGrade(129, 100)).toBe('m')
    expect(tileGrade(130, 100)).toBe('l')
    expect(tileGrade(199, 100)).toBe('l')
    expect(tileGrade(200, 100)).toBe('xl')
  })

  it('낮은 칸은 이름 한 줄과 등락률이 들어가는 크기까지 줄인다', () => {
    expect(tileGrade(200, 39)).toBe('s')
    expect(tileGrade(200, 51)).toBe('xl')
    expect(tileGrade(200, 50)).toBe('l')
    expect(tileGrade(199, 48)).toBe('l')
    expect(tileGrade(300, 46)).toBe('m')
    expect(tileGrade(100, 45)).toBe('m')
    expect(tileGrade(100, 44)).toBe('s')
  })
})

describe('tileText', () => {
  const em: MeasureText = (text, font) => [...text].length * font.size
  const parts = (name: string, change = '+2.81%', detail: string | null = '▲11 ▼1') => ({ name, change, detail })

  it('xs 칸은 글씨를 그리지 않는다', () => {
    expect(tileText(50, 100, parts('철강'), em)).toBeNull()
    expect(tileText(120, 30, parts('철강'), em)).toBeNull()
  })

  it('공간이 넉넉하면 이름·등락률·종목 수를 줄로 모두 보인다', () => {
    expect(tileText(240, 160, parts('반도체 소재'), em)).toEqual({
      grade: 'xl',
      name: '반도체 소재',
      nameLines: 1,
      nameFit: 'full',
      sub: null,
      change: true,
      detail: 'line',
    })
  })

  it('괄호 이름은 큰 줄과 작은 줄로 나눈다', () => {
    expect(tileText(240, 160, parts('강관업체(Steel pipe)'), em)).toMatchObject({
      name: '강관업체',
      sub: '(Steel pipe)',
      change: true,
      detail: 'line',
    })
  })

  it('종목 수 줄이 안 들어가면 등락률 옆에 붙인다', () => {
    expect(tileText(180, 56, parts('철강', '+1.67%', '▲36 ▼9'), em)).toMatchObject({
      grade: 'l',
      name: '철강',
      change: true,
      detail: 'inline',
    })
  })

  it('종목 수를 가장 먼저 뺀다', () => {
    expect(tileText(150, 56, parts('철강', '+1.67%', '▲36 ▼9'), em)).toMatchObject({
      name: '철강',
      nameFit: 'full',
      change: true,
      detail: null,
    })
  })

  it('높이가 모자라면 종목 수 다음으로 괄호 줄을 뺀다', () => {
    expect(tileText(110, 50, parts('HBM(고대역)', '+0.75%', '▲26 ▼7'), em)).toEqual({
      grade: 'm',
      name: 'HBM',
      nameLines: 1,
      nameFit: 'full',
      sub: null,
      change: true,
      detail: null,
    })
  })

  it('괄호 줄이 높이 때문에 빠지면 종목 수도 보이지 않는다', () => {
    expect(tileText(180, 60, parts('HBM(고대역)', '+0.75%', '▲26 ▼7'), em)).toEqual({
      grade: 'l',
      name: 'HBM',
      nameLines: 1,
      nameFit: 'full',
      sub: null,
      change: true,
      detail: null,
    })
  })

  it('괄호 줄이 폭에 안 들어가면 그 줄만 빼고 종목 수는 보인다', () => {
    expect(tileText(110, 100, parts('HBM(고대역폭메모리)', '+0.75%', '▲26 ▼7'), em)).toMatchObject({
      name: 'HBM',
      sub: null,
      change: true,
      detail: 'line',
    })
  })

  it('이름은 단어 단위로 두 줄까지 쓴다', () => {
    expect(tileText(110, 100, parts('반도체 전공정 장비', '+2.45%', '▲1 ▼1'), em)).toEqual({
      grade: 'm',
      name: '반도체 전공정 장비',
      nameLines: 2,
      nameFit: 'full',
      sub: null,
      change: true,
      detail: 'line',
    })
  })

  it('등락률을 빼기 전에 이름을 단어 경계에서 한 줄로 줄인다', () => {
    expect(tileText(110, 50, parts('반도체 전공정 장비', '+2.45%', '▲1 ▼1'), em)).toEqual({
      grade: 'm',
      name: '반도체…',
      nameLines: 1,
      nameFit: 'word',
      sub: null,
      change: true,
      detail: null,
    })
  })

  it('좁고 낮은 칸은 여백과 줄 간격을 줄여 등락률을 넣는다', () => {
    expect(tileText(70, 100, parts('철강', '0.00%'), em)).toMatchObject({ grade: 's', change: true })
    expect(tileText(70, 38, parts('철강', '0.00%'), em)).toMatchObject({ grade: 's', change: true })
    expect(tileText(70, 37, parts('철강', '0.00%'), em)).toMatchObject({ grade: 's', change: false })
  })

  it('등락률이 폭에 안 들어가면 이름만 남긴다', () => {
    expect(tileText(60, 100, parts('철강'), em)).toEqual({
      grade: 's',
      name: '철강',
      nameLines: 1,
      nameFit: 'full',
      sub: null,
      change: false,
      detail: null,
    })
  })

  it('등락률을 뺀 뒤에는 이름을 두 줄까지 쓴다', () => {
    expect(tileText(60, 100, parts('LED 장비'), em)).toMatchObject({
      name: 'LED 장비',
      nameLines: 2,
      nameFit: 'full',
      change: false,
    })
  })

  it('단어 중간 말줄임은 마지막 수단이고 등락률은 들어갈 때만 붙인다', () => {
    expect(tileText(60, 100, parts('고체산화물연료'), em)).toMatchObject({
      name: '고체산화물연료',
      nameLines: 1,
      nameFit: 'char',
      change: false,
    })
    expect(tileText(80, 100, parts('고체산화물연료', '0.00%'), em)).toMatchObject({
      name: '고체산화물연료',
      nameFit: 'char',
      change: true,
      detail: null,
    })
  })

  it('이름을 잘라야 하면 한 단계 작은 글자로 다시 맞춰 본다', () => {
    expect(tileText(72, 98, parts('우주태양광'), em)).toMatchObject({
      grade: 's',
      name: '우주태양광',
      nameFit: 'full',
    })
    expect(tileText(100, 49, parts('전고체 배터리', '+1.96%', '▲15 ▼2'), em)).toMatchObject({
      grade: 's',
      name: '전고체 배터리',
      nameFit: 'full',
      change: true,
    })
  })

  it('작은 글자로도 이름이 안 들어가면 원래 크기를 쓴다', () => {
    expect(tileText(110, 50, parts('반도체 전공정 장비', '+2.45%', '▲1 ▼1'), em)).toMatchObject({
      grade: 'm',
      nameFit: 'word',
    })
  })

  it('등락률 자체는 자르지 않는다', () => {
    const wide: MeasureText = (text, font) => (text.includes('%') ? 1000 : [...text].length * font.size)
    expect(tileText(240, 160, parts('반도체 소재'), wide)).toMatchObject({ change: false, detail: null })
  })
})

describe('지도 칸 재배치 모션', () => {
  it('새로 들어온 칸은 순서대로 22ms씩 늦게, 최대 400ms까지', () => {
    expect([0, 1, 10, 18, 19, 30].map(tileEnterDelay)).toEqual([0, 22, 220, 396, 400, 400])
  })

  it('이전에 없던 테마 id만 새 칸으로 본다', () => {
    expect(enteringIds([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }, { id: 4 }])).toEqual(new Set([3, 4]))
    expect(enteringIds([{ id: 1 }], [{ id: 1 }])).toEqual(new Set())
  })

  it('재배치 표시는 이동과 가장 늦은 등장이 끝날 때까지 유지한다', () => {
    expect(TILE_REFLOW_HOLD_MS).toBeGreaterThanOrEqual(TILE_REFLOW_MS)
    expect(TILE_REFLOW_HOLD_MS).toBeGreaterThanOrEqual(tileEnterDelay(Number.MAX_SAFE_INTEGER) + TILE_ENTER_MS)
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

  it('가중 등락률이 없는 테마는 절사평균이 있어도 칸에서 뺀다', () => {
    const tiles = themeTiles(
      [theme(1, { change: 2, weightedChange: 1.5 }), theme(2, { change: 4, weightedChange: null })],
      weightedChangeOf,
    )
    expect(tiles.map((t) => [t.id, t.change])).toEqual([[1, 1.5]])
  })
})

describe('themeBasisLabel', () => {
  it('장 마감 뒤에는 종가 기준이고 통합 시세임을 붙인다', () => {
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
