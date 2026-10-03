import { describe, expect, it } from 'vitest'
import { isBlankQuery, matchRange } from '@/lib/nameMatch'

describe('matchRange', () => {
  it('일치한 원문 구간을 돌려준다', () => {
    expect(matchRange('반도체 전공정', '전공정')).toEqual([4, 7])
  })

  it('띄어쓰기를 무시하고 찾되, 구간은 원문 기준', () => {
    expect(matchRange('반도체 기판(FC-BGA/PCB/MLB 등)', '반도체기판')).toEqual([0, 6])
    expect(matchRange('반도체기판', '반도체 기판')).toEqual([0, 5])
  })

  it('대소문자를 가리지 않는다', () => {
    expect(matchRange('반도체 기술(CXL)', 'cxl')).toEqual([7, 10])
  })

  it('못 찾거나 검색어가 비면 null', () => {
    expect(matchRange('게임', '골프')).toBeNull()
    expect(matchRange('게임', '   ')).toBeNull()
  })
})

describe('isBlankQuery', () => {
  it('공백만 있으면 빈 검색', () => {
    expect(isBlankQuery('  ')).toBe(true)
    expect(isBlankQuery(' 금 ')).toBe(false)
  })
})
