import { describe, expect, it } from 'vitest'
import type { GraphNode } from '@/data/graphTypes'
import { eventInfo, eventPeriod, eventSubtitle } from '@/lib/graphEvent'

const full: GraphNode = {
  id: 'e1',
  label: '로봇 액추에이터 수주 협의',
  type: 'event',
  data: {
    keywords: ['로봇'],
    companies: ['LG전자'],
    memberCount: 3,
    firstPublishedAt: '2026-09-01T09:12:00+09:00',
    lastPublishedAt: '2026-09-07T15:39:00+09:00',
    representativeNewsId: 4,
  },
}
const bare: GraphNode = { id: 'e2', label: '빈 이벤트', type: 'event', data: {} }

describe('graphEvent', () => {
  it('eventInfo는 없는 필드를 null·빈 배열로 채운다', () => {
    expect(eventInfo(bare)).toEqual({
      keywords: [],
      companies: [],
      memberCount: null,
      firstPublishedAt: null,
      lastPublishedAt: null,
      representativeNewsId: null,
    })
    expect(eventInfo(full).representativeNewsId).toBe(4)
  })

  it('기간은 날짜만, 같은 날이면 하루만', () => {
    expect(eventPeriod('2026-09-01T09:12:00+09:00', '2026-09-07T15:39:00+09:00')).toBe('2026-09-01 ~ 2026-09-07')
    expect(eventPeriod('2026-09-07T09:12:00+09:00', '2026-09-07T15:39:00+09:00')).toBe('2026-09-07')
    expect(eventPeriod('2026-09-07', null)).toBe('2026-09-07')
    expect(eventPeriod(null, null)).toBe('')
  })

  it('툴팁 부제는 건수와 기간을 잇고, 둘 다 없으면 "이벤트"', () => {
    expect(eventSubtitle(full)).toBe('뉴스 3건 · 2026-09-01 ~ 2026-09-07')
    expect(eventSubtitle(bare)).toBe('이벤트')
  })
})
