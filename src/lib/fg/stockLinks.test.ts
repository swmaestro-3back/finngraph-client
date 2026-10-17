import { describe, expect, it } from 'vitest'
import {
  evidenceCountLabel,
  gateScope,
  linkCaption,
  linkChips,
  linkCounts,
  linkMapGroups,
  linkPath,
  linkSummary,
  mapHeads,
  nodeAria,
  nodeTag,
  sortLinks,
  filterLinks,
  watchLabel,
  type LinkedCompany,
} from '@/lib/fg/stockLinks'

function company(patch: Partial<LinkedCompany> & Pick<LinkedCompany, 'id' | 'name' | 'type'>): LinkedCompany {
  return {
    code: null,
    market: 'KOSDAQ',
    price: 10000,
    change: 0,
    gapFromHigh: -10,
    position: 0.5,
    relation: `${patch.name} 관계`,
    tag: '태그',
    title: `${patch.name} 제목`,
    hops: [{ edge: patch.type, node: patch.name }],
    strength: 1,
    confirmed: false,
    evidence: [{ kind: 'news', quote: '인용', source: '예시경제', date: '10.01', url: null }],
    ...patch,
  }
}

const list: LinkedCompany[] = [
  company({ id: 'nuri', name: '누리소재', type: 'supply', change: 0.94, strength: 3, confirmed: true, tag: '감광액 공급' }),
  company({ id: 'neulbom', name: '늘봄화학', type: 'supply', change: -0.65, strength: 2 }),
  company({
    id: 'saegyeol',
    name: '새결소재',
    type: 'supply',
    change: 0.12,
    hops: [
      { edge: 'supply', node: '누리소재' },
      { edge: 'supply', node: '새결소재' },
    ],
  }),
  company({ id: 'garam', name: '가람전자', type: 'customer', change: 0.39, strength: 2, confirmed: true }),
  company({ id: 'ieum', name: '이음정밀', type: 'invest', change: 1.27, strength: 2, confirmed: true }),
  company({ id: 'dasol', name: '다솔머티리얼', type: 'theme', change: 3.88 }),
]

describe('linkCounts·linkSummary', () => {
  const counts = linkCounts(list)

  it('유형별·공시 확인·2단계 수를 센다', () => {
    expect(counts).toEqual({
      total: 6,
      byType: { supply: 3, customer: 1, invest: 1, theme: 1 },
      confirmed: 3,
      second: 1,
      via: '공급사',
    })
  })

  it('요약 문장은 수만 쓴다', () => {
    expect(linkSummary('삼성전자', counts)).toEqual({
      lead: '삼성전자와 관계로 이어진 기업 6곳',
      rest: '이에요. 공급 3 · 고객 1 · 투자 1 · 같은 테마 1곳이고, 3곳은 공시로 관계가 확인됐어요. 1곳은 공급사를 한 번 더 거쳐 2단계로 이어져요.',
    })
  })

  it('없는 유형과 문장은 뺀다', () => {
    const one = linkCounts([list[1]])
    expect(linkSummary('에코프로비엠', one)).toEqual({
      lead: '에코프로비엠과 관계로 이어진 기업 1곳',
      rest: '이에요. 공급 1곳이에요.',
    })
  })

  it('비회원 잠금 범위', () => {
    expect(gateScope(counts)).toBe('공급 3 · 고객 1 · 투자 1 · 같은 테마 1 · 관계 경로와 원문 근거까지 볼 수 있어요')
  })
})

