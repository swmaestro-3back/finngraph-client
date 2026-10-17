import { describe, expect, it } from 'vitest'
import type { GraphNode } from '@/data/graphTypes'
import { eventInPeriod, eventPeriodCutoff, isEventPeriod } from '@/lib/eventPeriod'

describe('eventPeriodCutoff', () => {
  it('전체는 시작일이 없다', () => {
    expect(eventPeriodCutoff('all', '2026-10-09')).toBeNull()
  })

  it('1주는 7일 전, 달 단위는 같은 날짜의 n달 전', () => {
    expect(eventPeriodCutoff('1w', '2026-10-09')).toBe('2026-10-02')
    expect(eventPeriodCutoff('1m', '2026-10-09')).toBe('2026-09-09')
    expect(eventPeriodCutoff('3m', '2026-10-09')).toBe('2026-07-09')
    expect(eventPeriodCutoff('6m', '2026-10-09')).toBe('2026-04-09')
  })

  it('달·해 경계를 넘는다', () => {
    expect(eventPeriodCutoff('1w', '2026-01-03')).toBe('2025-12-27')
    expect(eventPeriodCutoff('3m', '2026-02-15')).toBe('2025-11-15')
  })

  it('그 달에 없는 날짜는 말일로 당긴다', () => {
    expect(eventPeriodCutoff('1m', '2026-03-31')).toBe('2026-02-28')
    expect(eventPeriodCutoff('6m', '2026-08-31')).toBe('2026-02-28')
    expect(eventPeriodCutoff('1m', '2026-05-31')).toBe('2026-04-30')
  })
})

describe('eventInPeriod', () => {
  const event = (lastPublishedAt?: string): GraphNode => ({
    id: 'ev', label: 'ev', type: 'event', data: { firstPublishedAt: '2026-06-17T09:00:00.000000000+09:00', lastPublishedAt },
  })
  const company: GraphNode = { id: 'c', label: 'c', type: 'company', data: {} }

  it('전체(null)면 무엇이든 남는다', () => {
    expect(eventInPeriod(event(), null)).toBe(true)
    expect(eventInPeriod(company, null)).toBe(true)
  })

  it('이벤트가 아닌 노드는 기간과 무관하다', () => {
    expect(eventInPeriod(company, '2026-10-02')).toBe(true)
  })

  it('마지막 보도일이 시작일 이후(포함)면 남는다 — 소수점 9자리 타임스탬프도 날짜만 본다', () => {
    expect(eventInPeriod(event('2026-10-02T00:10:00.000000000+09:00'), '2026-10-02')).toBe(true)
    expect(eventInPeriod(event('2026-10-08T19:55:00.000000000+09:00'), '2026-10-02')).toBe(true)
    expect(eventInPeriod(event('2026-10-01T23:59:00.000000000+09:00'), '2026-10-02')).toBe(false)
  })

  it('보도일이 없는 이벤트는 기간을 고르면 숨는다', () => {
    expect(eventInPeriod(event(), '2026-10-02')).toBe(false)
  })
})

describe('isEventPeriod', () => {
  it('알려진 값만 통과한다', () => {
    expect(isEventPeriod('1w')).toBe(true)
    expect(isEventPeriod('all')).toBe(true)
    expect(isEventPeriod('2w')).toBe(false)
    expect(isEventPeriod(null)).toBe(false)
  })
})
