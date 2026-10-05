import { describe, expect, it } from 'vitest'
import {
  clipLabel,
  graphSentence,
  issueFlow,
  issueGraph,
  issueHead,
  issueRail,
  issueTabPath,
  issueTabSearch,
  parseIssueTab,
  rankLinks,
  summaryCaption,
} from '@/lib/fg/issuePage'
import type { IssueBook, IssueLink, IssueRecord, IssueStock } from '@/lib/fg/issueRecords'
import type { LinkedCompany } from '@/lib/fg/stockLinks'

function company(name: string, over: Partial<LinkedCompany> = {}): LinkedCompany {
  return {
    id: name,
    code: null,
    name,
    market: 'KOSDAQ',
    price: 1000,
    change: 1,
    gapFromHigh: -10,
    position: 0.5,
    type: 'supply',
    relation: `${name} 관계`,
    tag: '공급',
    title: `${name} 제목`,
    hops: [{ edge: 'supply', node: name }],
    strength: 2,
    confirmed: false,
    evidence: [],
    ...over,
  }
}

function link(from: string, name: string, over: Partial<LinkedCompany> = {}): IssueLink {
  return { from, company: company(name, over) }
}

function stock(name: string, change = 1): IssueStock {
  return { name, ticker: null, change }
}

function record(id: string, over: Partial<IssueRecord> = {}): IssueRecord {
  return {
    id,
    date: '2026-10-02',
    updated: '15:18',
    title: `이슈 ${id}`,
    shortTitle: `짧은 ${id}`,
    flowTitle: `흐름 ${id}`,
    media: 10,
    articles: 12,
    theme: '반도체',
    summary: '요약',
    detail: '상세',
    points: [],
    stocks: [],
    links: [],
    chain: [id],
    articleList: [],
    ...over,
  }
}

const EXPORT_CHAIN = ['e1', 'e2', 'e3', 'e4']

function exportBook(): IssueBook {
  return {
    today: '2026-10-02',
    snapshot: '15:30',
    aliases: {},
    records: [
      record('e1', { date: '2026-09-12', title: '장비 수출 규제 검토 보도', media: 8, chain: EXPORT_CHAIN }),
      record('e2', { date: '2026-09-24', title: '반도체 업계 대응 회의', media: 12, chain: EXPORT_CHAIN }),
      record('e3', { date: '2026-10-01', title: '수출 규제 시행 일정 공개', media: 17, updated: '15:12', chain: EXPORT_CHAIN }),
      record('e4', {
        title: '반도체 장비 수출 규제, 국내 소재 공급망 재편',
        shortTitle: '국내 소재 공급망 재편',
        media: 23,
        articles: 31,
        chain: EXPORT_CHAIN,
      }),
      record('solo', { media: 5 }),
    ],
  }
}

function byId(book: IssueBook, id: string): IssueRecord {
  const found = book.records.find((r) => r.id === id)
  if (!found) throw new Error(id)
  return found
}

describe('이슈 탭 쿼리', () => {
  it('tab 쿼리를 읽고 모르는 값은 요약이에요', () => {
    expect(parseIssueTab('')).toBe('summary')
    expect(parseIssueTab('?tab=timeline')).toBe('timeline')
    expect(parseIssueTab('?tab=articles')).toBe('articles')
    expect(parseIssueTab('?tab=stocks&from=a')).toBe('stocks')
    expect(parseIssueTab('?tab=links')).toBe('summary')
  })

  it('요약은 tab을 지우고 다른 탭은 넣어요. 연결된 종목 밖에서는 from·type을 지워요', () => {
    expect(issueTabSearch('?tab=timeline', 'summary')).toBe('')
    expect(issueTabSearch('?gaps=on', 'articles')).toBe('?gaps=on&tab=articles')
    expect(issueTabSearch('?tab=stocks&from=a&type=supply&gaps=on', 'timeline')).toBe('?tab=timeline&gaps=on')
    expect(issueTabSearch('?tab=stocks&from=a', 'stocks')).toBe('?tab=stocks&from=a')
  })

  it('탭 경로를 만들어요', () => {
    expect(issueTabPath('export', 'summary')).toMatch(/\/export$/)
    expect(issueTabPath('export', 'stocks')).toMatch(/\/export\?tab=stocks$/)
  })
})

