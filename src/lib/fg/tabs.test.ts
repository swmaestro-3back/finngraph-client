import { describe, expect, it } from 'vitest'
import { nextTabIndex } from '@/lib/fg/tabs'

describe('nextTabIndex', () => {
  it('좌우 화살표는 양끝에서 돈다', () => {
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0)
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3)
    expect(nextTabIndex('ArrowRight', 1, 4)).toBe(2)
  })

  it('Home·End는 처음·끝', () => {
    expect(nextTabIndex('Home', 2, 4)).toBe(0)
    expect(nextTabIndex('End', 0, 4)).toBe(3)
  })

  it('다른 키와 빈 목록은 null', () => {
    expect(nextTabIndex('Enter', 0, 4)).toBeNull()
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull()
  })

  it('선택이 없으면 처음 칸 기준', () => {
    expect(nextTabIndex('ArrowRight', -1, 3)).toBe(1)
  })
})
