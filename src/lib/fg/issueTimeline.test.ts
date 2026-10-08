import { describe, expect, it } from 'vitest'
import type { IssueDetailRes } from '@/lib/apiTypes'
import type { IssueBook, IssueRecord, IssueStock } from '@/lib/fg/issueRecords'
import { liveSubject } from '@/lib/fg/issueSubject'
import { leadSentences, liveTimeline, mockTimeline, stocksLine } from '@/lib/fg/issueTimeline'

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
    summary: `요약 ${id}`,
    detail: `상세 ${id}`,
    points: [],
    stocks: [],
    links: [],
    chain: [id],
    articleList: [],
    ...over,
  }
}

const CHAIN = ['e1', 'e2', 'e3', 'e4']

function book(): IssueBook {
  return {
    today: '2026-10-02',
    snapshot: '15:30',
    aliases: {},
    records: [
      record('e1', { date: '2026-09-12', title: '장비 수출 규제 검토 보도', media: 8, articles: 9, chain: CHAIN, stocks: [stock('한빛반도체', -1.21), stock('솔빛장비')] }),
      record('e2', { date: '2026-09-24', title: '반도체 업계 대응 회의', media: 12, articles: 15, chain: CHAIN, stocks: [stock('한빛반도체'), stock('다온전자'), stock('솔빛장비')] }),
      record('e3', { date: '2026-10-01', title: '수출 규제 시행 일정 공개', media: 17, articles: 22, summary: '11월 1일부터 시행한다고 발표했어요.', chain: CHAIN, stocks: [stock('한빛반도체', 3.39), stock('다온전자'), stock('아라테크')] }),
      record('e4', {
        title: '반도체 장비 수출 규제, 국내 소재 공급망 재편',
        media: 23,
        articles: 31,
        chain: CHAIN,
        detail: '첫 문장이에요. 둘째 문장이에요. 셋째 문장이에요.',
        stocks: ['한빛반도체', '솔빛장비', '다온전자', '아라테크', '하늬테크', '윤슬반도체'].map((name, i) => stock(name, i === 0 ? 1.68 : 0.5)),
      }),
      record('solo', { media: 5, articles: 6 }),
    ],
  }
}

function byId(b: IssueBook, id: string): IssueRecord {
  const found = b.records.find((r) => r.id === id)
  if (!found) throw new Error(id)
  return found
}

describe('stocksLine', () => {
  it('세 개까지 이름을 쓰고 나머지는 외 n으로 묶어요', () => {
    expect(stocksLine(['가', '나'])).toBe('가 · 나')
    expect(stocksLine(['가', '나', '다', '라', '마', '바'])).toBe('가 · 나 · 다 외 3')
    expect(stocksLine([])).toBeNull()
  })
})

describe('leadSentences', () => {
  it('앞 문장 n개만 남겨요', () => {
    expect(leadSentences('첫 문장이에요. 둘째 문장이에요. 셋째 문장이에요.', 2)).toBe('첫 문장이에요. 둘째 문장이에요.')
    expect(leadSentences('한 문장이에요', 2)).toBe('한 문장이에요')
    expect(leadSentences('수익률이 1.5% 올랐어요. 둘째예요. 셋째예요.', 2)).toBe('수익률이 1.5% 올랐어요. 둘째예요.')
  })
})

