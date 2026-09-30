import { describe, expect, it } from 'vitest'
import { themeDetailPath, themeIdIndex } from '@/lib/themeRoute'

const THEMES = [
  { id: 25, name: 'MLCC' },
  { id: 213, name: '유진그룹' },
]

describe('themeRoute', () => {
  it('테마 이름을 숫자 id 경로로 바꾼다', () => {
    expect(themeDetailPath('MLCC', themeIdIndex(THEMES))).toBe('/theme/25')
    expect(themeDetailPath('유진그룹', themeIdIndex(THEMES))).toBe('/theme/213')
  })

  it('대소문자와 앞뒤 공백 차이를 흡수한다', () => {
    expect(themeDetailPath(' mlcc ', themeIdIndex(THEMES))).toBe('/theme/25')
  })

  it('목록 로드 전이거나 모르는 이름이면 경로를 만들지 않는다', () => {
    expect(themeDetailPath('MLCC', null)).toBeNull()
    expect(themeDetailPath('없는테마', themeIdIndex(THEMES))).toBeNull()
  })
})
