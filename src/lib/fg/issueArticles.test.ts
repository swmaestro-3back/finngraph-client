import { describe, expect, it } from 'vitest'
import { articleRows, articlesSubtitle, mediaTally, sortArticles } from '@/lib/fg/issueArticles'
import type { IssueArticleItem } from '@/lib/fg/issueRecords'

function item(id: string, press: string, day: string | null, time: string | null, over: Partial<IssueArticleItem> = {}): IssueArticleItem {
  return {
    id,
    title: `기사 ${id}`,
    url: `https://news.test/${id}`,
    press,
    pressKey: press,
    day,
    time,
    summary: null,
    analyzed: false,
    ...over,
  }
}

const DAY = '2026-10-02'

const ROWS: IssueArticleItem[] = [
  item('a', '예시데일리', DAY, '08:12'),
  item('b', '예시IT뉴스', DAY, '08:24'),
  item('c', '예시경제', DAY, '08:55'),
  item('d', '예시데일리', DAY, '09:40'),
  item('e', '예시IT뉴스', DAY, '09:53'),
  item('f', '예시마켓', DAY, '10:52'),
  item('g', '예시경제', DAY, '15:30'),
  item('h', '예시데일리', DAY, '12:48'),
  item('i', '예시IT뉴스', DAY, '13:47'),
  item('j', '예시라디오', DAY, '12:35'),
]

describe('sortArticles', () => {
  it('최신순은 보도 시각 내림차순, 시각 없는 기사는 맨 뒤예요', () => {
    const rows = [...ROWS, item('z', '예시경제', null, null)]
    expect(sortArticles(rows, 'time').map((a) => a.id)).toEqual(['g', 'i', 'h', 'j', 'f', 'e', 'd', 'c', 'b', 'a', 'z'])
  })

  it('매체 이름순은 한글 이름 다음 라틴 문자, 같은 매체는 최신순이에요', () => {
    expect(sortArticles(ROWS, 'media').map((a) => a.id)).toEqual(['g', 'c', 'h', 'd', 'a', 'j', 'f', 'i', 'e', 'b'])
  })

  it('여러 날이면 날짜도 비교해요', () => {
    const rows = [item('x', 'A', '2026-09-16', '15:00'), item('y', 'A', '2026-09-18', '09:00')]
    expect(sortArticles(rows, 'time').map((a) => a.id)).toEqual(['y', 'x'])
  })
})

describe('articleRows', () => {
  it('하루 안이면 시각만, 여러 날이면 날짜를 함께 줘요', () => {
    expect(articleRows(ROWS.slice(0, 2), 'time').map((r) => [r.item.id, r.date, r.time])).toEqual([
      ['b', null, '08:24'],
      ['a', null, '08:12'],
    ])
    const multi = [item('x', 'A', '2026-09-16', '15:00'), item('y', 'A', '2026-09-18', '09:00'), item('z', 'A', null, null)]
    expect(articleRows(multi, 'time').map((r) => [r.item.id, r.date, r.time])).toEqual([
      ['y', '09.18', '09:00'],
      ['x', '09.16', '15:00'],
      ['z', null, '—'],
    ])
  })
})

describe('articlesSubtitle', () => {
  it('매체 수와 보도 범위, 누르면 어디로 가는지 알려요', () => {
    expect(articlesSubtitle(ROWS, 23, DAY)).toBe('23개 매체가 오늘 08:12부터 15:30까지 썼어요. 제목을 누르면 매체 원문으로 가요.')
    const analyzed = ROWS.map((a) => ({ ...a, analyzed: true }))
    expect(articlesSubtitle(analyzed, 5, '2026-10-05')).toBe(
      '5개 매체가 10월 2일 08:12부터 15:30까지 썼어요. 제목을 누르면 기사 분석을, 원문 아이콘을 누르면 매체 원문을 봐요.',
    )
  })

  it('여러 날이면 날짜를, 한 시각이면 그 시각만 써요', () => {
    const multi = [item('x', 'A', '2026-09-16', '09:16'), item('y', 'B', '2026-09-18', '09:48')]
    expect(articlesSubtitle(multi, 2, '2026-10-05')).toBe('2개 매체가 9월 16일 09:16부터 9월 18일 09:48까지 썼어요. 제목을 누르면 매체 원문으로 가요.')
    expect(articlesSubtitle([item('x', 'A', '2026-09-30', '09:32')], 1, '2026-10-05')).toBe(
      '1개 매체가 9월 30일 09:32에 썼어요. 제목을 누르면 매체 원문으로 가요.',
    )
    expect(articlesSubtitle([item('x', 'A', null, null)], 1, '2026-10-05')).toBe('1개 매체가 썼어요. 제목을 누르면 매체 원문으로 가요.')
  })
})

describe('mediaTally', () => {
  it('기사 수가 많은 순, 같으면 이름순으로 상위 매체와 막대 비율을 줘요', () => {
    const tally = mediaTally(ROWS, DAY)
    expect(tally.total).toBe(5)
    expect(tally.rows.map((r) => [r.name, r.count, r.pct])).toEqual([
      ['예시데일리', 3, 100],
      ['예시IT뉴스', 3, 100],
      ['예시경제', 2, 67],
      ['예시라디오', 1, 33],
      ['예시마켓', 1, 33],
    ])
    expect(tally.caption).toBe('기사 수가 많은 순 · 가장 먼저 보도한 곳은 예시데일리(08:12)')
    expect(tally.rest).toBeNull()
  })

  it('상위 8곳 밖은 문장으로 묶어요', () => {
    const ones = Array.from({ length: 12 }, (_, i) => item(`o${i}`, `매체${String(i).padStart(2, '0')}`, DAY, `09:${String(10 + i)}`))
    expect(mediaTally(ones, DAY).rest).toBe('나머지 4곳은 1건씩 썼어요')
    const mixed = [...ones, item('x', '매체11', DAY, '10:00')]
    expect(mediaTally(mixed, DAY).rows[0].name).toBe('매체11')
    expect(mediaTally(mixed, DAY).rest).toBe('나머지 4곳은 1건씩 썼어요')
    const heavy = [...ones, item('y', '매체10', DAY, '10:01'), item('w', '매체09', DAY, '10:02'), item('v', '매체09', DAY, '10:03')]
    expect(mediaTally(heavy, DAY).rows.slice(0, 2).map((r) => r.name)).toEqual(['매체09', '매체10'])
    const twice = [...ones, ...ones.map((a) => ({ ...a, id: `${a.id}b` }))]
    expect(mediaTally(twice, DAY).rest).toBe('나머지 4곳이 기사 8건을 썼어요')
  })

  it('매체가 없는 기사는 세지 않고, 여러 날이면 첫 보도에 날짜를 붙여요', () => {
    const rows = [
      item('x', '출처 미상', '2026-09-16', '08:00', { pressKey: null }),
      item('y', '가상일보', '2026-09-16', '09:16', { pressKey: 'press-a.test' }),
      item('z', '가상일보', '2026-09-18', '09:48', { pressKey: 'press-a.test' }),
    ]
    const tally = mediaTally(rows, '2026-10-05')
    expect(tally.total).toBe(1)
    expect(tally.rows).toEqual([{ key: 'press-a.test', name: '가상일보', count: 2, pct: 100 }])
    expect(tally.caption).toBe('기사 수가 많은 순 · 가장 먼저 보도한 곳은 가상일보(9월 16일 09:16)')
  })
})
