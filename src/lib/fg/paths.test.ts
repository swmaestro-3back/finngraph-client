import { describe, expect, it } from 'vitest'
import { issuePath, stockPath, stockSelectPath, themePath, themeSelectPath } from '@/lib/fg/paths'

describe('paths', () => {
  it('새 경로 규칙', () => {
    expect(stockPath('005930')).toBe('/stocks/005930')
    expect(themePath(12)).toBe('/themes/12')
    expect(issuePath('77')).toBe('/news/77')
  })

  it('테마 경로는 상세, 목록에서 고르는 경로는 쿼리', () => {
    expect(themePath(1016)).toBe('/themes/1016')
    expect(themeSelectPath(1016)).toBe('/themes?id=1016')
  })

  it('종목도 상세는 경로, 목록에서 고르는 경로는 쿼리', () => {
    expect(stockPath('005930')).toBe('/stocks/005930')
    expect(stockSelectPath('005930')).toBe('/stocks?code=005930')
  })

  it('경로에 못 쓰는 글자는 인코딩한다', () => {
    expect(stockPath('A/B')).toBe('/stocks/A%2FB')
  })
})
