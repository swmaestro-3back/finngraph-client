import { describe, expect, it } from 'vitest'
import type { GraphNode } from '@/data/graphTypes'
import { eventArticles, eventArticlesNote, eventInfo, eventPeriod, eventSubtitle } from '@/lib/graphEvent'

const full: GraphNode = {
  id: 'e1',
  label: '로봇 액추에이터 수주 협의',
  type: 'event',
  data: {
    keywords: ['로봇'],
    newsCount: 3,
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
      newsCount: null,
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

describe('이벤트 상세', () => {
  const base = {
    cluster_id: 9, title: null, keywords: [], representative_news_id: 11,
    first_published_at: null, last_published_at: null, news_total: 3, companies: [],
  }

  it('기사는 오래된 순 타임라인 — 원문 링크가 있으면 원문', () => {
    const articles = eventArticles({
      ...base,
      news: [
        { news_id: '12', title: '후속', url: 'n12', original_url: 'o12', published_at: '2026-10-02T09:00:00+09:00' },
        { news_id: '11', title: null, url: 'n11', original_url: null, published_at: '2026-10-01T09:00:00+09:00' },
      ],
    })
    expect(articles).toEqual([
      { id: '11', title: '(제목 없음)', url: 'n11', publishedAt: '2026-10-01T09:00:00+09:00' },
      { id: '12', title: '후속', url: 'o12', publishedAt: '2026-10-02T09:00:00+09:00' },
    ])
  })

  it('보여주는 기사가 전체보다 적으면 그 이유를 말한다 — 전부 미분석이어도 섹션을 지우지 않는다', () => {
    expect(eventArticlesNote(3, 3)).toBeNull()
    expect(eventArticlesNote(2, 5)).toBe('분석된 기사 2건만 보여줍니다. 전체 5건.')
    expect(eventArticlesNote(0, 4)).toBe('기사 4건이 아직 분석되지 않아 제목을 불러오지 못했습니다.')
  })
})
