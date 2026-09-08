import { describe, expect, it } from 'vitest'
import { endId } from '@/data/graphTypes'
import type {
  KgCompanyEventsRes,
  KgCompanyNode,
  KgCompanyRes,
  KgEventNode,
  KgSupplyChainRes,
  KgThemeRes,
} from '@/lib/kgApiTypes'
import {
  toCompanyEventsGraph,
  toCompanyOverviewGraph,
  toSupplyChainGraph,
  toThemeGraph,
} from '@/lib/kgMappers'

function company(id: string, ticker: string, name: string, market = 'KOSPI'): KgCompanyNode {
  return {
    id, ticker, name, market, country: 'KR', is_listed: true, company_id: 1, corp_code: null,
    krx100: false, krx300: false, kosdaq150: false,
  }
}

const EVENT: KgEventNode = {
  id: 'e1', cluster_id: 2, title: '로봇 액추에이터 수주 협의',
  keywords: ['lg전자', '액추에이터', '로봇'], companies: ['LG전자'], news_ids: [4, 5, 6],
  representative_news_id: 4, member_count: 3, original_size: 58,
  first_published_at: '2026-09-07T09:12:00+09:00', last_published_at: '2026-09-07T15:39:00+09:00',
  titled_at: null, synced_at: null,
}

const SUPPLY_REL = {
  id: 'r1', type: 'SUPPLIES_TO' as const, start: 'c1', end: 'c2',
  news_mention_count: 2, news: [{ news_id: '6', item: '액추에이터' }],
  disclosure_count: 1, disclosures: [{ rcept_no: '2026', item: '단일판매' }],
  first_mentioned_at: '2026-09-01', last_mentioned_at: '2026-09-07',
}

describe('toCompanyOverviewGraph', () => {
  const res: KgCompanyRes = {
    companies: [company('c1', '066570', 'LG전자'), company('c2', '000001', '협력사', 'KOSDAQ'), company('c3', '000002', '피인수')],
    themes: [{ id: 't1', name: '밸류업', description: '설명', source_theme_id: 648 }],
    events: [EVENT],
    relationships: [
      SUPPLY_REL,
      { ...SUPPLY_REL, id: 'r2', type: 'ACQUIRES', end: 'c3' },
      { id: 'r3', type: 'BELONGS_TO', start: 'c1', end: 't1', reason: '공시' },
      { id: 'r4', type: 'HAS_EVENT', start: 'c1', end: 'e1' },
      // 응답에 없는 노드를 가리키는 관계는 버린다
      { id: 'r5', type: 'HAS_EVENT', start: 'c1', end: 'ghost' },
    ],
  }
  const graph = toCompanyOverviewGraph(res, '066570')

  it('기업·테마·이벤트 노드를 모두 담고 중심을 티커로 찾는다', () => {
    expect(graph.nodes.map((n) => n.type)).toEqual(['company', 'company', 'company', 'theme', 'event'])
    expect(graph.metadata.centerId).toBe('c1')
    expect(graph.metadata.center).toBe('LG전자')
    expect(graph.metadata.stats).toEqual({ total_nodes: 5, total_edges: 4 })
  })

  it('관계 타입을 응답 그대로 보존한다', () => {
    expect(graph.links.map((l) => l.type)).toEqual(['SUPPLIES_TO', 'ACQUIRES', 'BELONGS_TO', 'HAS_EVENT'])
  })

  it('기업→기업 간선은 뉴스+공시 건수가 굵기, HAS_EVENT는 1', () => {
    const [supply, , , event] = graph.links
    expect(supply.mentioned_count).toBe(3)
    expect(supply.news_mention_count).toBe(2)
    expect(supply.disclosure_count).toBe(1)
    expect(event.mentioned_count).toBe(1)
    expect(event.value).toBe(1)
    expect(endId(event.target)).toBe('e1')
  })

  it('이벤트 노드는 제목이 라벨이고 클러스터 데이터를 data에 싣는다', () => {
    const event = graph.nodes.find((n) => n.type === 'event')!
    expect(event.label).toBe('로봇 액추에이터 수주 협의')
    expect(event.data).toEqual({
      clusterId: 2,
      keywords: ['lg전자', '액추에이터', '로봇'],
      companies: ['LG전자'],
      memberCount: 3,
      firstPublishedAt: '2026-09-07T09:12:00+09:00',
      lastPublishedAt: '2026-09-07T15:39:00+09:00',
      representativeNewsId: 4,
    })
  })
})

