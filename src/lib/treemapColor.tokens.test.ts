import { describe, expect, it } from 'vitest'
import { mixRgb, parseHexColor, rgbText } from '@/lib/treemapColor'

describe('parseHexColor', () => {
  it('6자리 hex를 RGB로 읽는다', () => {
    expect(parseHexColor('#c4202a')).toEqual([196, 32, 42])
    expect(parseHexColor('  #FFF0F0 ')).toEqual([255, 240, 240])
  })

  it('다른 형식은 null', () => {
    expect(parseHexColor('#fff')).toBeNull()
    expect(parseHexColor('red')).toBeNull()
    expect(parseHexColor('')).toBeNull()
  })
})

describe('mixRgb', () => {
  const from = [255, 240, 240] as const
  const to = [196, 32, 42] as const

  it('양 끝과 가운데를 보간한다', () => {
    expect(mixRgb(from, to, 0)).toEqual([255, 240, 240])
    expect(mixRgb(from, to, 1)).toEqual([196, 32, 42])
    expect(mixRgb(from, to, 0.5)).toEqual([226, 136, 141])
  })

  it('0~1 밖은 끝값으로 자른다', () => {
    expect(mixRgb(from, to, 2)).toEqual([196, 32, 42])
    expect(mixRgb(from, to, -1)).toEqual([255, 240, 240])
  })
})

describe('rgbText', () => {
  it('CSS rgb() 문자열', () => {
    expect(rgbText([1, 2, 3])).toBe('rgb(1,2,3)')
  })
})
