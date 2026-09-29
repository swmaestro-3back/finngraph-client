import { describe, expect, it } from 'vitest'
import {
  capSizes,
  changeStrength,
  contrastRatio,
  hasTurnoverRatio,
  mixColor,
  normalizeSizes,
  tileInk,
  tileSize,
} from '@/lib/treemapColor'

function parse(rgb: string): number[] {
  return rgb.replace(/[^\d,]/g, '').split(',').map(Number)
}

describe('tileInk', () => {
  it('가장 진한 타일에는 흰 글자를 쓴다', () => {
    expect(tileInk(mixColor('up', 1).rgb, 'up')).toBe('rgb(255,255,255)')
    expect(tileInk(mixColor('down', 1).rgb, 'down')).toBe('rgb(255,255,255)')
  })

  it('연한 타일에는 방향 잉크를 쓴다', () => {
    expect(tileInk(mixColor('up', 0.12).rgb, 'up')).toBe('rgb(122,15,24)')
    expect(tileInk(mixColor('down', 0.12).rgb, 'down')).toBe('rgb(11,42,107)')
  })

  it('모든 강도에서 글자 대비가 4.5:1 이상이다', () => {
    for (const dir of ['up', 'down'] as const) {
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const { rgb } = mixColor(dir, t)
        expect(contrastRatio(parse(tileInk(rgb, dir)), rgb)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe('changeStrength', () => {
  it('±5%에서 포화하고 방향에 대칭이다', () => {
    expect(changeStrength(2.5)).toBeCloseTo(0.5)
    expect(changeStrength(-2.5)).toBeCloseTo(0.5)
    expect(changeStrength(29.95)).toBe(1)
    expect(changeStrength(0)).toBe(0)
  })
})

describe('tileSize·capSizes', () => {
  it('크기는 |등락률| 이고 하한 0.5 를 둔다', () => {
    expect(tileSize(-3.2)).toBeCloseTo(3.2)
    expect(tileSize(0.1)).toBe(0.5)
    expect(tileSize(null)).toBe(0.5)
    expect(hasTurnoverRatio(-1)).toBe(false)
    expect(hasTurnoverRatio(1.5)).toBe(true)
  })

  it('가장 큰 타일이 전체의 25%를 넘지 않게 자른다', () => {
    const sizes = capSizes([1000, 10, 10, 10])
    const total = sizes.reduce((a, b) => a + b, 0)
    expect(sizes[0] / total).toBeCloseTo(0.25, 5)
    expect(sizes.slice(1)).toEqual([10, 10, 10])
    expect(capSizes([10, 10, 10, 10])).toEqual([10, 10, 10, 10])
  })
})

describe('normalizeSizes', () => {
  it('작은 타일도 전체의 0.6/n 이상, 큰 타일은 25% 근처 이하 면적을 갖는다', () => {
    const sizes = normalizeSizes([1000, 100, 10, 1, 1, 1, 1, 1, 1, 1])
    const total = sizes.reduce((a, b) => a + b, 0)
    expect(Math.min(...sizes) / total).toBeGreaterThanOrEqual(0.06 - 1e-3)
    expect(Math.max(...sizes) / total).toBeLessThanOrEqual(0.26)
    expect(normalizeSizes([])).toEqual([])
    expect(normalizeSizes([0, 0])).toEqual([0.5, 0.5])
  })

  it('타일이 4개 미만이면 상한을 1/n 로 푼다', () => {
    const sizes = normalizeSizes([5, 1])
    const total = sizes.reduce((a, b) => a + b, 0)
    expect(Math.max(...sizes) / total).toBeLessThanOrEqual(0.5 + 1e-6)
    expect(Math.min(...sizes) / total).toBeGreaterThanOrEqual(0.3 - 1e-6)
  })
})
