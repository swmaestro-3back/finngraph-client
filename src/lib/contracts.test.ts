import { describe, expect, it } from 'vitest'
import type { StockContractRes } from '@/lib/apiTypes'
import { formatContractPeriod, formatSalesRatio, ratioBarWidth, summarizeContracts } from '@/lib/contracts'

const row = (
  rceptDate: string,
  role: StockContractRes['role'],
  contractAmount: number | null,
  salesRatio: number | null,
): StockContractRes => ({
  rceptNo: rceptDate.replace(/-/g, '') + role,
  rceptDate,
  reportName: '단일판매ㆍ공급계약체결',
  role,
  contractType: null,
  contractName: null,
  counterpartyName: null,
  counterpartyTicker: null,
  contractAmount,
  salesRatio,
  startDate: null,
  endDate: null,
  link: '',
  isCorrection: false,
})

describe('summarizeContracts — 기준일 이전 365일 창, 수주(FILER)만 합산', () => {
  const rows = [
    row('2026-09-15', 'FILER', 3_222_000_000_00, 70.8),
    row('2026-03-01', 'FILER', 1_000_000_000_00, 12.5),
    row('2026-06-10', 'COUNTERPARTY', 9_999_999_999_99, 91.2),
    row('2025-08-01', 'FILER', 5_000_000_000_00, 40),
  ]

  it('창 안의 건수·수주 합계·최대 매출 비율을 계산한다', () => {
    const s = summarizeContracts(rows, '2026-09-18')
    expect(s.count).toBe(3)
    expect(s.wonCount).toBe(2)
    expect(s.wonAmount).toBe(4_222_000_000_00)
    expect(s.maxSalesRatio).toBe(70.8)
    expect(s.latestDate).toBe('2026-09-15')
  })

  it('기준일이 없으면 가장 최근 공시일을 기준으로 삼는다', () => {
    expect(summarizeContracts(rows, null).count).toBe(3)
  })

  it('빈 목록', () => {
    expect(summarizeContracts([], '2026-09-18')).toEqual({
      count: 0,
      wonCount: 0,
      wonAmount: 0,
      maxSalesRatio: null,
      latestDate: null,
    })
  })
})

describe('표시 헬퍼', () => {
  it('비율·기간·막대', () => {
    expect(formatSalesRatio(70.84)).toBe('70.8%')
    expect(formatSalesRatio(null)).toBe('—')
    expect(formatContractPeriod('2026-09-15', '2028-12-31')).toBe('2026-09 ~ 2028-12')
    expect(formatContractPeriod('2026-09-15', '2026-09-30')).toBe('2026-09')
    expect(formatContractPeriod(null, null)).toBeNull()
    expect(ratioBarWidth(150)).toBe(100)
    expect(ratioBarWidth(null)).toBe(0)
  })
})
