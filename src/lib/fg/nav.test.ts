import { describe, expect, it } from 'vitest'
import {
  activeMenu,
  authSlot,
  canvasFor,
  MAIN_MENU,
  outletKey,
  SIDE_LINKS,
} from '@/lib/fg/nav'

describe('MAIN_MENU', () => {
  it('디자인대로 다섯 메뉴를 이 순서로 둔다', () => {
    expect(MAIN_MENU.map((item) => item.label)).toEqual(['홈', '뉴스', '테마', '종목', '관계 탐색'])
  })
})

describe('SIDE_LINKS', () => {
  it('오른쪽 링크는 브리핑 옆에 캘린더를 둔다', () => {
    expect(SIDE_LINKS.map((link) => [link.label, link.to])).toEqual([
      ['브리핑', '/briefing'],
      ['캘린더', '/calendar'],
    ])
  })
})

describe('activeMenu', () => {
  it.each([
    ['/', 'home'],
    ['/news', 'news'],
    ['/news/42', 'news'],
    ['/themes', 'themes'],
    ['/themes/7', 'themes'],
    ['/theme/7', 'themes'],
    ['/stocks', 'stocks'],
    ['/stocks/005930', 'stocks'],
    ['/stock/005930', 'stocks'],
    ['/graph', 'graph'],
    ['/graph/005930', 'graph'],
    ['/graph/theme/반도체', 'graph'],
  ])('%s → %s', (path, key) => {
    expect(activeMenu(path)).toBe(key)
  })

  it('메뉴 밖 경로는 null', () => {
    expect(activeMenu('/briefing')).toBeNull()
    expect(activeMenu('/me/account')).toBeNull()
    expect(activeMenu('/newsletter')).toBeNull()
  })
})

describe('canvasFor', () => {
  it('개편된 화면은 회색 바탕, 나머지는 흰 바탕', () => {
    expect(canvasFor('/news')).toBe('page')
    expect(canvasFor('/news/1')).toBe('page')
    expect(canvasFor('/dev/fg')).toBe('page')
    expect(canvasFor('/themes')).toBe('page')
    expect(canvasFor('/themes/59')).toBe('page')
    expect(canvasFor('/theme/59')).toBe('surface')
    expect(canvasFor('/stocks')).toBe('page')
    expect(canvasFor('/stocks/005930')).toBe('page')
    expect(canvasFor('/stock/005930')).toBe('surface')
    expect(canvasFor('/')).toBe('surface')
    expect(canvasFor('/briefing')).toBe('surface')
    expect(canvasFor('/newsletter')).toBe('surface')
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
    expect(outletKey('/news')).toBe('/news')
    expect(outletKey('/news/12')).toBe('/news')
    expect(outletKey('/dev/fg')).toBe('/dev')
    expect(outletKey('/themes')).toBe('/themes')
    expect(outletKey('/themes/59')).toBe('/themes')
    expect(outletKey('/stocks')).toBe('/stocks')
    expect(outletKey('/stocks/005930')).toBe('/stocks')
  })

  it('기준 경로로 시작하기만 하는 경로는 개편된 화면이 아니다', () => {
    expect(outletKey('/newsletter')).toBe('/newsletter')
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