describe('mockTimeline', () => {
  it('흐름의 이슈를 최신순 노드로, 지금 이슈는 앞 두 문장 요약과 함께 보여요', () => {
    const b = book()
    const model = mockTimeline(byId(b, 'e4'), b, 'new')
    expect(model.heading).toBe('이슈 타임라인')
    expect(model.summaryLabel).toBe('요약')
    expect(model.listLabel).toBe('이슈 타임라인, 최신순')
    expect(model.nodes.map((n) => [n.key, n.date, n.badge, n.meta, n.now, n.cov?.pct])).toEqual([
      ['e4', '오늘 · 10.02', '지금 보는 이슈', '23개 매체 · 기사 31건', true, 100],
      ['e3', '10.01', '타임라인 3번째', '17개 매체 · 기사 22건', false, 74],
      ['e2', '09.24', '타임라인 2번째', '12개 매체 · 기사 15건', false, 52],
      ['e1', '09.12', '타임라인 1번째', '8개 매체 · 기사 9건', false, 35],
    ])
    expect(model.nodes[0].target).toBeNull()
    expect(model.nodes[1].target).toEqual({ kind: 'issue', id: 'e3' })
    expect(model.nodes[0].summary).toBe('첫 문장이에요. 둘째 문장이에요.')
    expect(model.nodes[1].summary).toBe('11월 1일부터 시행한다고 발표했어요.')
    expect(model.nodes[0].stocks).toBe('한빛반도체 · 솔빛장비 · 다온전자 외 3')
    expect(model.subtitle).toBe('9월 12일 처음 보도된 뒤 20일 동안 이슈 4개로 이어졌어요. 다루는 매체가 8곳에서 23곳으로 늘었어요.')
  })

  it('오래된 순은 순서만 뒤집어요', () => {
    const b = book()
    const model = mockTimeline(byId(b, 'e2'), b, 'old')
    expect(model.listLabel).toBe('이슈 타임라인, 오래된 순')
    expect(model.nodes.map((n) => n.key)).toEqual(['e1', 'e2', 'e3', 'e4'])
    expect(model.nodes.map((n) => n.now)).toEqual([false, true, false, false])
    expect(model.nodes[1].badge).toBe('지금 보는 이슈')
    expect(model.nodes[3].target).toEqual({ kind: 'issue', id: 'e4' })
  })

  it('흐름 한눈에는 처음 보도·이어진 기간·이슈 수·기사 합계예요', () => {
    const b = book()
    const model = mockTimeline(byId(b, 'e4'), b, 'new')
    expect(model.glanceTitle).toBe('흐름 한눈에')
    expect(model.glance).toEqual([
      { label: '처음 보도', value: '9월 12일' },
      { label: '이어진 기간', value: '20일' },
      { label: '이슈', value: '4개' },
      { label: '묶인 기사', value: '77건' },
    ])
    expect(model.glanceNote).toBe('매체 수는 이슈마다 서로 다른 매체를 셌어요 · 10월 2일 15:30 기준')
  })

  it('자주 나온 종목은 나온 이슈 수 순이고 모두 나오면 모두라고 써요', () => {
    const b = book()
    const model = mockTimeline(byId(b, 'e4'), b, 'new')
    expect(model.frequentTitle).toBe('이 흐름에 자주 나온 종목')
    expect(model.frequentNote).toBe('이슈 4개 중 몇 번 나왔는지 · 오늘 등락')
    expect(model.frequent.map((s) => [s.name, s.label, s.change])).toEqual([
      ['한빛반도체', '이슈 4개 모두', 1.68],
      ['솔빛장비', '이슈 3개', 0.5],
      ['다온전자', '이슈 3개', 0.5],
      ['아라테크', '이슈 2개', 0.5],
      ['하늬테크', '이슈 1개', 0.5],
    ])
  })

  it('혼자인 이슈는 새 이슈 노드 하나와 기다리는 문장이에요', () => {
    const b = book()
    const model = mockTimeline(byId(b, 'solo'), b, 'new')
    expect(model.nodes).toHaveLength(1)
    expect(model.nodes[0].badge).toBe('새 이슈')
    expect(model.subtitle).toBe('아직 이어진 이슈가 없어요. 비슷한 소식이 나오면 이 흐름에 이어 붙여요')
    expect(model.glance[1]).toEqual({ label: '이어진 기간', value: '하루' })
  })

  it('20개가 넘는 흐름은 지금 이슈를 포함한 20개만 보여요', () => {
    const ids = Array.from({ length: 25 }, (_, i) => `n${i}`)
    const records = ids.map((id, i) =>
      record(id, { date: `2026-0${1 + Math.floor(i / 9)}-${String(1 + (i % 9) * 3).padStart(2, '0')}`, chain: ids }),
    )
    const b: IssueBook = { today: '2026-10-02', snapshot: '15:30', aliases: {}, records }
    expect(mockTimeline(records[24], b, 'old').nodes.map((n) => n.key)).toEqual(ids.slice(5))
    expect(mockTimeline(records[2], b, 'old').nodes.map((n) => n.key)).toEqual(ids.slice(0, 20))
  })
})

function detail(over: Partial<IssueDetailRes> = {}): IssueDetailRes {
  return {
    id: 1,
    title: '가온전선 협력 미국 태양광 발전단지 MV 케이블 공급',
    titleSource: 'cluster',
    articleCount: 3,
    mediaCount: 3,
    firstPublishedAt: '2026-09-16T09:16:00+09:00',
    lastPublishedAt: '2026-09-18T09:48:00+09:00',
    keywords: [],
    summary: '대표 기사 요약',
    representativeNewsId: 2,
    companies: [
      { ticker: '000500', name: '가온전선', mentionCount: 3 },
      { ticker: '229640', name: 'LS에코에너지', mentionCount: 2 },
    ],
    articles: [
      { id: 1, title: '첫 기사', url: 'https://www.press-a.test/1', press: 'press-a.test', publishedAt: '2026-09-16T09:16:00+09:00', summary: '첫 요약', tripleExtracted: true },
      { id: 2, title: '대표 기사', url: 'https://news.press-b.test/2', press: 'news.press-b.test', publishedAt: '2026-09-16T09:38:00+09:00', summary: '대표 요약', tripleExtracted: true },
      { id: 3, title: '셋째 기사', url: 'https://www.press-c.test/3', press: 'press-c.test', publishedAt: '2026-09-18T09:48:00+09:00', summary: null, tripleExtracted: true },
    ],
    ...over,
  }
}

