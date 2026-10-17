import { describe, expect, it } from 'vitest'
import type { IssueArticleItem, IssueLink, IssueStock } from '@/lib/fg/issueRecords'
import {
  cardArticles,
  issueLinkCaption,
  issueLinkSortOptions,
  issueLinkSummary,
  linkScopeSearch,
  newsStockCards,
  newsStocksCaption,
  readLinkScope,
  scopeLinks,
  sortIssueLinks,
  stockSheetTitle,
} from '@/lib/fg/issueStocks'
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

function stock(name: string, over: Partial<IssueStock> = {}): IssueStock {
  return { name, ticker: null, change: 1, ...over }
}

function article(id: string, over: Partial<IssueArticleItem> = {}): IssueArticleItem {
  return {
    id,
    title: `기사 ${id}`,
    url: null,
    press: '예시경제',
    pressKey: '예시경제',
    day: '2026-10-02',
    time: '10:00',
    summary: null,
    analyzed: false,
    ...over,
  }
}

const EXPORT_STOCKS: IssueStock[] = [
  stock('한빛반도체', { mentions: 18, market: 'KOSPI', price: 72400, gapFromHigh: -3.3, position: 0.932, role: '역할 한빛' }),
  stock('솔빛장비', { mentions: 9 }),
  stock('다온전자', { mentions: 6 }),
  stock('아라테크', { mentions: 5 }),
  stock('하늬테크', { mentions: 3 }),
  stock('윤슬반도체', { mentions: 2 }),
]

const EXPORT_LINKS: IssueLink[] = [
  link('한빛반도체', '누리소재', { strength: 3, change: 0.94 }),
  link('솔빛장비', '세진정밀', { strength: 2, change: 2.15 }),
  link('한빛반도체', '가람전자', { strength: 2, type: 'customer', change: 0.39 }),
  link('한빛반도체', '이음정밀', { strength: 2, type: 'invest', change: 1.27 }),
  link('한빛반도체', '늘봄화학', { strength: 2, change: -0.65 }),
  link('한빛반도체', '다솔머티리얼', { strength: 1, type: 'theme', change: 3.88 }),
  link('한빛반도체', '온결가스', { strength: 1, change: 0.51 }),
  link('한빛반도체', '보람디스플레이', { strength: 1, type: 'customer', change: -1.38 }),
  link('한빛반도체', '새결소재', {
    strength: 1,
    change: 0.12,
    hops: [
      { edge: 'supply', node: '누리소재' },
      { edge: 'supply', node: '새결소재' },
    ],
  }),
]

describe('newsStockCards', () => {
  it('목업 종목은 이어진 기업 수를 출발 종목별로 세요', () => {
    const cards = newsStockCards(EXPORT_STOCKS, EXPORT_LINKS)
    expect(cards.map((c) => [c.key, c.articles, c.links])).toEqual([
      ['한빛반도체', 18, 8],
      ['솔빛장비', 9, 1],
      ['다온전자', 6, 0],
      ['아라테크', 5, 0],
      ['하늬테크', 3, 0],
      ['윤슬반도체', 2, 0],
    ])
    expect(cards[0]).toMatchObject({ market: 'KOSPI', price: 72400, gapFromHigh: -3.3, position: 0.932, role: '역할 한빛' })
  })

  it('실데이터 종목은 종목 코드가 키이고 역할·52주·이어진 기업은 비워요', () => {
    const cards = newsStockCards(
      [stock('가온전선', { ticker: '000500', mentions: 5, market: 'KOSPI', price: 41000, change: 2.1 })],
      null,
    )
    expect(cards).toEqual([
      {
        key: '000500',
        name: '가온전선',
        ticker: '000500',
        market: 'KOSPI',
        price: 41000,
        change: 2.1,
        gapFromHigh: null,
        position: null,
        role: null,
        articles: 5,
        mentionIds: null,
        links: null,
      },
    ])
  })

  it('언급 수가 없으면 언급 기사 수를 써요', () => {
    const [card] = newsStockCards([stock('가', { mentionIds: ['a1', 'a2'] })], [])
    expect(card.articles).toBe(2)
    expect(card.mentionIds).toEqual(['a1', 'a2'])
  })
})

