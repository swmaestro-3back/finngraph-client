import { describe, expect, it } from 'vitest'
import { nextStoredGapPref, resolveGapMode } from '@/lib/fg/gapMode'

describe('resolveGapMode', () => {
  it('운영 빌드는 언제나 준비 중', () => {
    expect(resolveGapMode(false, '', null)).toBe('not-ready')
    expect(resolveGapMode(false, '?gaps=on', null)).toBe('not-ready')
  })

  it('개발 모드는 기본이 목업', () => {
    expect(resolveGapMode(true, '', null)).toBe('mock')
  })

  it('?gaps=off 나 저장된 off 는 운영 모습', () => {
    expect(resolveGapMode(true, '?gaps=off', null)).toBe('not-ready')
    expect(resolveGapMode(true, '', 'off')).toBe('not-ready')
  })

  it('?gaps=on 은 저장값보다 우선', () => {
    expect(resolveGapMode(true, '?gaps=on', 'off')).toBe('mock')
  })
})

describe('nextStoredGapPref', () => {
  it('쿼리에 on/off가 있을 때만 저장할 값을 준다', () => {
    expect(nextStoredGapPref('?gaps=off')).toBe('off')
    expect(nextStoredGapPref('?gaps=on&x=1')).toBe('on')
    expect(nextStoredGapPref('?gaps=maybe')).toBeNull()
    expect(nextStoredGapPref('')).toBeNull()
  })
})
