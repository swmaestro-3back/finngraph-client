import { describe, expect, it } from 'vitest'
import { isSearchShortcut, SEARCH_GROUP_LIMIT, searchKeyAction, searchOptions } from '@/lib/fg/search'

const stocks = [
  { ticker: '005930', name: '삼성전자', market: 'KOSPI' },
  { ticker: '005935', name: '삼성전자우', market: 'KOSPI' },
  { ticker: '009150', name: '삼성전기', market: 'KOSPI' },
  { ticker: '028260', name: '삼성물산', market: 'KOSPI' },
  { ticker: '207940', name: '삼성바이오로직스', market: 'KOSPI' },
  { ticker: '032830', name: '삼성생명', market: 'KOSPI' },
  { ticker: '0030R0', name: '알파테크', market: 'KOSDAQ' },
]

const themes = [
  { id: 1, name: '반도체 소재·부품' },
  { id: 2, name: '삼성그룹' },
]

describe('searchOptions', () => {
  it('빈 검색어면 결과가 없다', () => {
    expect(searchOptions('  ', stocks, themes)).toEqual([])
  })

  it('종목은 정확히 일치 → 앞부분 일치 → 포함 순, 그룹마다 최대 5개', () => {
    expect(searchOptions('삼성전자', stocks, themes).map((o) => o.label)).toEqual(['삼성전자', '삼성전자우'])
    const many = searchOptions('삼성', stocks, themes).filter((o) => o.group === 'stock')
    expect(many).toHaveLength(SEARCH_GROUP_LIMIT)
  })

  it('종목코드는 대소문자 없이 찾고, 메타는 코드 · 시장', () => {
    const [option] = searchOptions('0030r0', stocks, themes)
    expect(option).toMatchObject({ group: 'stock', label: '알파테크', meta: '0030R0 · 코스닥', to: '/stocks/0030R0' })
  })

  it('테마는 이름에 포함되면 찾고 /themes/:id로 간다', () => {
    const theme = searchOptions('삼성', stocks, themes).find((o) => o.group === 'theme')
    expect(theme).toMatchObject({ label: '삼성그룹', meta: '테마', to: '/themes/2' })
  })
})

const key = (name: string, over: Partial<{ isComposing: boolean; keyCode: number }> = {}) => ({
  key: name,
  isComposing: false,
  keyCode: 0,
  ...over,
})

const shown = (active: number, count: number) => ({ open: true, active, count })
const hidden = (count: number) => ({ open: false, active: 0, count })

describe('searchKeyAction', () => {
  it('한글 조합 중에는 아무것도 하지 않는다', () => {
    expect(searchKeyAction(key('Enter', { isComposing: true }), shown(0, 3))).toEqual({ type: 'none' })
    expect(searchKeyAction(key('ArrowDown', { isComposing: true }), shown(0, 3))).toEqual({ type: 'none' })
  })

  it('조합을 끝내는 Enter는 isComposing이 false여도 keyCode 229면 아무것도 하지 않는다', () => {
    expect(searchKeyAction(key('Enter', { keyCode: 229 }), shown(0, 3))).toEqual({ type: 'none' })
  })

  it('화살표는 끝에서 처음으로 돈다', () => {
    expect(searchKeyAction(key('ArrowDown'), shown(2, 3))).toEqual({ type: 'move', index: 0 })
    expect(searchKeyAction(key('ArrowUp'), shown(0, 3))).toEqual({ type: 'move', index: 2 })
  })

  it('Enter는 고른 항목으로 간다', () => {
    expect(searchKeyAction(key('Enter'), shown(1, 3))).toEqual({ type: 'go', index: 1 })
  })

  it('결과가 없으면 Enter·화살표는 무시하고 Escape는 닫는다', () => {
    expect(searchKeyAction(key('Enter'), shown(0, 0))).toEqual({ type: 'none' })
    expect(searchKeyAction(key('ArrowDown'), shown(0, 0))).toEqual({ type: 'none' })
    expect(searchKeyAction(key('Escape'), shown(0, 0))).toEqual({ type: 'close' })
  })

  it('닫힌 결과에서 ↓는 첫 항목을 고른 채 다시 연다', () => {
    expect(searchKeyAction(key('ArrowDown'), hidden(3))).toEqual({ type: 'open', index: 0 })
  })

  it('닫힌 결과에서는 보이지 않는 항목으로 가지 않는다', () => {
    expect(searchKeyAction(key('Enter'), hidden(3))).toEqual({ type: 'none' })
    expect(searchKeyAction(key('ArrowUp'), hidden(3))).toEqual({ type: 'none' })
    expect(searchKeyAction(key('Escape'), hidden(3))).toEqual({ type: 'close' })
  })
})

const press = (over: Partial<{ key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean }> = {}) => ({
  key: '/',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  isComposing: false,
  ...over,
})

describe('isSearchShortcut', () => {
  it('본문에서 / 를 누르면 검색으로 간다', () => {
    expect(isSearchShortcut(press(), { tagName: 'BODY' })).toBe(true)
    expect(isSearchShortcut(press(), null)).toBe(true)
  })

  it('입력 중인 칸에서는 가로채지 않는다', () => {
    expect(isSearchShortcut(press(), { tagName: 'INPUT' })).toBe(false)
    expect(isSearchShortcut(press(), { tagName: 'textarea' })).toBe(false)
    expect(isSearchShortcut(press(), { tagName: 'SELECT' })).toBe(false)
    expect(isSearchShortcut(press(), { tagName: 'DIV', isContentEditable: true })).toBe(false)
  })

  it('조합 키·한글 조합·다른 키는 무시한다', () => {
    expect(isSearchShortcut(press({ ctrlKey: true }), null)).toBe(false)
    expect(isSearchShortcut(press({ metaKey: true }), null)).toBe(false)
    expect(isSearchShortcut(press({ altKey: true }), null)).toBe(false)
    expect(isSearchShortcut(press({ isComposing: true }), null)).toBe(false)
    expect(isSearchShortcut(press({ key: '?' }), null)).toBe(false)
  })
})