describe('readLinkScope', () => {
  const cards = newsStockCards(EXPORT_STOCKS, EXPORT_LINKS)

  it('출발 종목과 관계 유형을 주소에서 읽어요', () => {
    const scope = readLinkScope('?tab=stocks&from=%ED%95%9C%EB%B9%9B%EB%B0%98%EB%8F%84%EC%B2%B4&type=customer', cards, EXPORT_LINKS)
    expect(scope.source?.name).toBe('한빛반도체')
    expect(scope.filter).toBe('customer')
  })

  it('이어진 기업이 없는 종목이나 모르는 값은 무시해요', () => {
    expect(readLinkScope('?from=다온전자', cards, EXPORT_LINKS).source).toBeNull()
    expect(readLinkScope('?from=없는종목', cards, EXPORT_LINKS).source).toBeNull()
    expect(readLinkScope('?type=merger', cards, EXPORT_LINKS).filter).toBe('all')
  })

  it('고른 범위에 없는 유형은 전체로 돌려요', () => {
    expect(readLinkScope('?from=솔빛장비&type=customer', cards, EXPORT_LINKS).filter).toBe('all')
    expect(readLinkScope('?from=솔빛장비&type=supply', cards, EXPORT_LINKS).filter).toBe('supply')
  })
})

describe('linkScopeSearch', () => {
  it('다른 쿼리는 두고 출발 종목·유형만 바꿔요', () => {
    expect(linkScopeSearch('?tab=stocks&gaps=on', '한빛반도체', 'all')).toBe(
      '?tab=stocks&gaps=on&from=%ED%95%9C%EB%B9%9B%EB%B0%98%EB%8F%84%EC%B2%B4',
    )
    expect(linkScopeSearch('?tab=stocks&from=a&type=supply', null, 'all')).toBe('?tab=stocks')
    expect(linkScopeSearch('?tab=stocks&from=a', 'a', 'customer')).toBe('?tab=stocks&from=a&type=customer')
  })
})

describe('scopeLinks · sortIssueLinks', () => {
  it('출발 종목으로 거르고 근거 강도 순은 같은 강도에서 원래 순서를 지켜요', () => {
    expect(scopeLinks(EXPORT_LINKS, '솔빛장비').map((l) => l.company.name)).toEqual(['세진정밀'])
    expect(scopeLinks(EXPORT_LINKS, null)).toHaveLength(9)
    expect(sortIssueLinks(EXPORT_LINKS, 'strength').map((l) => l.company.name)).toEqual([
      '누리소재',
      '세진정밀',
      '가람전자',
      '이음정밀',
      '늘봄화학',
      '다솔머티리얼',
      '온결가스',
      '보람디스플레이',
      '새결소재',
    ])
  })

  it('오늘 등락률 순은 등락률이 높은 기업부터예요', () => {
    expect(sortIssueLinks(EXPORT_LINKS, 'change').map((l) => l.company.name)).toEqual([
      '다솔머티리얼',
      '세진정밀',
      '이음정밀',
      '누리소재',
      '온결가스',
      '가람전자',
      '새결소재',
      '늘봄화학',
      '보람디스플레이',
    ])
  })
})

describe('issueLinkCaption', () => {
  it('출발 종목·유형·정렬을 한 줄로 써요', () => {
    expect(issueLinkCaption(null, 'all', 9, 'strength')).toBe('전체 9곳 · 근거 강도 순')
    expect(issueLinkCaption(null, 'supply', 5, 'strength')).toBe('공급 5곳 · 근거 강도 순')
    expect(issueLinkCaption('솔빛장비', 'all', 1, 'strength')).toBe('솔빛장비에서 이어진 1곳 · 근거 강도 순')
    expect(issueLinkCaption('한빛반도체', 'customer', 2, 'strength')).toBe('한빛반도체에서 이어진 고객 2곳 · 근거 강도 순')
    expect(issueLinkCaption(null, 'all', 9, 'change')).toBe('전체 9곳 · 오늘 등락률 순')
  })
})

describe('issueLinkSortOptions', () => {
  it('좁은 화면에서는 등락률 라벨을 줄여요', () => {
    expect(issueLinkSortOptions(false).map((o) => o.label)).toEqual(['근거 강도 순', '오늘 등락률 순'])
    expect(issueLinkSortOptions(true).map((o) => o.label)).toEqual(['근거 강도 순', '등락률 순'])
  })
})

function plain(parts: { text: string; strong: boolean }[]): string {
  return parts.map((p) => p.text).join('')
}