describe('알 수 없는 관계 타입', () => {
  it('개요 응답에서 미지원 타입 관계는 조용히 버려진다 (NaN 없이)', () => {
    const res: KgCompanyRes = {
      companies: [company('c1', '066570', 'LG전자'), company('c2', '000001', '협력사', 'KOSDAQ')],
      themes: [],
      events: [],
      relationships: [
        SUPPLY_REL,
        // 서버가 아직 클라이언트가 모르는 관계를 보낼 수 있다 — 매핑 전에 걸러야 한다
        { ...SUPPLY_REL, id: 'r-unknown', type: 'MERGES_WITH' as never },
      ],
    }
    const graph = toCompanyOverviewGraph(res, '066570')
    expect(graph.links).toHaveLength(1)
    expect(graph.links[0].id).toBe('r1')
    expect(graph.links.some((l) => Number.isNaN(l.value) || Number.isNaN(l.mentioned_count))).toBe(
      false,
    )
  })
})

describe('toThemeGraph', () => {
  it('테마 노드가 먼저, 기업들이 뒤따르며 BELONGS_TO 간선에 reason이 보존된다', () => {
    const res: KgThemeRes = {
      theme: { id: 't1', name: '밸류업', description: '설명', source_theme_id: 648 },
      companies: [company('c1', '066570', 'LG전자'), company('c2', '000001', '협력사', 'KOSDAQ')],
      relationships: [
        { id: 'r1', type: 'BELONGS_TO', start: 'c1', end: 't1', reason: '공시' },
        { id: 'r2', type: 'BELONGS_TO', start: 'c2', end: 't1', reason: null },
      ],
    }
    const graph = toThemeGraph(res)
    expect(graph.nodes[0].type).toBe('theme')
    expect(graph.nodes.slice(1).every((n) => n.type === 'company')).toBe(true)
    expect(graph.links.every((l) => l.type === 'BELONGS_TO')).toBe(true)
    expect(graph.links.every((l) => l.mentioned_count === 1)).toBe(true)
    expect(graph.links.map((l) => l.reason)).toEqual(['공시', null])
    expect(graph.metadata.centerId).toBe('t1')
  })
})

describe('toCompanyEventsGraph', () => {
  it('기업과 이벤트를 HAS_EVENT로 잇는다', () => {
    const res: KgCompanyEventsRes = {
      companies: [company('c1', '066570', 'LG전자'), company('c9', '000009', '공유기업')],
      events: [EVENT],
      relationships: [
        { id: 'r1', type: 'HAS_EVENT', start: 'c1', end: 'e1' },
        { id: 'r2', type: 'HAS_EVENT', start: 'c9', end: 'e1' },
      ],
    }
    const graph = toCompanyEventsGraph(res, '066570')
    expect(graph.nodes).toHaveLength(3)
    expect(graph.links.every((l) => l.type === 'HAS_EVENT')).toBe(true)
    expect(graph.metadata.centerId).toBe('c1')
  })

  it('이벤트가 없으면 중심 기업만 남고 간선은 비어 있다', () => {
    const res: KgCompanyEventsRes = { companies: [company('c1', '005930', '삼성전자')], events: [], relationships: [] }
    const graph = toCompanyEventsGraph(res, '005930')
    expect(graph.nodes).toHaveLength(1)
    expect(graph.links).toEqual([])
  })

  it('제목이 빈 문자열이면(??가 아니라 falsy로 판정) 클러스터 번호로, 클러스터도 없으면 id로 라벨을 대신한다', () => {
    const res: KgCompanyEventsRes = {
      companies: [company('c1', '005930', '삼성전자')],
      events: [
        { ...EVENT, id: 'e-empty-title', title: '', cluster_id: 7 },
        { ...EVENT, id: 'e-no-title-no-cluster', title: null, cluster_id: null },
      ],
      relationships: [],
    }
    const graph = toCompanyEventsGraph(res, '005930')
    const labelOf = (id: string) => graph.nodes.find((n) => n.id === id)!.label
    expect(labelOf('e-empty-title')).toBe('이벤트 #7')
    expect(labelOf('e-no-title-no-cluster')).toBe('e-no-title-no-cluster')
  })
})

describe('toSupplyChainGraph', () => {
  it('관계 타입을 하드코딩하지 않고 응답에서 읽는다', () => {
    const res: KgSupplyChainRes = {
      companies: [company('c1', '005930', '삼성전자'), company('c2', '000660', 'SK하이닉스')],
      relationships: [{ ...SUPPLY_REL, type: 'INVESTS_IN' }],
    }
    expect(toSupplyChainGraph(res, '005930').links[0].type).toBe('INVESTS_IN')
  })
})
