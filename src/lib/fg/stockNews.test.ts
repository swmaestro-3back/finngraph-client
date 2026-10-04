import { describe, expect, it } from 'vitest'
import type { CandleRes } from '@/lib/apiTypes'
import { newsDays, newsPage, opensInModal, openNews } from '@/lib/fg/stockNews'
import type { ThemeNewsItem } from '@/lib/fg/themeNews'

function bar(date: string, close: number, volume = 100): CandleRes {
  return { date, open: close, high: close, low: close, close, volume }
}

function news(id: string, day: string, time: string, tradeDay: string, analyzed = false, url = `https://news.example.com/${id}`): ThemeNewsItem {
  return { id, title: `기사 ${id}`, url, press: 'news.example.com', day, time, tradeDay, analyzed }
}

const candles = [bar('2026-09-25', 1000), bar('2026-09-28', 1100, 300), bar('2026-09-29', 1045), bar('2026-09-30', 1045)]

const items = [
  news('a', '2026-10-03', '09:00', '2026-10-05'),
  news('b', '2026-09-30', '15:10', '2026-09-30', true),
  news('c', '2026-09-27', '10:00', '2026-09-28'),
  news('d', '2026-09-28', '08:00', '2026-09-28', true),
  news('e', '2026-09-29', '11:00', '2026-09-29'),
]

describe('newsDays', () => {
  it('봉이 있는 거래일마다 뉴스를 묶고 그날 등락·거래량 배수를 단다', () => {
    const days = newsDays(items, candles)
    expect(days.map((d) => [d.tradeDay, d.index, d.items.map((n) => n.id)])).toEqual([
      ['2026-09-30', 3, ['b']],
      ['2026-09-29', 2, ['e']],
      ['2026-09-28', 1, ['c', 'd']],
    ])
    expect(days[2].change).toBeCloseTo(10, 6)
    expect(days[2].volumeRatio).toBe(3)
    expect(days[0].change).toBe(0)
  })

  it('봉이 없으면 묶지 않는다', () => {
    expect(newsDays(items, [])).toEqual([])
  })
})

describe('newsPage', () => {
  it('고른 날이 없으면 최신 뉴스부터, 있으면 그날 뉴스만 끊어서', () => {
    expect(newsPage(items, null, 2)).toEqual({ rows: [items[0], items[1]], total: 5 })
    expect(newsPage(items, '2026-09-28', 5)).toEqual({ rows: [items[2], items[3]], total: 2 })
  })
})

describe('openNews', () => {
  it('비회원은 열린 날짜부터만 본다', () => {
    expect(openNews(items, null)).toHaveLength(5)
    expect(openNews(items, '2026-09-29').map((n) => n.id)).toEqual(['a', 'b', 'e'])
  })
})

describe('opensInModal', () => {
  it('분석된 뉴스는 상세 창, 아니면 원문 새 탭(원문 주소가 없으면 상세 창)', () => {
    expect(opensInModal(items[1])).toBe(true)
    expect(opensInModal(items[0])).toBe(false)
    expect(opensInModal(news('x', '2026-09-30', '10:00', '2026-09-30', false, ''))).toBe(true)
  })
})
