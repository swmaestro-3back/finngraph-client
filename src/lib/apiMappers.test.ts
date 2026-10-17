import { describe, expect, it } from 'vitest'
import { buildIssueTimeline, sourceUrl, toNewsDetail, toNewsItem } from '@/lib/apiMappers'
import type { CandleDate, NewsDetail, NewsRes } from '@/lib/apiTypes'

const PORTAL = 'https://portal.test/mnews/article/008/0005414390?sid=101'
const ORIGINAL = 'https://www.press-a.test/stock/2026/09/16/2026091609051329625'

function raw(over: Partial<NewsRes> = {}): NewsRes {
  return {
    id: 1,
    title: '기사',
    summary: '요약',
    url: PORTAL,
    originalUrl: ORIGINAL,
    publishedAt: '2026-09-16T09:16:00+09:00',
    collectedAt: '2026-09-17T16:44:15+09:00',
    tripleExtracted: true,
    ...over,
  }
}

describe('기사 원문 주소 — originalUrl이 있으면 그것, 없으면 url', () => {
  it('상세 응답의 originalUrl을 받아 둬요', () => {
    const detail = toNewsDetail(raw())
    expect(detail.url).toBe(PORTAL)
    expect(detail.originalUrl).toBe(ORIGINAL)
    expect(sourceUrl(detail)).toBe(ORIGINAL)
  })

  it('originalUrl이 없거나 비면 url을 써요', () => {
    expect(sourceUrl(toNewsDetail(raw({ originalUrl: undefined })))).toBe(PORTAL)
    expect(sourceUrl(toNewsDetail(raw({ originalUrl: null })))).toBe(PORTAL)
    expect(sourceUrl(toNewsDetail(raw({ originalUrl: '' })))).toBe(PORTAL)
    expect(sourceUrl(toNewsDetail(raw({ originalUrl: null, url: null })))).toBe('')
  })

  it('목록 한 줄의 매체와 링크도 원문 기준이에요', () => {
    const item = toNewsItem(toNewsDetail(raw()))
    expect(item.url).toBe(ORIGINAL)
    expect(item.meta.startsWith('press-a.test · ')).toBe(true)
    const portalOnly = toNewsItem(toNewsDetail(raw({ originalUrl: null })))
    expect(portalOnly.url).toBe(PORTAL)
    expect(portalOnly.meta.startsWith('portal.test · ')).toBe(true)
    expect(toNewsItem(toNewsDetail(raw({ originalUrl: null, url: null }))).url).toBeNull()
  })
})

function news(id: string, collectedAt: string): NewsDetail {
  return { id, title: id, summary: '', url: '', collectedAt, tripleExtracted: null }
}

// 금(9/11) → 월(9/14) → 화(9/15): 주말이 낀 거래일 슬롯
const dates: CandleDate[] = [
  { label: '9/11', date: '2026.09.11' },
  { label: '9/14', date: '2026.09.14' },
  { label: '9/15', date: '2026.09.15' },
]

function idsOf(days: ReturnType<typeof buildIssueTimeline>) {
  return days.map((d) => d.items.map((i) => i.id))
}

describe('buildIssueTimeline', () => {
  it('거래일 당일 뉴스는 해당 슬롯에 들어간다', () => {
    const days = buildIssueTimeline([news('a', '2026-09-14T10:00:00+09:00')], dates, 'D')
    expect(idsOf(days)).toEqual([[], ['a'], []])
  })

  it('주말 뉴스는 다음 거래일 슬롯이 흡수한다', () => {
    const days = buildIssueTimeline(
      [news('sat', '2026-09-12T10:00:00+09:00'), news('sun', '2026-09-13T23:00:00+09:00')],
      dates,
      'D',
    )
    expect(idsOf(days)).toEqual([[], ['sat', 'sun'], []])
  })

  it('마지막 거래일 이후 뉴스는 마지막 슬롯에 들어간다', () => {
    const days = buildIssueTimeline([news('today', '2026-09-16T09:00:00+09:00')], dates, 'D')
    expect(idsOf(days)).toEqual([[], [], ['today']])
  })

  it('첫 거래일 이전 뉴스는 첫 슬롯 창(period 기준) 안이면 포함하고, 더 오래된 것은 버린다', () => {
    const days = buildIssueTimeline(
      [news('in', '2026-09-11T08:00:00+09:00'), news('old', '2026-09-01T08:00:00+09:00')],
      dates,
      'D',
    )
    expect(idsOf(days)).toEqual([['in'], [], []])
  })

  it('collectedAt 이 비었거나 파싱 불가하면 건너뛴다', () => {
    const days = buildIssueTimeline([news('x', ''), news('y', 'not-a-date')], dates, 'D')
    expect(idsOf(days)).toEqual([[], [], []])
    expect(days.map((d) => d.neutral)).toEqual([0, 0, 0])
  })
})