describe('issueHead', () => {
  it('흐름 안 순번·매체 수·갱신 시각·시작일과 탭 개수를 만들어요', () => {
    const book = exportBook()
    const head = issueHead(
      { ...byId(book, 'e4'), stocks: [stock('a'), stock('b')], links: [link('a', 'x'), link('a', 'y'), link('b', 'z')] },
      book,
    )
    expect(head.badge).toBe('이슈 4개째')
    expect(head.tone).toBe('issue')
    expect(head.media).toBe('23개 매체')
    expect(head.when).toBe('오늘 15:18 갱신')
    expect(head.since).toBe('9월 12일부터 이어진 흐름')
    expect(head.counts).toEqual({ timeline: 4, articles: 31, stocks: 5 })
  })

  it('오늘이 아닌 이슈는 날짜로, 흐름이 없으면 새 이슈예요', () => {
    const book = exportBook()
    expect(issueHead(byId(book, 'e3'), book).when).toBe('10월 1일 15:12 갱신')
    expect(issueHead(byId(book, 'e3'), book).badge).toBe('이슈 3개째')
    const solo = issueHead(byId(book, 'solo'), book)
    expect(solo.badge).toBe('새 이슈')
    expect(solo.tone).toBe('neutral')
    expect(solo.since).toBeNull()
    expect(solo.counts.timeline).toBe(1)
  })
})

describe('summaryCaption', () => {
  it('묶인 기사와 매체 수로 만들었다고 알려요', () => {
    expect(summaryCaption({ articles: 31, media: 23 })).toBe('묶인 기사 31건 · 23개 매체로 만들었어요')
  })
})

