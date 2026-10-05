import { describe, expect, it } from 'vitest'
import type { IssueArticleRes, IssueDetailRes } from '@/lib/apiTypes'
import { pressName } from '@/lib/format'
import type { IssueArticleItem } from '@/lib/fg/issueRecords'
import {
  articlesByTicker,
  dayWord,
  issueArticleItems,
  liveStocks,
  liveSubject,
  periodLabel,
  representativeCaption,
  subjectHead,
} from '@/lib/fg/issueSubject'

function article(id: number, publishedAt: string | null, over: Partial<IssueArticleRes> = {}): IssueArticleRes {
  return {
    id,
    title: `기사 ${id}`,
    url: `https://news.press-b.test/view/${id}`,
    press: 'news.press-b.test',
    publishedAt,
    summary: `요약 ${id}`,
    tripleExtracted: true,
    ...over,
  }
}

function detail(over: Partial<IssueDetailRes> = {}): IssueDetailRes {
  return {
    id: 1,
    title: '가온전선 협력 미국 태양광 발전단지 MV 케이블 공급',
    titleSource: 'cluster',
    articleCount: 3,
    mediaCount: 2,
    firstPublishedAt: '2026-09-16T09:16:00+09:00',
    lastPublishedAt: '2026-09-18T09:48:00+09:00',
    keywords: ['ls에코에너지', '가온전선', '가온전선', '미국'],
    summary: '대표 기사 요약',
    representativeNewsId: 2,
    companies: [
      { ticker: '000500', name: '가온전선', mentionCount: 3 },
      { ticker: '229640', name: 'LS에코에너지', mentionCount: 2 },
    ],
    articles: [
      article(1, '2026-09-16T09:16:00+09:00', { url: 'https://www.press-a.test/stock/1', press: 'press-a.test' }),
      article(2, '2026-09-16T09:38:00+09:00'),
      article(3, '2026-09-18T00:48:00Z', { title: '  ', summary: null }),
    ],
    ...over,
  }
}

describe('dayWord', () => {
  it('오늘은 오늘, 올해는 월·일, 다른 해는 연도를 붙여요', () => {
    expect(dayWord('2026-10-05', '2026-10-05')).toBe('오늘')
    expect(dayWord('2026-09-16', '2026-10-05')).toBe('9월 16일')
    expect(dayWord('2025-12-03', '2026-10-05')).toBe('2025년 12월 3일')
  })
})

describe('periodLabel', () => {
  const today = '2026-10-05'
  it('같은 날은 시각 범위, 다른 날은 날짜 범위예요', () => {
    expect(periodLabel('2026-09-16T09:16:00+09:00', '2026-09-16T15:30:00+09:00', today)).toBe('9월 16일 09:16~15:30')
    expect(periodLabel('2026-09-16T09:16:00+09:00', '2026-09-18T09:48:00+09:00', today)).toBe('9월 16일~9월 18일')
    expect(periodLabel('2026-10-04T23:50:00+09:00', '2026-10-05T08:10:00+09:00', today)).toBe('10월 4일~오늘')
  })

  it('한 시각이면 그 시각만, 시각이 없으면 null이에요', () => {
    expect(periodLabel('2026-10-05T09:32:00+09:00', '2026-10-05T09:32:00+09:00', today)).toBe('오늘 09:32')
    expect(periodLabel(null, '2026-10-05T09:32:00+09:00', today)).toBe('오늘 09:32')
    expect(periodLabel(null, null, today)).toBeNull()
  })

  it('KST 날짜로 나눠요', () => {
    expect(periodLabel('2026-09-15T15:30:00Z', '2026-09-16T00:10:00Z', today)).toBe('9월 16일 00:30~09:10')
  })
})

