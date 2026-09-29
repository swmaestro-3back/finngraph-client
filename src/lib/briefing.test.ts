import { describe, expect, it } from 'vitest'
import { endId } from '@/data/graphTypes'
import type {
  AnalyzedNewsRes,
  BriefingLockedRes,
  BriefingThemeRes,
  CitationRes,
  RelationGraphRes,
  RelationLineRes,
  RiskRes,
  StockRowRes,
} from '@/lib/apiTypes'
import {
  adjacentDates,
  citationLabel,
  edgeIdOf,
  groupRisks,
  lockedTeaser,
  pickMovers,
  relationDigestCaption,
  relationLineLabel,
  themeRadarSplit,
  toRelationGraphData,
} from '@/lib/briefing'

const NEWS: CitationRes = { type: 'NEWS', id: '9001', label: '기사 제목', url: 'https://n/9001' }
const DISCLOSURE: CitationRes = { type: 'DISCLOSURE', id: 'R1', label: '공급계약', url: 'https://d/R1' }

function theme(id: number, hotSide: 'UP' | 'DOWN'): BriefingThemeRes {
  return {
    id, name: `테마${id}`, change: 1, hotSide, stockCount: 5, pricedCount: 5, upCount: 4, downCount: 1, flatCount: 0, leaders: [],
  }
}

function line(overrides: Partial<RelationLineRes> = {}): RelationLineRes {
  return {
    id: 77,
    subject: { name: 'A사', ticker: '000001' },
    relation: 'SUPPLIES_TO',
    object: { name: 'B사', ticker: '000002' },
    item: '배터리',
    polarity: 'affirmed',
    tense: 'past_or_present_fact',
    subjectImpact: null,
    objectImpact: null,
    sourceSentence: null,
    source: NEWS,
    ...overrides,
  }
}

describe('adjacentDates', () => {
  const dates = ['2026-08-22', '2026-08-21', '2026-08-20']

  it('최신순 목록에서 이전·다음 날짜를 찾는다', () => {
    expect(adjacentDates(dates, '2026-08-21')).toEqual({ prev: '2026-08-20', next: '2026-08-22' })
  })

  it('양 끝에서는 없는 쪽이 null이다', () => {
    expect(adjacentDates(dates, '2026-08-22')).toEqual({ prev: '2026-08-21', next: null })
    expect(adjacentDates(dates, '2026-08-20')).toEqual({ prev: null, next: '2026-08-21' })
  })

  it('목록에 없는 날짜는 둘 다 null이다', () => {
    expect(adjacentDates(dates, '2026-01-01')).toEqual({ prev: null, next: null })
  })
})

describe('lockedTeaser', () => {
  it('0이 아닌 항목만 이어 붙인다', () => {
    const locked: BriefingLockedRes = { commentaries: 3, watchPoints: 0, risks: 4, relations: 5, graphEdges: 2 }
    expect(lockedTeaser(locked)).toBe('해설 3건 · 리스크 4건 · 관계 5건은 로그인 후 볼 수 있습니다')
  })

  it('전부 0이면 빈 문자열이다', () => {
    expect(lockedTeaser({ commentaries: 0, watchPoints: 0, risks: 0, relations: 0, graphEdges: 0 })).toBe('')
  })
})

describe('themeRadarSplit', () => {
  it('상승과 하락을 순서를 지켜 나눈다', () => {
    const split = themeRadarSplit([theme(1, 'UP'), theme(2, 'DOWN'), theme(3, 'UP')])
    expect(split.up.map((t) => t.id)).toEqual([1, 3])
    expect(split.down.map((t) => t.id)).toEqual([2])
  })
})

describe('groupRisks', () => {
  it('kind 순서로 묶고 한국어 라벨을 붙인다', () => {
    const risks: RiskRes[] = [
      { kind: 'CORRECTION', ticker: '1', name: '정정사', market: 'KOSPI', detail: '금액 변경', source: DISCLOSURE },
      { kind: 'ADMINISTRATION_NEW', ticker: '2', name: '관리사', market: 'KOSDAQ', detail: '관리종목 지정', source: null },
      { kind: 'CORRECTION', ticker: '3', name: '정정사2', market: null, detail: '기간 변경', source: DISCLOSURE },
    ]
    const groups = groupRisks(risks)
    expect(groups.map((g) => g.kind)).toEqual(['ADMINISTRATION_NEW', 'CORRECTION'])
    expect(groups[0].label).toBe('관리종목 신규 지정')
    expect(groups[1].items).toHaveLength(2)
  })
})