describe('liveTimeline', () => {
  const quotes = new Map([['000500', { market: 'KOSPI', price: 58800, change: 17.95 }]])

  it('기사를 보도 시각 순 노드로, 대표 기사를 지금 노드로 보여요', () => {
    const model = liveTimeline(liveSubject(detail(), quotes, '2026-10-05'), 'old')
    expect(model.heading).toBe('보도 타임라인')
    expect(model.summaryLabel).toBe('기사 요약')
    expect(model.listLabel).toBe('보도 타임라인, 오래된 순')
    expect(model.nodes.map((n) => [n.key, n.date, n.badge, n.meta, n.now, n.cov])).toEqual([
      ['1', '09.16 09:16', '처음 보도', 'press-a.test', false, null],
      ['2', '09.16 09:38', '대표 기사', 'news.press-b.test', true, null],
      ['3', '09.18 09:48', '3번째 보도', 'press-c.test', false, null],
    ])
    expect(model.nodes.map((n) => n.target)).toEqual([
      { kind: 'news', id: '1' },
      { kind: 'news', id: '2' },
      { kind: 'news', id: '3' },
    ])
    expect(model.nodes.map((n) => n.newsId)).toEqual(['1', '2', '3'])
    expect(model.nodes[2].summary).toBeNull()
    expect(model.subtitle).toBe('9월 16일 09:16 처음 보도된 뒤 2일 동안 기사 3건이 이어졌어요. 3개 매체가 다뤘어요.')
  })

  it('최신순은 뒤집고, 분석되지 않은 기사는 원문으로 가요', () => {
    const d = detail()
    const model = liveTimeline(
      liveSubject({ ...d, articles: d.articles.map((a) => (a.id === 3 ? { ...a, tripleExtracted: false } : a)) }, null, '2026-10-05'),
      'new',
    )
    expect(model.nodes.map((n) => n.key)).toEqual(['3', '2', '1'])
    expect(model.nodes[0].target).toEqual({ kind: 'url', url: 'https://www.press-c.test/3' })
  })

  it('보도 한눈에와 자주 나온 종목은 기사 기준이에요', () => {
    const model = liveTimeline(liveSubject(detail(), quotes, '2026-10-05'), 'new')
    expect(model.glanceTitle).toBe('보도 한눈에')
    expect(model.glance).toEqual([
      { label: '처음 보도', value: '9월 16일 09:16' },
      { label: '이어진 기간', value: '2일' },
      { label: '매체', value: '3곳' },
      { label: '묶인 기사', value: '3건' },
    ])
    expect(model.frequentTitle).toBe('이 이슈에 자주 나온 종목')
    expect(model.frequentNote).toBe('기사 3건 중 몇 건에 나왔는지 · 오늘 등락')
    expect(model.frequent).toEqual([
      { name: '가온전선', ticker: '000500', change: 17.95, label: '기사 3건 모두' },
      { name: 'LS에코에너지', ticker: '229640', change: null, label: '기사 2건' },
    ])
  })

  it('같은 날은 시간·분으로 기간을 쓰고 오늘 기사는 오늘로 표시해요', () => {
    const d = detail({
      articles: [
        { id: 1, title: 'a', url: null, press: 'press-a.test', publishedAt: '2026-10-05T08:12:00+09:00', summary: null, tripleExtracted: true },
        { id: 2, title: 'b', url: null, press: 'press-a.test', publishedAt: '2026-10-05T14:40:00+09:00', summary: null, tripleExtracted: true },
      ],
      articleCount: 2,
      mediaCount: 1,
    })
    const model = liveTimeline(liveSubject(d, null, '2026-10-05'), 'old')
    expect(model.nodes[0].date).toBe('오늘 08:12')
    expect(model.glance[1]).toEqual({ label: '이어진 기간', value: '6시간' })
    expect(model.subtitle).toBe('오늘 08:12 처음 보도된 뒤 6시간 동안 기사 2건이 이어졌어요. 1개 매체가 다뤘어요.')
    const near = detail({
      articles: [
        { id: 1, title: 'a', url: null, press: 'press-a.test', publishedAt: '2026-10-05T08:12:00+09:00', summary: null, tripleExtracted: true },
        { id: 2, title: 'b', url: null, press: 'press-a.test', publishedAt: '2026-10-05T08:52:00+09:00', summary: null, tripleExtracted: true },
      ],
    })
    expect(liveTimeline(liveSubject(near, null, '2026-10-05'), 'old').glance[1].value).toBe('40분')
  })

  it('기사 한 건이면 이어진 기간이 없고 처음 보도 문장이에요', () => {
    const d = detail({
      articleCount: 1,
      mediaCount: 1,
      representativeNewsId: 7,
      companies: [{ ticker: '000500', name: '가온전선', mentionCount: 1 }],
      articles: [
        { id: 7, title: 'a', url: null, press: 'press-d.test', publishedAt: '2026-09-30T09:32:00+09:00', summary: 's', tripleExtracted: true },
      ],
    })
    const model = liveTimeline(liveSubject(d, null, '2026-10-05'), 'new')
    expect(model.nodes).toHaveLength(1)
    expect(model.nodes[0].badge).toBe('대표 기사')
    expect(model.glance[1]).toEqual({ label: '이어진 기간', value: '—' })
    expect(model.subtitle).toBe('9월 30일 09:32 press-d.test에서 처음 보도했어요. 아직 이어진 기사가 없어요.')
    expect(model.frequent[0].label).toBe('기사 1건')
  })
})
