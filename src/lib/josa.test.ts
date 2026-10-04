import { describe, expect, it } from 'vitest'
import { josa } from '@/lib/josa'

describe('josa 은/는', () => {
  it('받침이 있으면 은, 없으면 는', () => {
    expect(josa('이런 기업 9곳', '은/는')).toBe('은')
    expect(josa('관심 종목', '은/는')).toBe('은')
    expect(josa('회원 전용 정보', '은/는')).toBe('는')
  })

  it('숫자는 읽는 소리로', () => {
    expect(josa('근거 3', '은/는')).toBe('은')
    expect(josa('이어진 기업 2', '은/는')).toBe('는')
  })

  it('기존 쌍은 그대로', () => {
    expect(josa('종목', '이/가')).toBe('이')
    expect(josa('테마', '으로/로')).toBe('로')
  })
})