describe('relationLineLabel', () => {
  it('서술어를 한국어로 바꾸고 시제·극성 배지를 붙인다', () => {
    expect(relationLineLabel(line())).toEqual({ predicate: '공급', badges: [] })
    expect(relationLineLabel(line({ tense: 'future_or_planned', polarity: 'denied', relation: 'ACQUIRES' }))).toEqual({
      predicate: '인수',
      badges: ['계획', '부인'],
    })
    expect(relationLineLabel(line({ tense: 'modal_possibility', polarity: 'terminated', relation: 'INVESTS_IN' }))).toEqual({
      predicate: '투자',
      badges: ['가능성', '종료'],
    })
  })
})

describe('edgeIdOf', () => {
  it('그래프 간선 id 규칙과 같은 문자열을 만든다', () => {
    expect(edgeIdOf(line())).toBe('T:000001|SUPPLIES_TO|T:000002')
    expect(edgeIdOf(line({ object: { name: 'C사', ticker: null } }))).toBe('T:000001|SUPPLIES_TO|N:C사')
  })
})

describe('citationLabel', () => {
  it('출처 종류를 앞에 붙인다', () => {
    expect(citationLabel(NEWS)).toBe('뉴스 · 기사 제목')
    expect(citationLabel(DISCLOSURE)).toBe('공시 · 공급계약')
    expect(citationLabel({ type: 'RELATION', id: '7', label: 'A → B', url: null })).toBe('관계 · A → B')
    expect(citationLabel({ type: 'CLUSTER', id: '5', label: '이슈', url: null })).toBe('이슈 · 이슈')
  })
})

describe('relationDigestCaption', () => {
  const analyzed: AnalyzedNewsRes[] = [
    { newsId: 1, title: 't', url: null, publishedAt: null, summary: null, companies: [], relationCount: 2, relations: null },
  ]

  it('회원이면 그래프 수치로, 비회원이면 잠금 개수로 캡션을 만든다', () => {
    const graph: RelationGraphRes = { nodes: [{ id: 'T:1', name: 'A', ticker: '1', market: 'KOSPI', change: null }], edges: [] }
    expect(relationDigestCaption(analyzed, graph, null)).toBe('관계가 추출된 기사 1건 · 관계 0건 · 기업 1곳')
    expect(
      relationDigestCaption(analyzed, null, { commentaries: 0, watchPoints: 0, risks: 0, relations: 2, graphEdges: 3 }),
    ).toBe('관계가 추출된 기사 1건 · 관계 3건')
  })
})

describe('toRelationGraphData', () => {
  const graph: RelationGraphRes = {
    nodes: [
      { id: 'T:000001', name: 'A사', ticker: '000001', market: 'KOSPI', change: 2.5 },
      { id: 'N:C사', name: 'C사', ticker: null, market: null, change: null },
    ],
    edges: [
      {
        id: 'T:000001|SUPPLIES_TO|N:C사',
        source: 'T:000001',
        target: 'N:C사',
        relation: 'SUPPLIES_TO',
        item: '배터리',
        polarity: 'terminated',
        tense: 'modal_possibility',
        mentionedCount: 2,
        sources: [NEWS, DISCLOSURE],
      },
    ],
  }

  it('노드·간선을 GraphData 계약으로 옮긴다', () => {
    const data = toRelationGraphData(graph)
    expect(data.nodes.map((n) => n.id)).toEqual(['T:000001', 'N:C사'])
    expect(data.nodes[0]).toMatchObject({ label: 'A사', type: 'company', data: { ticker: '000001', market: 'KOSPI', country: 'KR' } })
    expect(data.nodes[1].data.country).toBeUndefined()
    const link = data.links[0]
    expect(endId(link.source)).toBe('T:000001')
    expect(link.type).toBe('SUPPLIES_TO')
    expect(link.item).toEqual({ text: '배터리', type: 'company' })
    expect(link.mentioned_count).toBe(2)
    expect(link.value).toBe(2)
    expect(link.is_negated).toBe(true)
    expect(link.tense).toBe('future_or_planned')
    expect(link.news).toEqual([{ news_id: '9001', item: '배터리' }])
    expect(link.disclosures).toEqual([{ rcept_no: 'R1', item: '배터리' }])
    expect(link.news_mention_count).toBe(1)
    expect(link.disclosure_count).toBe(1)
    expect(data.metadata.stats).toEqual({ total_nodes: 2, total_edges: 1 })
  })

  it('알 수 없는 서술어 간선은 버린다', () => {
    const data = toRelationGraphData({ ...graph, edges: [{ ...graph.edges[0], relation: 'SANCTIONS' }] })
    expect(data.links).toEqual([])
  })
})

describe('pickMovers', () => {
  it('등락 절대값 순으로 뽑고 null은 제외한다', () => {
    const rows = [
      { ticker: '1', change: 1 },
      { ticker: '2', change: -5 },
      { ticker: '3', change: null },
    ] as StockRowRes[]
    expect(pickMovers(rows, 2).map((s) => s.ticker)).toEqual(['2', '1'])
  })
})
