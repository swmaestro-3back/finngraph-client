import { describe, expect, it } from 'vitest'
import { buildEvidenceRows } from '@/lib/edgeEvidence'

const news = (item: string | null) => ({ news_id: '1', item })

describe('buildEvidenceRows', () => {
  it('같은 품목은 한 행으로 접고 횟수가 많은 순으로 정렬한다', () => {
    const rows = buildEvidenceRows({
      news: [news('B'), news('C'), news('A'), news('B'), news('A'), news('A'), news('A')],
    })
    expect(rows.map((r) => [r.text, r.count])).toEqual([
      ['A', 4],
      ['B', 2],
      ['C', 1],
    ])
  })

  it('횟수가 같으면 뉴스 먼저, 공시 나중의 원래 순서를 지킨다', () => {
    const rows = buildEvidenceRows({
      news: [news('부품'), news('장비')],
      disclosures: [
        { rcept_no: '2026-1', item: '단일판매' },
        { rcept_no: '2026-2', item: '단일판매' },
      ],
    })
    expect(rows.map((r) => `${r.kind}:${r.text}×${r.count}`)).toEqual([
      'disclosure:단일판매×2',
      'news:부품×1',
      'news:장비×1',
    ])
    expect(rows[0].ids).toEqual(['2026-1', '2026-2'])
  })

  it('품목이 비어 있으면 대체 문구로 묶고 뉴스 id는 유지한다', () => {
    const rows = buildEvidenceRows({ news: [news(null), news(null)] })
    expect(rows).toEqual([{ kind: 'news', text: '품목 정보 없음', count: 2, ids: ['1', '1'] }])
  })
})
