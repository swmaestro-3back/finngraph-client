import { describe, expect, it } from 'vitest'
import { placeDisclosures, type DisclosuresFixture } from '@/lib/fg/disclosures'

const fixture: DisclosuresFixture = {
  anchor: '2026-10-02',
  listUrl: 'https://dart.fss.or.kr/',
  items: [
    { date: '2026-09-08', title: '자기주식 취득 결정', summary: '1조 원', url: 'https://dart.fss.or.kr/' },
    { date: '2026-10-01', title: '단일판매·공급계약 체결', summary: '가람전자', url: 'https://dart.fss.or.kr/' },
  ],
}

describe('placeDisclosures', () => {
  it('목업의 오늘을 마지막 봉 날짜로 옮기고 최신순으로 늘어놓는다', () => {
    expect(placeDisclosures(fixture, '2026-09-30').map((row) => [row.date, row.title])).toEqual([
      ['2026-09-29', '단일판매·공급계약 체결'],
      ['2026-09-06', '자기주식 취득 결정'],
    ])
  })

  it('봉이 없으면 날짜를 그대로 둔다', () => {
    expect(placeDisclosures(fixture, null)[0]).toMatchObject({ date: '2026-10-01', key: '2026-10-01-단일판매·공급계약 체결' })
  })
})
