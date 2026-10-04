import { describe, expect, it } from 'vitest'
import { issuePath, stockPath, themePath } from '@/lib/fg/paths'

describe('paths', () => {
  it('새 경로 규칙', () => {
    expect(stockPath('005930')).toBe('/stocks/005930')
    expect(themePath(12)).toBe('/themes/12')
    expect(issuePath('77')).toBe('/news/77')
  })

  it('경로에 못 쓰는 글자는 인코딩한다', () => {
    expect(stockPath('A/B')).toBe('/stocks/A%2FB')
  })
})
