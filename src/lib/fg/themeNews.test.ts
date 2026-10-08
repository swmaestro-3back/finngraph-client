import { describe, expect, it } from 'vitest'
import type { NewsDetail } from '@/lib/apiTypes'
import {
  defaultRange,
  guestStart,
  kstDayTime,
  newsListView,
  rangeStart,
  toThemeNews,
  tradeDayOf,
  type ThemeNewsItem,
} from '@/lib/fg/themeNews'

const TRADING = ['2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29', '2026-09-30']

function raw(id: number, at: string, analyzed: boolean | null = true, url = 'https://www.press-a.test/news/view/1'): NewsDetail {
  return { id: String(id), title: `기사 ${id}`, summary: '', url, collectedAt: at, tripleExtracted: analyzed }
}

function item(id: number, day: string, tradeDay = day, analyzed = true, time = '09:00'): ThemeNewsItem {
  return { id: String(id), title: `기사 ${id}`, url: '', press: '예시경제', day, time, tradeDay, analyzed }
}

describe('kstDayTime', () => {
  it('KST 날짜와 시각으로 읽는다', () => {
    expect(kstDayTime('2026-09-27T17:30:00+09:00')).toEqual({ day: '2026-09-27', time: '17:30' })
    expect(kstDayTime('2026-09-27T16:10:00Z')).toEqual({ day: '2026-09-28', time: '01:10' })
    expect(kstDayTime('')).toBeNull()
    expect(kstDayTime('not a date')).toBeNull()
  })
})

describe('tradeDayOf', () => {
  it('거래일이면 그날, 주말·휴장일이면 다음 거래일이다', () => {
    expect(tradeDayOf('2026-09-25', TRADING)).toBe('2026-09-25')
    expect(tradeDayOf('2026-09-26', TRADING)).toBe('2026-09-28')
    expect(tradeDayOf('2026-09-27', TRADING)).toBe('2026-09-28')
  })

  it('지수 범위 밖이면 주말만 다음 월요일로 넘긴다', () => {
    expect(tradeDayOf('2026-10-01', TRADING)).toBe('2026-10-01')
    expect(tradeDayOf('2026-10-03', TRADING)).toBe('2026-10-05')
    expect(tradeDayOf('2026-09-20', TRADING)).toBe('2026-09-21')
    expect(tradeDayOf('2026-09-23', [])).toBe('2026-09-23')
  })
})

describe('toThemeNews', () => {
  it('출처·날짜·묶을 거래일·분석 여부를 붙이고 최신순으로 둔다', () => {
    const items = toThemeNews(
      [
        raw(1, '2026-09-25T10:00:00+09:00', false),
        raw(2, '2026-09-27T17:30:00+09:00', true, 'https://portal.test/mnews/article/1'),
        raw(3, '2026-09-28T09:10:00+09:00', null),
        raw(4, ''),
      ],
      TRADING,
    )
    expect(items.map((n) => n.id)).toEqual(['3', '2', '1'])
    expect(items[1]).toEqual({
      id: '2',
      title: '기사 2',
      url: 'https://portal.test/mnews/article/1',
      press: 'portal.test',
      day: '2026-09-27',
      time: '17:30',
      tradeDay: '2026-09-28',
      analyzed: true,
    })
    expect(items[0].analyzed).toBe(false)
  })

  it('원문 주소가 있으면 매체와 링크를 원문으로 정해요', () => {
    const [withOriginal] = toThemeNews(
      [{ ...raw(5, '2026-09-28T09:10:00+09:00', true, 'https://portal.test/mnews/article/008/1'), originalUrl: 'https://www.press-b.test/stock/1' }],
      TRADING,
    )
    expect(withOriginal.url).toBe('https://www.press-b.test/stock/1')
    expect(withOriginal.press).toBe('press-b.test')
    const [plain] = toThemeNews([raw(6, '2026-09-28T09:10:00+09:00', true, 'https://portal.test/mnews/article/2')], TRADING)
    expect(plain.url).toBe('https://portal.test/mnews/article/2')
    expect(plain.press).toBe('portal.test')
  })
})