describe('linkMapGroups·mapHeads', () => {
  it('1단계는 유형별로, 2단계 이상은 따로 묶는다', () => {
    const groups = linkMapGroups(list)
    expect(groups.supply.map((c) => c.id)).toEqual(['nuri', 'neulbom'])
    expect(groups.customer.map((c) => c.id)).toEqual(['garam'])
    expect(groups.invest.map((c) => c.id)).toEqual(['ieum'])
    expect(groups.theme.map((c) => c.id)).toEqual(['dasol'])
    expect(groups.second.map((c) => c.id)).toEqual(['saegyeol'])
    expect(groups.via).toBe('누리소재')
  })

  it('열 머리는 방향과 수를 쓴다', () => {
    expect(mapHeads('삼성전자', linkMapGroups(list))).toEqual({
      supply: '삼성전자에 공급해요 · 2곳',
      customer: '삼성전자에서 사 가요 · 1곳',
      invest: '삼성전자가 투자했어요 · 1곳',
      theme: '같은 테마로 묶여요 · 1곳',
      second: '누리소재를 거쳐 이어져요 · 2단계 1곳',
    })
    expect(mapHeads('에코프로비엠', linkMapGroups(list)).invest).toBe('에코프로비엠이 투자했어요 · 1곳')
  })

  it('경유 기업이 여럿이면 이름을 빼고 쓴다', () => {
    const mixed = [...list, company({ id: 'x', name: '엑스', type: 'customer', hops: [{ edge: 'customer', node: '가람전자' }, { edge: 'customer', node: '엑스' }] })]
    const groups = linkMapGroups(mixed)
    expect(groups.via).toBeNull()
    expect(mapHeads('삼성전자', groups).second).toBe('한 번 더 거쳐 이어져요 · 2단계 2곳')
  })
})

describe('목록', () => {
  it('유형으로 거르고 근거 강도, 같으면 등락률 순으로 늘어놓는다', () => {
    expect(sortLinks(filterLinks(list, 'all'), 'strength').map((c) => c.id)).toEqual([
      'nuri',
      'ieum',
      'garam',
      'neulbom',
      'dasol',
      'saegyeol',
    ])
    expect(sortLinks(filterLinks(list, 'supply'), 'change').map((c) => c.id)).toEqual(['nuri', 'saegyeol', 'neulbom'])
  })

  it('칩은 전체와 있는 유형만, 개수와 함께', () => {
    expect(linkChips(list)).toEqual([
      { value: 'all', label: '전체', count: 6 },
      { value: 'supply', label: '공급', count: 3 },
      { value: 'customer', label: '고객', count: 1 },
      { value: 'invest', label: '투자', count: 1 },
      { value: 'theme', label: '같은 테마', count: 1 },
    ])
    expect(linkChips([list[0]]).map((chip) => chip.value)).toEqual(['all', 'supply'])
  })

  it('캡션', () => {
    expect(linkCaption('all', 6, 'strength')).toBe('전체 6곳 · 근거 강도 순')
    expect(linkCaption('supply', 3, 'change')).toBe('공급 관계 3곳 · 오늘 등락률 순')
  })

  it('경로 문구는 단계와 공시 확인을 붙인다', () => {
    expect(linkPath('삼성전자', list[0])).toBe('삼성전자 → 공급 → 누리소재 · 1단계 · 공시 확인')
    expect(linkPath('삼성전자', list[2])).toBe('삼성전자 → 공급 → 누리소재 → 공급 → 새결소재 · 2단계')
  })

  it('지도 노드 태그와 읽기 문구', () => {
    expect(nodeTag(list[0])).toBe('감광액 공급 · 공시 확인')
    expect(nodeTag(list[1])).toBe('태그')
    expect(nodeAria(list[1])).toBe('늘봄화학, 늘봄화학 관계, 오늘 −0.65%, 근거 보기')
  })

  it('근거 수와 관심 버튼 이름', () => {
    expect(evidenceCountLabel(list[0])).toBe('근거 1건 · 공시로 확인')
    expect(evidenceCountLabel(list[1])).toBe('근거 1건')
    expect(watchLabel('누리소재', false)).toBe('누리소재 관심 종목에 추가')
    expect(watchLabel('누리소재', true)).toBe('누리소재 관심 종목에서 빼기')
  })
})
