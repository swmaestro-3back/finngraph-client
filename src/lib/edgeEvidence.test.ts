import { describe, expect, it } from 'vitest'
import {
  groupNewsByDay,
  itemsLine,
  evidenceNews,
  evidencePath,
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
  it('서버 월별 건수를 첫 달부터 마지막 달까지 빈 달 0으로 채운다', () => {
    const months = monthlyCounts([{ month: '2026-04', count: 2 }, { month: '2026-06', count: 1 }])
    expect(months.map((m) => [m.key, m.count])).toEqual([
      ['2026-04', 2],
      ['2026-05', 0],
      ['2026-06', 1],
    ])
  })

  it('해를 넘겨도 이어진다', () => {
    expect(monthlyCounts([{ month: '2025-12', count: 1 }, { month: '2026-02', count: 1 }]).map((m) => m.month)).toEqual([12, 1, 2])
  })

  it('비어 있으면 빈 배열', () => {
    expect(monthlyCounts([])).toEqual([])
  })
})

describe('evidence 응답', () => {
  it('evidencePath는 elementId를 인코딩한다', () => {
    expect(evidencePath('5:abc:12')).toBe('/v1/relationships/5%3Aabc%3A12/evidence')
  })

  it('evidenceNews는 기사 한 건을 EvidenceNews로 — 품목은 쉼표로 잇고 없으면 null', () => {
    const news = evidenceNews({
      news: [
        { news_id: '11', title: 'B', url: 'u', original_url: null, published_at: '2026-09-02T09:00:00+09:00', items: ['HBM', '패키징'] },
        { news_id: '10', title: null, url: null, original_url: null, published_at: null, items: [] },
      ],
      news_total: 2, monthly: [], disclosures: [],
    })
    expect(news).toEqual([
      { id: '11', title: 'B', publishedAt: '2026-09-02T09:00:00+09:00', item: 'HBM, 패키징' },
      { id: '10', title: '(제목 없음)', publishedAt: null, item: null },
    ])
  })
})
