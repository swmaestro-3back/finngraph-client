import { describe, expect, it } from 'vitest'
import { closesBelow, sameSpan, slideFrom, spanTransform } from '@/lib/fg/motion'

describe('slideFrom', () => {
  it('이전 칸 위치에서 이전 너비로 보이게 시작한다', () => {
    expect(slideFrom({ left: 4, width: 60 }, { left: 64, width: 80 })).toBe('translateX(4px) scaleX(0.75)')
  })

  it('너비가 같으면 배율은 1', () => {
    expect(slideFrom({ left: 100, width: 48 }, { left: 4, width: 48 })).toBe('translateX(100px) scaleX(1)')
  })

  it('새 칸 너비가 0이면 배율을 1로 둔다', () => {
    expect(slideFrom({ left: 4, width: 60 }, { left: 0, width: 0 })).toBe('translateX(4px) scaleX(1)')
  })

  it('끝 상태는 이동만 남는다', () => {
    expect(spanTransform({ left: 64, width: 80 })).toBe('translateX(64px)')
  })
})

describe('sameSpan', () => {
  it('위치와 너비가 모두 같아야 같다', () => {
    expect(sameSpan({ left: 4, width: 60 }, { left: 4, width: 60 })).toBe(true)
    expect(sameSpan({ left: 4, width: 60 }, { left: 4, width: 61 })).toBe(false)
    expect(sameSpan(null, { left: 4, width: 60 })).toBe(false)
  })
})

describe('closesBelow', () => {
  const order = [11, 22, 33, 44]

  it('닫히는 행이 새로 고른 행보다 아래면 참', () => {
    expect(closesBelow(order, 44, 22)).toBe(true)
  })

  it('닫히는 행이 위에 있으면 거짓 — 고른 행이 밀려 올라가므로 바로 닫는다', () => {
    expect(closesBelow(order, 11, 33)).toBe(false)
  })

  it('어느 한쪽이 목록에 없으면 거짓', () => {
    expect(closesBelow(order, 99, 22)).toBe(false)
    expect(closesBelow(order, 22, 99)).toBe(false)
  })
})
