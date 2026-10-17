import { describe, expect, it } from 'vitest'
import { filterFromParams, filterToParams } from '@/lib/stockFilter'

/**
 * StockListPage가 필터 키를 만드는 방식 그대로 — 필터 외 쿼리를 떼어 문자열로 만들고(toString),
 * 그 문자열을 다시 읽어도(new URLSearchParams) 같은 상태여야 한다
 */
function roundTrip(query: string) {
  const params = new URLSearchParams(query)
  const only = new URLSearchParams()
  filterToParams(filterFromParams(params), only)
  const key = only.toString()
  return { key, direct: filterFromParams(params), viaKey: filterFromParams(new URLSearchParams(key)) }
}

describe('filter 키 왕복', () => {
  it('페이지·정렬 쿼리를 떼어도 같은 FilterState', () => {
    const { key, direct, viaKey } = roundTrip(
      'page=3&sort=per&dir=asc&market=KOSDAQ&preset=lowPer,highRoe&per=..10&marketCap=1000..5000',
    )
    expect(direct.market).toBe('KOSDAQ')
    expect([...direct.presets]).toEqual(['lowPer', 'highRoe'])
    expect(direct.ranges).toEqual({ per: { max: 10 }, marketCap: { min: 1000, max: 5000 } })
    expect(viaKey).toEqual(direct)
    // 쉼표는 %2C로 직렬화되지만 다시 읽으면 복원된다
    expect(key).toContain('preset=lowPer%2ChighRoe')
    expect(key).not.toContain('page=')
    expect(key).not.toContain('sort=')
  })

  it('양끝이 빈 범위(..)는 양쪽 다 버린다', () => {
    const { key, direct, viaKey } = roundTrip('marketCap=..')
    expect(viaKey).toEqual(direct)
    expect(direct.ranges).toEqual({})
    expect(key).toBe('')
  })

  it('빈 쿼리는 기본 상태', () => {
    const { key, direct, viaKey } = roundTrip('')
    expect(viaKey).toEqual(direct)
    expect(direct.market).toBe('ALL')
    expect(direct.presets.size).toBe(0)
    expect(direct.ranges).toEqual({})
    expect(key).toBe('')
  })
})