describe('범위', () => {
  it('최근 1주는 오늘 포함 7일, 최근 1달은 한 달 전 같은 날부터다', () => {
    expect(rangeStart('w', '2026-10-02')).toBe('2026-09-26')
    expect(rangeStart('m', '2026-10-02')).toBe('2026-09-02')
    expect(rangeStart('all', '2026-10-02')).toBe('')
    expect(guestStart('2026-10-02')).toBe('2026-09-26')
  })

  it('기본 범위는 5건 이상이 되는 가장 짧은 범위다', () => {
    const recent = [1, 2, 3, 4, 5].map((id) => item(id, '2026-09-30'))
    expect(defaultRange(recent, '2026-10-02')).toBe('w')
    const spread = [item(1, '2026-09-30'), item(2, '2026-09-20'), item(3, '2026-09-10'), item(4, '2026-09-05'), item(5, '2026-09-03')]
    expect(defaultRange(spread, '2026-10-02')).toBe('m')
    expect(defaultRange([...spread, item(6, '2026-06-01')], '2026-10-02')).toBe('m')
  })

  it('어느 범위도 5건이 안 되면 전부를 담는 가장 짧은 범위다', () => {
    expect(defaultRange([item(1, '2026-09-30'), item(2, '2026-09-28')], '2026-10-02')).toBe('w')
    expect(defaultRange([item(1, '2026-09-30'), item(2, '2026-09-10')], '2026-10-02')).toBe('m')
    expect(defaultRange([item(1, '2026-09-30'), item(2, '2026-03-10')], '2026-10-02')).toBe('all')
    expect(defaultRange([], '2026-10-02')).toBe('all')
  })
})

describe('newsListView', () => {
  const items = [
    item(1, '2026-09-30', '2026-09-30', true, '11:00'),
    item(2, '2026-09-30', '2026-09-30', false, '09:00'),
    item(3, '2026-09-27', '2026-09-28', true, '17:30'),
    item(4, '2026-09-24', '2026-09-24', false),
    item(5, '2026-09-10', '2026-09-10', true),
    item(6, '2026-06-02', '2026-06-02', true),
  ]
  const base = { items, selected: null, range: 'm' as const, onlyAnalyzed: false, page: 1, openFrom: null, today: '2026-10-02' }

  it('범위 안 기사를 거래일로 묶고 주말 기사는 원래 날짜를 메타에 쓴다', () => {
    const view = newsListView(base)
    expect(view.countText).toBe('최근 1달 5건 · 분석 3건 · 최신순')
    expect(view.groups.map((g) => [g.label, g.total, g.rows.map((r) => r.item.id)])).toEqual([
      ['9월 30일(수)', 2, ['1', '2']],
      ['9월 28일(월)', 1, ['3']],
      ['9월 24일(목)', 1, ['4']],
      ['9월 10일(목)', 1, ['5']],
    ])
    expect(view.groups[0].rows[0].meta).toBe('예시경제 · 11:00')
    expect(view.groups[1].rows[0].meta).toBe('예시경제 · 9월 27일(일) 17:30')
    expect(view.analyzedCount).toBe(3)
    expect(view.empty).toBeNull()
    expect(view.gated).toBe(false)
  })

  it('분석만 켜면 분석 뉴스만 남는다', () => {
    const view = newsListView({ ...base, onlyAnalyzed: true })
    expect(view.open.map((n) => n.id)).toEqual(['1', '3', '5'])
    expect(view.analyzedCount).toBe(3)
  })

  it('8건씩 보이고 남은 만큼 더 보기를 준다', () => {
    const many = Array.from({ length: 19 }, (_, i) => item(i + 1, '2026-09-30'))
    const first = newsListView({ ...base, items: many })
    expect(first.groups[0].rows).toHaveLength(8)
    expect(first.groups[0].total).toBe(19)
    expect(first.more).toBe(8)
    expect(newsListView({ ...base, items: many, page: 3 }).more).toBe(0)
    expect(newsListView({ ...base, items: many, page: 2 }).more).toBe(3)
  })

  it('마커를 고르면 범위 대신 그 마커 뉴스만 보인다', () => {
    const selected = { id: '2026-09-28', label: '9월 28일', items: items.filter((n) => n.tradeDay === '2026-09-28') }
    const view = newsListView({ ...base, selected })
    expect(view.countText).toBe('9월 28일 1건 · 분석 1건 · 최신순')
    expect(view.open.map((n) => n.id)).toEqual(['3'])
  })

  it('비회원은 열린 기간 밖 기사를 숨기고 게이트를 둔다', () => {
    const view = newsListView({ ...base, openFrom: '2026-09-26' })
    expect(view.open.map((n) => n.id)).toEqual(['1', '2', '3'])
    expect(view.analyzedCount).toBe(2)
    expect(view.gated).toBe(true)
    const old = newsListView({ ...base, items: [item(9, '2026-09-01')], range: 'all', openFrom: '2026-09-26' })
    expect(old.open).toEqual([])
    expect(old.empty).toBeNull()
    expect(old.gated).toBe(true)
  })

  it('뉴스가 없으면 none, 조건에 맞는 게 없으면 no-match다', () => {
    expect(newsListView({ ...base, items: [] }).empty).toBe('none')
    expect(newsListView({ ...base, items: [item(1, '2026-09-30', '2026-09-30', false)], onlyAnalyzed: true }).empty).toBe('no-match')
  })
})