describe('issueFlow', () => {
  it('지금 이슈까지 최근 4개를 오래된 순으로, 매체 수는 흐름 최댓값 대비 비율로 보여요', () => {
    const book = exportBook()
    const flow = issueFlow(byId(book, 'e4'), book)
    expect(flow.steps.map((s) => [s.id, s.date, s.title, s.media, s.pct, s.now])).toEqual([
      ['e1', '09.12', '장비 수출 규제 검토 보도', 8, 35, false],
      ['e2', '09.24', '반도체 업계 대응 회의', 12, 52, false],
      ['e3', '10.01', '수출 규제 시행 일정 공개', 17, 74, false],
      ['e4', '오늘 · 10.02', '국내 소재 공급망 재편', 23, 100, true],
    ])
    expect(flow.position).toBe(4)
    expect(flow.total).toBe(4)
    expect(flow.subtitle).toBe('9월 12일 처음 보도된 뒤 4번째 이슈예요. 다루는 매체가 8곳에서 23곳으로 늘었어요.')
    expect(flow.subtitleShort).toBe('9월 12일 처음 보도된 뒤 4번째 이슈예요. 매체가 8곳에서 23곳으로 늘었어요.')
  })

  it('지나간 이슈는 앞뒤 이슈를 함께 보여 주고 지금 이슈만 짧은 제목을 써요', () => {
    const book = exportBook()
    const flow = issueFlow(byId(book, 'e2'), book)
    expect(flow.steps.map((s) => s.id)).toEqual(['e1', 'e2', 'e3', 'e4'])
    expect(flow.steps.map((s) => s.now)).toEqual([false, true, false, false])
    expect(flow.steps[1].title).toBe('짧은 e2')
    expect(flow.steps[3].title).toBe('반도체 장비 수출 규제, 국내 소재 공급망 재편')
    expect(flow.steps[3].date).toBe('오늘 · 10.02')
    expect(flow.subtitle).toBe('9월 12일 처음 보도된 뒤 2번째 이슈예요. 다루는 매체가 8곳에서 12곳으로 늘었어요.')
  })

  it('흐름 첫 이슈와 혼자인 이슈의 문장', () => {
    const book = exportBook()
    expect(issueFlow(byId(book, 'e1'), book).subtitle).toBe('9월 12일 처음 보도된 이슈예요. 이후 이슈 3개가 이어졌어요.')
    const solo = issueFlow(byId(book, 'solo'), book)
    expect(solo.steps).toHaveLength(1)
    expect(solo.steps[0].now).toBe(true)
    expect(solo.subtitle).toBe('아직 이어진 이슈가 없어요. 비슷한 소식이 나오면 이 흐름에 이어 붙여요')
    expect(solo.subtitleShort).toBe(solo.subtitle)
  })

  it('매체 수가 줄었거나 같으면 그대로 말해요', () => {
    const book: IssueBook = {
      ...exportBook(),
      records: [record('p', { date: '2026-09-01', media: 9, chain: ['p', 'q'] }), record('q', { media: 4, chain: ['p', 'q'] })],
    }
    expect(issueFlow(byId(book, 'q'), book).subtitle).toBe('9월 1일 처음 보도된 뒤 2번째 이슈예요. 다루는 매체가 9곳에서 4곳으로 줄었어요.')
    const same: IssueBook = {
      ...exportBook(),
      records: [record('p', { date: '2026-09-01', media: 9, chain: ['p', 'q'] }), record('q', { media: 9, chain: ['p', 'q'] })],
    }
    expect(issueFlow(byId(same, 'q'), same).subtitleShort).toBe('9월 1일 처음 보도된 뒤 2번째 이슈예요. 매체 수는 9곳으로 처음과 같아요.')
  })

  it('흐름이 4개보다 길면 지금 이슈를 끝으로 4개를 잘라요', () => {
    const chain = ['a', 'b', 'c', 'd', 'e', 'f']
    const book: IssueBook = {
      ...exportBook(),
      records: chain.map((id, i) => record(id, { date: `2026-09-0${i + 1}`, media: i + 1, chain })),
    }
    expect(issueFlow(byId(book, 'f'), book).steps.map((s) => s.id)).toEqual(['c', 'd', 'e', 'f'])
    expect(issueFlow(byId(book, 'b'), book).steps.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(issueFlow(byId(book, 'd'), book).steps.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(issueFlow(byId(book, 'e'), book).steps.map((s) => s.id)).toEqual(['b', 'c', 'd', 'e'])
    expect(issueFlow(byId(book, 'f'), book).steps[0].pct).toBe(50)
  })
})

describe('rankLinks·issueRail', () => {
  it('근거 강도 순으로 정렬하고 같으면 받은 순서를 지켜요', () => {
    const ranked = rankLinks([
      link('a', 'x', { strength: 1 }),
      link('a', 'y', { strength: 3 }),
      link('a', 'z', { strength: 2 }),
      link('a', 'w', { strength: 2 }),
    ])
    expect(ranked.map((l) => l.company.name)).toEqual(['y', 'z', 'w', 'x'])
  })

  it('레일은 종목 3개 + 더 보기 수, 이런 기업 상위 3곳, 연결된 종목 수를 줘요', () => {
    const rail = issueRail(
      record('r', {
        stocks: ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => stock(n)),
        links: [link('a', 'x', { strength: 1 }), link('a', 'y', { strength: 3 }), link('a', 'z'), link('b', 'w')],
      }),
    )
    expect(rail.extra).toBe(3)
    expect(rail.top.map((l) => l.company.name)).toEqual(['y', 'z', 'w'])
    expect(rail.inferred).toBe(4)
    expect(rail.connected).toBe(10)
    expect(issueRail(record('s', { stocks: [stock('a')] })).extra).toBe(0)
  })
})

describe('graphSentence', () => {
  it('뉴스 종목과 이런 기업 수로 한 문장을 만들어요', () => {
    expect(graphSentence(6, 9)).toBe('이 이슈에서 뉴스에 나온 종목 6개를 거쳐 이런 기업 9곳으로 이어져요.')
    expect(graphSentence(2, 0)).toBe('이 이슈에서 뉴스에 나온 종목 2개로 이어져요.')
    expect(graphSentence(0, 0)).toBe('이 이슈에는 뉴스에 나온 종목이 없어요.')
  })
})

describe('clipLabel', () => {
  it('글자 수를 넘으면 말줄임표로 잘라요', () => {
    expect(clipLabel('보람디스플레이', 7)).toBe('보람디스플레이')
    expect(clipLabel('보람디스플레이', 6)).toBe('보람디스플…')
  })
})

describe('issueGraph', () => {
  const STOCKS = ['한빛반도체', '솔빛장비', '다온전자', '아라테크', '하늬테크', '윤슬반도체'].map((n) => stock(n))
  const LINKS: IssueLink[] = [
    link('한빛반도체', '누리소재', { strength: 3, confirmed: true }),
    link('솔빛장비', '세진정밀', { strength: 2, confirmed: true }),
    link('한빛반도체', '가람전자', { strength: 2, confirmed: true }),
    link('한빛반도체', '이음정밀', { strength: 2, confirmed: true }),
    link('한빛반도체', '늘봄화학', { strength: 2 }),
    link('한빛반도체', '온결가스', { strength: 1 }),
    link('한빛반도체', '보람디스플레이', { strength: 1 }),
    link('한빛반도체', '다솔머티리얼', { strength: 1 }),
    link('한빛반도체', '새결소재', {
      strength: 1,
      hops: [
        { edge: 'supply', node: '누리소재' },
        { edge: 'supply', node: '새결소재' },
      ],
    }),
  ]

  it('시안 구성을 그대로 만들어요', () => {
    const graph = issueGraph({ flowTitle: '반도체 장비 수출 규제', stocks: STOCKS, links: LINKS })
    if (!graph) throw new Error('graph')
    expect(graph.width).toBe(840)
    expect(graph.height).toBe(304)
    const pick = (kind: string) => graph.nodes.filter((n) => n.kind === kind).map((n) => [n.label, n.x, n.y])
    expect(pick('event')).toEqual([['반도체 장비 수출 규제', 16, 152]])
    expect(pick('news-more')).toEqual([['다온전자 외 3', 260, 40]])
    expect(pick('news')).toEqual([
      ['한빛반도체', 260, 132],
      ['솔빛장비', 260, 270],
    ])
    expect(pick('link')).toEqual([
      ['누리소재', 480, 40],
      ['가람전자', 480, 86],
      ['이음정밀', 480, 132],
      ['늘봄화학', 480, 178],
      ['세진정밀', 480, 270],
    ])
    expect(pick('link-more')).toEqual([['외 3곳', 480, 224]])
    expect(pick('second')).toEqual([['새결소재', 680, 40]])
    expect(graph.edges.filter((e) => e.kind === 'direct')).toHaveLength(3)
    expect(graph.edges.filter((e) => e.kind === 'inferred')).toHaveLength(7)
    expect(graph.edges[0].d).toBe('M196 152 C228 152 228 40 260 40')
    expect(graph.edges.find((e) => e.d.startsWith('M604'))?.d).toBe('M604 40 L680 40')
    expect(graph.news).toBe(6)
    expect(graph.inferred).toBe(9)
    expect(graph.memberLabel).toBe(
      '관계 그래프: 반도체 장비 수출 규제에서 한빛반도체·솔빛장비 등 뉴스에 나온 종목 6개를 거쳐 이런 기업 9곳으로 이어져요',
    )
    expect(graph.guestLabel).toBe(
      '관계 그래프: 반도체 장비 수출 규제에서 뉴스에 나온 종목 6개로 이어져요. 이런 기업은 로그인하면 볼 수 있어요',
    )
  })

  it('이어진 기업이 없으면 뉴스 종목만 가운데에 놓아요', () => {
    const graph = issueGraph({ flowTitle: '흐름', stocks: [stock('가'), stock('나')], links: [] })
    if (!graph) throw new Error('graph')
    expect(graph.height).toBe(166)
    expect(graph.nodes.filter((n) => n.kind === 'news').map((n) => n.y)).toEqual([63, 109])
    expect(graph.nodes.find((n) => n.kind === 'event')?.y).toBe(83)
    expect(graph.edges).toHaveLength(2)
    expect(graph.memberLabel).toBe('관계 그래프: 흐름에서 뉴스에 나온 종목 2개로 이어져요')
    expect(graph.guestLabel).toBe(graph.memberLabel)
  })

  it('이어진 기업 없는 종목이 자리보다 많으면 하나로 묶어요', () => {
    const graph = issueGraph({ flowTitle: '흐름', stocks: ['가', '나', '다', '라', '마'].map((n) => stock(n)), links: [] })
    expect(graph?.nodes.filter((n) => n.kind !== 'event').map((n) => n.label)).toEqual(['가', '나', '다 외 2'])
  })

  it('출발 종목이 하나면 남은 자리에 다른 종목을 따로 그려요', () => {
    const graph = issueGraph({
      flowTitle: '흐름',
      stocks: [stock('가'), stock('나')],
      links: [link('가', 'x'), link('가', 'y')],
    })
    if (!graph) throw new Error('graph')
    expect(graph.height).toBe(166)
    expect(graph.nodes.filter((n) => n.kind === 'news').map((n) => [n.label, n.y])).toEqual([
      ['나', 40],
      ['가', 86],
    ])
    expect(graph.nodes.filter((n) => n.kind === 'link').map((n) => n.y)).toEqual([63, 109])
    expect(graph.memberLabel).toBe('관계 그래프: 흐름에서 가 등 뉴스에 나온 종목 2개를 거쳐 이런 기업 2곳으로 이어져요')
  })

  it('뉴스에 나온 종목이 모두 출발 종목이면 등을 붙이지 않아요', () => {
    const graph = issueGraph({ flowTitle: '흐름', stocks: [stock('가')], links: [link('가', 'x')] })
    expect(graph?.memberLabel).toBe('관계 그래프: 흐름에서 가를 거쳐 이런 기업 1곳으로 이어져요')
  })

  it('뉴스에 나온 종목이 없으면 그리지 않아요', () => {
    expect(issueGraph({ flowTitle: '흐름', stocks: [], links: [] })).toBeNull()
  })
})
