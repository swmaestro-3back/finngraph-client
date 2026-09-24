import { describe, expect, it } from 'vitest'
import type { GraphLink } from '@/data/graphTypes'
import { buildLinkCard, formatPeriod, summarizeItems } from '@/lib/linkCard'

const labelOf = (id: string) => ({ a: '더코디', b: '삼성전자', c: '레인보우로보틱스' })[id] ?? id

function link(over: Partial<GraphLink> = {}): GraphLink {
  return { id: 'r', source: 'a', target: 'b', type: 'SUPPLIES_TO', mentioned_count: 1, value: 1, ...over }
}

describe('summarizeItems', () => {
  it('공백 차이만 나는 중복을 합치고 빈 값은 버린다', () => {
    expect(summarizeItems(['테스트 핸들러', '테스트핸들러', null, ' ', '반도체 검사 장비'])).toBe(
      '테스트 핸들러, 반도체 검사 장비',
    )
  })
  it('한쪽이 다른 쪽을 품는 문구는 먼저 온 것만 남긴다', () => {
    expect(summarizeItems(['반도체 검사 장비', '테스트 핸들러', '반도체 테스트 핸들러'])).toBe(
      '반도체 검사 장비, 테스트 핸들러',
    )
  })
  it('3개를 넘으면 "외 N"', () => {
    expect(summarizeItems(['a', 'b', 'c', 'd', 'e'])).toBe('a, b, c 외 2')
  })
  it('전부 비어 있으면 undefined', () => {
    expect(summarizeItems([null, undefined, ''])).toBeUndefined()
  })
})

describe('formatPeriod', () => {
  it('같은 달·같은 해·다른 해를 각각 줄인다', () => {
    expect(formatPeriod('2026-09-09', '2026-09-09')).toBe('2026.09')
    expect(formatPeriod('2026-04-14', '2026-08-03T10:00:00')).toBe('2026.04 – 08')
    expect(formatPeriod('2025-11-01', '2026-02-01')).toBe('2025.11 – 2026.02')
    expect(formatPeriod(null, null)).toBeUndefined()
    expect(formatPeriod('2026-05-01', null)).toBe('2026.05')
  })
})

describe('buildLinkCard', () => {
  it('기사에서 온 공급 관계 — 세 줄', () => {
    const card = buildLinkCard(
      link({
        news_mention_count: 1,
        news: [{ news_id: '583', item: '반도체 전공정용 세정장비' }],
        first_mentioned_at: '2026-09-09',
        last_mentioned_at: '2026-09-09',
      }),
      labelOf,
      '이 기사에서 추출',
    )
    expect(card).toEqual({
      from: '더코디',
      relation: '공급',
      to: '삼성전자',
      items: '반도체 전공정용 세정장비',
      evidence: '이 기사에서 추출 · 뉴스 1건 · 2026.09',
    })
  })

  it('품목 없는 인수 관계 — 품목 줄 없이 두 줄, 0건 근거는 생략', () => {
    const card = buildLinkCard(
      link({
        source: 'b',
        target: 'c',
        type: 'ACQUIRES',
        news_mention_count: 4,
        news: [{ news_id: '1', item: null }],
        disclosure_count: 0,
        first_mentioned_at: '2026-05-08',
        last_mentioned_at: '2026-07-22',
      }),
      labelOf,
    )
    expect([card.from, card.relation, card.to]).toEqual(['삼성전자', '인수', '레인보우로보틱스'])
    expect(card.items).toBeUndefined()
    expect(card.evidence).toBe('뉴스 4건 · 2026.05 – 07')
  })

  it('테마 소속 — 편입 사유가 근거 줄에 온다', () => {
    const card = buildLinkCard(link({ type: 'BELONGS_TO', target: 'c', reason: '로봇 부품 공급' }), labelOf)
    expect(card.relation).toBe('테마 소속')
    expect(card.evidence).toBe('로봇 부품 공급')
  })
})
