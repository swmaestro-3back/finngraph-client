import { describe, expect, it } from 'vitest'
import type { StockContractRes } from '@/lib/apiTypes'
import { contractItems, contractsCaption } from '@/lib/fg/stockContracts'

function contract(rceptNo: string, rceptDate: string, extra: Partial<StockContractRes> = {}): StockContractRes {
  return {
    rceptNo,
    rceptDate,
    reportName: '단일판매ㆍ공급계약체결',
    role: 'FILER',
    contractType: null,
    contractName: null,
    counterpartyName: null,
    counterpartyTicker: null,
    contractAmount: null,
    salesRatio: null,
    startDate: null,
    endDate: null,
    link: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`,
    isCorrection: false,
    ...extra,
  }
}

const rows = [
  contract('20251002000001', '2025-10-02', { counterpartyName: '오래된상대' }),
  contract('20260930901249', '2026-09-30', {
    role: 'COUNTERPARTY',
    counterpartyName: '위드텍',
    counterpartyTicker: '348350',
    contractAmount: 12371425070,
    salesRatio: 28.36,
    startDate: '2025-10-01',
    endDate: '2026-10-31',
    isCorrection: true,
  }),
  contract('20251120000002', '2025-11-20', {
    counterpartyName: '가람전자',
    contractAmount: 1650000000000,
    salesRatio: 7.6,
    startDate: '2025-12-01',
    endDate: '2026-09-30',
  }),
  contract('20260512000003', '2026-05-12', { contractAmount: 2310000000000, salesRatio: 9.4, startDate: '2026-06-01', endDate: '2027-05-31' }),
]

describe('공급계약 레일', () => {
  it('최근 1년만 최신순으로, 상대방이 사는 쪽이면 발주와 상대 매출액 대비를 쓴다', () => {
    const items = contractItems(rows, '2026-10-04')
    expect(items.map((i) => i.key)).toEqual(['20260930901249', '20260512000003', '20251120000002'])
    expect(items[0]).toEqual({
      key: '20260930901249',
      who: '위드텍',
      anon: false,
      ticker: '348350',
      date: '9월 30일',
      amount: '124억 원',
      sub: '발주 · 위드텍 매출액 대비 28.4% · 2025.10 ~ 2026.10 · 정정',
      url: 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260930901249',
    })
    expect(items[1]).toMatchObject({ who: '상대방 공개 안 함', anon: true, amount: '2.3조 원', sub: '수주 · 매출액 대비 9.4% · 2026.06 ~ 2027.05' })
    expect(items[2]).toMatchObject({ date: '2025년 11월 20일', amount: '1.7조 원', sub: '수주 · 매출액 대비 7.6% · 2025.12 ~ 2026.09' })
  })

  it('금액·비율·기간이 없으면 그 칸을 뺀다', () => {
    const [item] = contractItems([contract('1', '2026-09-01', { counterpartyName: '누리' })], '2026-10-04')
    expect(item).toMatchObject({ amount: '금액 공개 안 함', sub: '수주' })
  })

  it('캡션', () => {
    expect(contractsCaption(3)).toBe('단일판매·공급계약 공시 · 최근 1년 3건')
    expect(contractsCaption(0)).toBe('단일판매·공급계약 공시 · 최근 1년')
  })
})