describe('issueLinkSummary', () => {
  it('출발 종목별 수와 가장 많은 관계 유형을 문장으로 만들어요', () => {
    const parts = issueLinkSummary(EXPORT_LINKS, newsStockCards(EXPORT_STOCKS, EXPORT_LINKS))
    expect(plain(parts)).toBe(
      '9곳 중 8곳은 한빛반도체를, 1곳은 솔빛장비를 거쳐 이 이슈와 이어져요. 공급망으로 이어진 곳이 5곳으로 가장 많아요.',
    )
    expect(parts.filter((p) => p.strong).map((p) => p.text)).toEqual(['한빛반도체', '솔빛장비'])
  })

  it('출발 종목이 하나면 모두로, 유형이 하나면 모두로 써요', () => {
    const links = [link('대성화학', '가'), link('대성화학', '나')]
    expect(plain(issueLinkSummary(links, newsStockCards([stock('대성화학')], links)))).toBe(
      '2곳 모두 대성화학을 거쳐 이 이슈와 이어져요. 모두 공급망으로 이어졌어요.',
    )
  })

  it('한 곳이면 한 곳으로, 가장 많은 유형이 겹치면 함께 써요', () => {
    const one = [link('가람전자', '가', { type: 'customer' })]
    expect(plain(issueLinkSummary(one, newsStockCards([stock('가람전자')], one)))).toBe(
      '1곳이 가람전자를 거쳐 이 이슈와 이어져요. 고객 관계로 이어졌어요.',
    )
    const tie = [link('가', '나'), link('가', '다', { type: 'customer' })]
    expect(plain(issueLinkSummary(tie, newsStockCards([stock('가')], tie)))).toBe(
      '2곳 모두 가를 거쳐 이 이슈와 이어져요. 공급·고객 관계로 이어진 곳이 1곳씩으로 가장 많아요.',
    )
  })

  it('출발 종목이 넷 이상이면 셋까지 이름을 쓰고 나머지는 묶어요', () => {
    const links = [
      link('가', 'a1'),
      link('가', 'a2'),
      link('나', 'b1'),
      link('다', 'c1'),
      link('라', 'd1'),
      link('마', 'e1'),
    ]
    const cards = newsStockCards(['가', '나', '다', '라', '마'].map((n) => stock(n)), links)
    expect(plain(issueLinkSummary(links, cards))).toBe(
      '6곳 중 2곳은 가를, 1곳은 나를, 1곳은 다를, 나머지 2곳은 다른 종목을 거쳐 이 이슈와 이어져요. 모두 공급망으로 이어졌어요.',
    )
  })

  it('이어진 기업이 없으면 빈 문장이에요', () => {
    expect(issueLinkSummary([], [])).toEqual([])
  })
})

describe('newsStocksCaption', () => {
  it('실데이터에는 AI 역할 문구를 빼요', () => {
    expect(newsStocksCaption(false)).toBe('기사에 이름이 나온 종목이에요 · 많이 나온 순')
    expect(newsStocksCaption(true)).toBe('많이 나온 순')
  })
})

describe('stockSheetTitle', () => {
  it('종목 이름에 맞는 조사를 붙여요', () => {
    expect(stockSheetTitle('한빛반도체', 18)).toBe('한빛반도체가 나온 기사 18건이에요')
    expect(stockSheetTitle('가온전선', 5)).toBe('가온전선이 나온 기사 5건이에요')
  })
})

describe('cardArticles', () => {
  const articles = [article('a1'), article('a2'), article('a3')]

  it('목업은 언급 기사 id로 골라요', () => {
    const [card] = newsStockCards([stock('가', { mentionIds: ['a3', 'a1'] })], [])
    expect(cardArticles(card, articles, null)?.map((a) => a.id)).toEqual(['a1', 'a3'])
  })

  it('실데이터는 종목 코드별 기사 목록을 쓰고 아직 없으면 null이에요', () => {
    const [card] = newsStockCards([stock('가온전선', { ticker: '000500', mentions: 1 })], null)
    expect(cardArticles(card, articles, null)).toBeNull()
    expect(cardArticles(card, articles, new Map([['000500', [articles[1]]]]))?.map((a) => a.id)).toEqual(['a2'])
    expect(cardArticles(card, articles, new Map())).toEqual([])
  })
})
