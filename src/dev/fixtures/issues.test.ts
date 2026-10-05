import { describe, expect, it } from 'vitest'
import { issueBookFixture, issueDaysFixture } from '@/dev/fixtures/issues'
import { stockIssueFlowsFixture } from '@/dev/fixtures/stockDetail'
import { findIssue, resolveIssueId } from '@/lib/fg/issueRecords'

describe('이슈 목업', () => {
  const book = issueBookFixture

  it('id가 겹치지 않아요', () => {
    const ids = book.records.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('앞선 이슈 제목은 모두 목업 이슈로 이어져 흐름 길이가 맞아요', () => {
    for (const day of issueDaysFixture.days) {
      for (const seed of day.issues) {
        const record = findIssue(book, seed.id)
        expect(record?.chain.indexOf(seed.id), seed.id).toBe(seed.steps.length)
      }
    }
  })

  it('흐름은 날짜순이고 같은 흐름의 이슈는 같은 흐름을 가져요', () => {
    for (const record of book.records) {
      const dates = record.chain.map((id) => findIssue(book, id)?.date ?? '')
      expect([...dates].sort(), record.id).toEqual(dates)
      for (const id of record.chain) expect(findIssue(book, id)?.chain, `${record.id}→${id}`).toEqual(record.chain)
    }
  })

  it('이어진 기업 수가 이슈 카드의 수와 같아요', () => {
    for (const day of issueDaysFixture.days) {
      for (const seed of day.issues) expect(findIssue(book, seed.id)?.links.length, seed.id).toBe(seed.inferred)
    }
  })

  it('다른 화면 목업이 쓰는 id는 모두 이슈로 이어져요', () => {
    for (const alias of Object.keys(book.aliases)) expect(resolveIssueId(book, alias), alias).not.toBeNull()
  })

  it('시안 이슈는 오늘 날짜이고 짧은 제목·흐름 이름·핵심 포인트 3개가 있어요', () => {
    const exportIssue = findIssue(book, 'export')
    expect(book.today).toBe('2026-10-02')
    expect(exportIssue?.chain).toEqual(['export1', 'export2', 'export3', 'export'])
    expect(exportIssue?.shortTitle).toBe('국내 소재 공급망 재편')
    expect(exportIssue?.flowTitle).toBe('반도체 장비 수출 규제')
    expect(exportIssue?.points).toHaveLength(3)
    expect(exportIssue?.links.slice(0, 3).map((l) => l.company.name)).toEqual(['누리소재', '세진정밀', '가람전자'])
  })

  it('종목 화면 흐름 목업의 이슈 키는 모두 같은 제목의 이슈로 이어져요', () => {
    for (const flow of stockIssueFlowsFixture.flows) {
      const ids = flow.issues.map((issue, k) => {
        const id = resolveIssueId(book, `${flow.id}-${k}`)
        expect(id, `${flow.id}-${k}`).not.toBeNull()
        expect(findIssue(book, id ?? '')?.title, `${flow.id}-${k}`).toBe(issue.title)
        return id
      })
      const last = findIssue(book, ids[ids.length - 1] ?? '')
      expect(last?.chain, flow.id).toEqual(ids)
    }
  })

  it('묶인 기사 목록은 이슈의 기사 수·매체 수와 맞아요', () => {
    for (const record of book.records) {
      expect(record.articleList, record.id).toHaveLength(record.articles)
      expect(new Set(record.articleList.map((a) => a.pressKey)).size, record.id).toBe(record.media)
      expect(record.articleList.every((a) => a.day === record.date && a.time !== null), record.id).toBe(true)
    }
  })

  it('연결된 종목 탭의 뉴스 종목은 시안의 시세·역할·기사 수예요', () => {
    const stocks = findIssue(book, 'export')?.stocks ?? []
    expect(stocks.map((s) => [s.name, s.market, s.price, s.change, s.gapFromHigh, s.position, s.mentions])).toEqual([
      ['한빛반도체', 'KOSPI', 72400, 1.68, -3.3, 0.932, 18],
      ['솔빛장비', 'KOSDAQ', 23900, 3.21, -5.8, 0.9, 9],
      ['다온전자', 'KOSPI', 54700, 1.05, -11.6, 0.62, 6],
      ['아라테크', 'KOSDAQ', 12350, -0.42, -22.0, 0.35, 5],
      ['하늬테크', 'KOSDAQ', 7980, 0.76, -17.3, 0.44, 3],
      ['윤슬반도체', 'KOSDAQ', 15600, -1.14, -26.5, 0.21, 2],
    ])
    expect(stocks[0].role).toBe('규제 대상 장비를 쓰는 생산라인을 가진 회사로, 국산 소재 조달을 늘린다는 계획이 보도됐어요.')
  })

  it('연결된 종목 탭의 이런 기업은 시안 순서이고 세진정밀은 솔빛장비에서 이어져요', () => {
    const links = findIssue(book, 'export')?.links ?? []
    expect(links.map((l) => l.company.name)).toEqual([
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
    const sejin = links.find((l) => l.company.name === '세진정밀')
    expect(sejin?.from).toBe('솔빛장비')
    expect([sejin?.company.price, sejin?.company.gapFromHigh, sejin?.company.position, sejin?.company.evidence.length]).toEqual([
      11420, -24.9, 0.289, 2,
    ])
  })

  it('모든 뉴스 종목에 시세·52주·역할이 있고 언급 기사는 그 이슈의 기사예요', () => {
    for (const record of book.records) {
      const ids = new Set(record.articleList.map((a) => a.id))
      for (const stock of record.stocks) {
        const label = `${record.id}:${stock.name}`
        expect(stock.price, label).toBeGreaterThan(0)
        expect(stock.market, label).toMatch(/^KOS(PI|DAQ)$/)
        expect(stock.gapFromHigh, label).toBeLessThanOrEqual(0)
        expect(stock.position, label).toBeGreaterThanOrEqual(0)
        expect(stock.position, label).toBeLessThanOrEqual(1)
        expect(stock.role, label).toBeTruthy()
        expect(stock.mentionIds, label).toHaveLength(stock.mentions ?? -1)
        expect(new Set(stock.mentionIds).size, label).toBe(stock.mentions)
        expect(stock.mentionIds?.every((id) => ids.has(id)), label).toBe(true)
        expect(stock.mentions, label).toBeGreaterThan(0)
        expect(stock.mentions, label).toBeLessThanOrEqual(record.articles)
      }
    }
  })

  it('같은 종목은 어느 이슈에서든 같은 현재가예요', () => {
    const prices = new Map<string, number>()
    for (const record of book.records) {
      for (const stock of record.stocks) {
        const seen = prices.get(stock.name)
        if (seen !== undefined) expect(stock.price, `${record.id}:${stock.name}`).toBe(seen)
        else prices.set(stock.name, stock.price ?? 0)
      }
    }
  })

  it('시안 이슈의 기사는 시안의 31건이에요', () => {
    const list = findIssue(book, 'export')?.articleList ?? []
    const times = list.map((a) => a.time ?? '').sort()
    expect(list).toHaveLength(31)
    expect(times[0]).toBe('08:12')
    expect(times[times.length - 1]).toBe('15:30')
    expect(list.find((a) => a.time === '08:12')?.press).toBe('예시데일리')
    expect(list.find((a) => a.time === '15:30')?.title).toBe('반도체 장비 수출 규제 11월 시행…국내 생산라인 대응 분주')
  })
})