describe('issueArticleItems', () => {
  it('매체 이름·KST 날짜와 시각을 붙이고, 빈 제목과 요약은 채우거나 비워요', () => {
    const items = issueArticleItems(detail().articles)
    expect(items.map((a) => [a.id, a.press, a.pressKey, a.day, a.time, a.analyzed])).toEqual([
      ['1', 'press-a.test', 'press-a.test', '2026-09-16', '09:16', true],
      ['2', 'news.press-b.test', 'news.press-b.test', '2026-09-16', '09:38', true],
      ['3', 'news.press-b.test', 'news.press-b.test', '2026-09-18', '09:48', true],
    ])
    expect(items[2].title).toBe('제목 없는 기사')
    expect(items[2].summary).toBeNull()
  })

  it('보도 시각이나 매체가 없는 기사도 남겨요', () => {
    const [item] = issueArticleItems([article(9, null, { press: null, url: null })])
    expect(item.day).toBeNull()
    expect(item.time).toBeNull()
    expect(item.press).toBe('출처 미상')
    expect(item.pressKey).toBeNull()
  })

  it('매체 이름은 원문 주소로 정해 기사 창과 같은 이름이에요', () => {
    const urls = ['https://www.press-c.test/news/articleView.html?idxno=1', 'https://portal.test/article/008/1']
    const items = issueArticleItems([
      article(10, null, { url: urls[0], press: 'press-c.test' }),
      article(11, null, { url: urls[1], press: 'portal.test' }),
      article(12, null, { url: null, press: 'press-a.test' }),
    ])
    expect(items.map((a) => a.press)).toEqual([pressName(urls[0]), pressName(urls[1]), pressName('press-a.test')])
    expect(items.map((a) => a.press)).toEqual(['press-c.test', 'portal.test', 'press-a.test'])
  })
})

describe('liveStocks', () => {
  it('언급 순서를 지키고 시세는 종목 목록에서 붙여요', () => {
    const quotes = new Map([['000500', { market: 'KOSPI', price: 58800, change: 17.95 }]])
    expect(liveStocks(detail().companies, quotes)).toEqual([
      { name: '가온전선', ticker: '000500', change: 17.95, mentions: 3, market: 'KOSPI', price: 58800 },
      { name: 'LS에코에너지', ticker: '229640', change: null, mentions: 2, market: null, price: null },
    ])
    expect(liveStocks(detail().companies, null).every((s) => s.change === null)).toBe(true)
  })
})

describe('liveSubject', () => {
  it('제목·매체 수·대표 기사·키워드를 모아요', () => {
    const subject = liveSubject(detail(), null, '2026-10-05')
    expect(subject.kind).toBe('live')
    expect(subject.id).toBe('1')
    expect(subject.title).toBe('가온전선 협력 미국 태양광 발전단지 MV 케이블 공급')
    expect(subject.media).toBe(2)
    expect(subject.articleCount).toBe(3)
    expect(subject.keywords).toEqual(['ls에코에너지', '가온전선', '미국'])
    expect(subject.kind === 'live' && subject.representative?.id).toBe('2')
  })

  it('제목이 없으면 대표 기사 제목을 써요', () => {
    expect(liveSubject(detail({ title: null }), null, '2026-10-05').title).toBe('기사 2')
    expect(liveSubject(detail({ title: null, representativeNewsId: 99 }), null, '2026-10-05').title).toBe('기사 1')
  })
})

describe('subjectHead', () => {
  it('실데이터 머리는 흐름 배지 없이 매체 수·보도 기간·탭 개수를 보여요', () => {
    const head = subjectHead(liveSubject(detail(), null, '2026-10-05'))
    expect(head.badge).toBeNull()
    expect(head.media).toBe('2개 매체')
    expect(head.when).toBe('9월 16일~9월 18일')
    expect(head.since).toBeNull()
    expect(head.counts).toEqual({ timeline: 3, articles: 3, stocks: 2 })
    expect(head.keywords).toEqual(['ls에코에너지', '가온전선', '미국'])
  })
})

describe('articlesByTicker', () => {
  it('종목마다 그 종목을 언급한 기사를 보도 순서대로 모아요', () => {
    const items: IssueArticleItem[] = issueArticleItems(detail().articles)
    const byTicker = articlesByTicker(
      items,
      new Map([
        ['1', [{ ticker: '000500' }, { ticker: null }]],
        ['2', [{ ticker: '000500' }, { ticker: '229640' }, { ticker: '000500' }]],
      ]),
    )
    expect(byTicker.get('000500')?.map((a) => a.id)).toEqual(['1', '2'])
    expect(byTicker.get('229640')?.map((a) => a.id)).toEqual(['2'])
    expect(byTicker.has('')).toBe(false)
  })
})

describe('representativeCaption', () => {
  it('대표 기사의 매체와 보도 시각을 알려요', () => {
    expect(representativeCaption(liveSubject(detail(), null, '2026-10-05'))).toBe('news.press-b.test · 9월 16일 09:38 보도')
    expect(representativeCaption(liveSubject(detail(), null, '2026-09-16'))).toBe('news.press-b.test · 오늘 09:38 보도')
  })

  it('대표 기사가 없으면 묶인 기사 수로 말해요', () => {
    const d = detail({ representativeNewsId: 99 })
    expect(representativeCaption(liveSubject(d, null, '2026-10-05'))).toBe('묶인 기사 3건 · 2개 매체')
  })
})
