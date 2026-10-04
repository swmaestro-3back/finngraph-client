import { describe, expect, it } from 'vitest'
import { formatGapPct, formatPriceWon, formatSignedAmount, marketLabel, toneClass, toneOf } from '@/lib/fg/format'

describe('toneOf', () => {
  it('양수는 up, 음수는 down, 0과 값 없음은 flat', () => {
    expect(toneOf(1.68)).toBe('up')
    expect(toneOf(-0.82)).toBe('down')
    expect(toneOf(0)).toBe('flat')
    expect(toneOf(null)).toBe('flat')
    expect(toneOf(undefined)).toBe('flat')
  })

  it('클래스 이름은 fg- 접두사', () => {
    expect(toneClass(2)).toBe('fg-up')
    expect(toneClass(-2)).toBe('fg-down')
    expect(toneClass(0)).toBe('fg-flat')
  })
})

describe('marketLabel', () => {
  it('코스피·코스닥은 한글로, 나머지는 그대로', () => {
    expect(marketLabel('KOSPI')).toBe('코스피')
    expect(marketLabel('KOSDAQ')).toBe('코스닥')
    expect(marketLabel('KONEX')).toBe('KONEX')
    expect(marketLabel(null)).toBe('')
  })
})

describe('formatPriceWon', () => {
  it('천 단위 쉼표와 원', () => {
    expect(formatPriceWon(72400)).toBe('72,400원')
    expect(formatPriceWon(5030.4)).toBe('5,030원')
  })
})

describe('formatSignedAmount', () => {
  it('부호와 쉼표, 마이너스는 U+2212', () => {
    expect(formatSignedAmount(1200)).toBe('+1,200')
    expect(formatSignedAmount(-150)).toBe('−150')
    expect(formatSignedAmount(0)).toBe('0')
    expect(formatSignedAmount(-0.4)).toBe('0')
  })
})

describe('formatGapPct', () => {
  it('소수 1자리, 마이너스는 U+2212', () => {
    expect(formatGapPct(-3.338)).toBe('−3.3%')
    expect(formatGapPct(0)).toBe('0.0%')
    expect(formatGapPct(-0.04)).toBe('0.0%')
    expect(formatGapPct(1.25)).toBe('+1.3%')
  })
})
