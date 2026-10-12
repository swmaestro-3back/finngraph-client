import { describe, expect, it } from 'vitest'
import type { IssueBook, IssueRecord, IssueStock } from '@/lib/fg/issueRecords'
import { leadSentences, mockTimeline, stocksLine } from '@/lib/fg/issueTimeline'

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
