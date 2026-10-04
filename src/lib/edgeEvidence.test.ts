import { describe, expect, it } from 'vitest'
import {
  groupNewsByDay,
  itemsLine,
  latestMentions,
  monthlyCounts,
  rankItems,
  type EvidenceNews,
} from '@/lib/edgeEvidence'

const mention = (item: string | null) => ({ news_id: '1', item })

describe('rankItems', () => {
  it('같은 품목은 한 줄로 합치고 횟수가 많은 순으로 정렬한다', () => {
    const rows = rankItems({
      news: [mention('B'), mention('C'), mention('A'), mention('B'), mention('A'), mention('A')],
    })
    expect(rows.map((r) => [r.text, r.count])).toEqual([
      ['A', 3],
      ['B', 2],
      ['C', 1],
    ])
  })

  it('공백만 다른 문구는 같은 품목이고 먼저 온 표기를 쓴다', () => {
    const rows = rankItems({ news: [mention('TC본더'), mention('TC 본더'), mention(' TC본더 ')] })
    expect(rows).toEqual([{ text: 'TC본더', count: 3, generic: false }])
  })

  it('뭉뚱그린 품목은 횟수가 많아도 구체적인 품목 아래로 간다', () => {
    const rows = rankItems({ news: [mention('장비'), mention('장비'), mention('HBM용 TC본더')] })
    expect(rows.map((r) => [r.text, r.generic])).toEqual([
      ['HBM용 TC본더', false],
      ['장비', true],
    ])
  })

  it('품목이 없는 언급은 세지 않는다', () => {
    expect(rankItems({ news: [mention(null), mention('  ')] })).toEqual([])
    expect(rankItems({})).toEqual([])
  })
})

describe('itemsLine', () => {
  it('구체적인 품목을 많이 언급된 순으로 잇고 넘치면 외 N', () => {
    const news = [mention('장비'), mention('B'), mention('A'), mention('A'), mention('C')]
    expect(itemsLine({ news })).toBe('A, B 외 1')
    expect(itemsLine({ news }, 3)).toBe('A, B, C')
  })

  it('구체적인 품목이 없으면 뭉뚱그린 품목이라도 보이고, 품목이 없으면 undefined', () => {
    expect(itemsLine({ news: [mention('장비')] })).toBe('장비')
    expect(itemsLine({ news: [mention(null)] })).toBeUndefined()
  })
})

describe('latestMentions', () => {
  const news = [
    { news_id: '1', item: 'A' },
    { news_id: '2', item: 'B' },
    { news_id: '2', item: 'C' },
    { news_id: '3', item: null },
  ]

  it('같은 기사는 한 행으로 합치고 품목을 잇는다', () => {
    expect(latestMentions({ news }, 10)).toEqual([
      { id: '1', item: 'A' },
      { id: '2', item: 'B, C' },
      { id: '3', item: null },
    ])
  })

  it('상한을 넘으면 뒤쪽(최신)만 남긴다', () => {
    expect(latestMentions({ news }, 2).map((m) => m.id)).toEqual(['2', '3'])
  })
})

const article = (id: string, publishedAt: string | null): EvidenceNews => ({
  id,
  title: id,
  publishedAt,
  item: null,
})

describe('groupNewsByDay', () => {
  it('최신순으로 세우고 같은 날 기사끼리 묶는다', () => {
    const days = groupNewsByDay([
      article('a', '2026-06-08T09:00:00+09:00'),
      article('b', '2026-08-24T10:00:00+09:00'),
      article('c', '2026-06-08T15:00:00+09:00'),
    ])
    expect(days.map((d) => [d.date, d.news.map((n) => n.id)])).toEqual([
      ['2026-08-24', ['b']],
      ['2026-06-08', ['c', 'a']],
    ])
  })

  it('발행 시각을 모르는 기사는 맨 뒤 한 묶음이다', () => {
    const days = groupNewsByDay([article('x', null), article('a', '2026-06-08T09:00:00+09:00')])
    expect(days.map((d) => d.date)).toEqual(['2026-06-08', null])
    expect(days[1].news.map((n) => n.id)).toEqual(['x'])
  })
})

describe('monthlyCounts', () => {
  it('첫 달부터 마지막 달까지 빈 달을 0으로 채운다', () => {
    const months = monthlyCounts(['2026-04-09', '2026-04-14', '2026-06-08', null])
    expect(months.map((m) => [m.key, m.count])).toEqual([
      ['2026-04', 2],
      ['2026-05', 0],
      ['2026-06', 1],
    ])
  })

  it('해를 넘겨도 이어진다', () => {
    expect(monthlyCounts(['2025-12-30', '2026-02-01']).map((m) => m.month)).toEqual([12, 1, 2])
  })

  it('날짜가 하나도 없으면 빈 배열', () => {
    expect(monthlyCounts([null])).toEqual([])
  })
})
