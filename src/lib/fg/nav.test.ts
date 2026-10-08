import { describe, expect, it } from 'vitest'
import {
  activeMenu,
  authSlot,
  BOTTOM_TABS,
  canvasFor,
  MAIN_MENU,
  outletKey,
  SIDE_LINKS,
} from '@/lib/fg/nav'

describe('MAIN_MENU', () => {
  it('뉴스 메뉴 없이 다섯 메뉴를 이 순서로 두고 캘린더는 관계 탐색 옆에 둔다', () => {
    expect(MAIN_MENU.map((item) => [item.label, item.to])).toEqual([
      ['홈', '/'],
      ['테마', '/themes'],
      ['종목', '/stocks'],
      ['관계 탐색', '/graph'],
      ['캘린더', '/calendar'],
    ])
  })
})

describe('BOTTOM_TABS', () => {
  it('하단 탭 다섯 칸은 뉴스 자리에 브리핑을 둔다', () => {
    expect(BOTTOM_TABS.map((item) => [item.key, item.label, item.to])).toEqual([
      ['home', '홈', '/'],
      ['briefing', '브리핑', '/briefing'],
      ['themes', '테마', '/themes'],
      ['stocks', '종목', '/stocks'],
      ['graph', '관계 탐색', '/graph'],
    ])
  })
})

describe('SIDE_LINKS', () => {
  it('오른쪽 링크는 브리핑과 캘린더이고, 브리핑은 하단 탭이 있는 폭에서, 캘린더는 상단 메뉴가 있는 폭에서 숨긴다', () => {
    expect(
      SIDE_LINKS.map((link) => [link.label, link.to, link.wideOnly ?? false, link.narrowOnly ?? false]),
    ).toEqual([
      ['브리핑', '/briefing', true, false],
      ['캘린더', '/calendar', false, true],
    ])
  })
})

describe('activeMenu', () => {
  it.each([
    ['/', 'home'],
    ['/issues/42', 'home'],
    ['/issues/export', 'home'],
    ['/briefing', 'briefing'],
    ['/themes', 'themes'],
    ['/themes/7', 'themes'],
    ['/theme/7', 'themes'],
    ['/stocks', 'stocks'],
    ['/stocks/005930', 'stocks'],
    ['/stock/005930', 'stocks'],
    ['/graph', 'graph'],
    ['/graph/005930', 'graph'],
    ['/graph/theme/반도체', 'graph'],
    ['/calendar', 'calendar'],
  ])('%s → %s', (path, key) => {
    expect(activeMenu(path)).toBe(key)
  })

  it('메뉴 밖 경로는 null', () => {
    expect(activeMenu('/news')).toBeNull()
    expect(activeMenu('/news/42')).toBeNull()
    expect(activeMenu('/me/account')).toBeNull()
    expect(activeMenu('/issuesboard')).toBeNull()
  })
})

describe('canvasFor', () => {
  it('개편된 화면은 회색 바탕, 나머지는 흰 바탕', () => {
    expect(canvasFor('/issues/1')).toBe('page')
    expect(canvasFor('/issues/export')).toBe('page')
    expect(canvasFor('/news')).toBe('surface')
    expect(canvasFor('/news/1')).toBe('surface')
    expect(canvasFor('/dev/fg')).toBe('page')
    expect(canvasFor('/themes')).toBe('page')
    expect(canvasFor('/themes/59')).toBe('page')
    expect(canvasFor('/theme/59')).toBe('surface')
    expect(canvasFor('/stocks')).toBe('page')
    expect(canvasFor('/stocks/005930')).toBe('page')
    expect(canvasFor('/stock/005930')).toBe('surface')
    expect(canvasFor('/')).toBe('page')
    expect(canvasFor('/briefing')).toBe('surface')
    expect(canvasFor('/issuesboard')).toBe('surface')
  })
})

describe('outletKey', () => {
  it('옛 화면은 경로 자체를 키로 써서 경로가 바뀌면 다시 마운트된다', () => {
    expect(outletKey('/graph/005930')).toBe('/graph/005930')
    expect(outletKey('/stock/005930')).toBe('/stock/005930')
    expect(outletKey('/me/account')).toBe('/me/account')
    expect(outletKey('/calendar')).toBe('/calendar')
    expect(outletKey('/graph/005930')).not.toBe(outletKey('/graph/028050'))
  })

  it('개편된 화면은 기준 경로를 키로 써서 그 안에서는 유지된다', () => {
    expect(outletKey('/')).toBe('/')
    expect(outletKey('/issues/12')).toBe('/issues')
    expect(outletKey('/issues/export')).toBe('/issues')
    expect(outletKey('/dev/fg')).toBe('/dev')
    expect(outletKey('/themes')).toBe('/themes')
    expect(outletKey('/themes/59')).toBe('/themes')
    expect(outletKey('/stocks')).toBe('/stocks')
    expect(outletKey('/stocks/005930')).toBe('/stocks')
  })

  it('기준 경로로 시작하기만 하는 경로는 개편된 화면이 아니다', () => {
    expect(outletKey('/issuesboard')).toBe('/issuesboard')
    expect(outletKey('/news/12')).toBe('/news/12')
  })
})

describe('authSlot', () => {
  it('확인 중에는 자리만, 로그인 전에는 로그인, 로그인 후에는 메뉴', () => {
    expect(authSlot('loading', false)).toBe('pending')
    expect(authSlot('anonymous', false)).toBe('login')
    expect(authSlot('authenticated', true)).toBe('menu')
    expect(authSlot('authenticated', false)).toBe('login')
  })
})
