import type { StockContractRes } from '@/lib/apiTypes'

export interface ContractSummary {
  count: number
  wonCount: number
  wonAmount: number
  maxSalesRatio: number | null
  latestDate: string | null
}

export const CONTRACT_WINDOW_DAYS = 365

function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d - days))
  return date.toISOString().slice(0, 10)
}

export function summarizeContracts(rows: StockContractRes[], asOf: string | null): ContractSummary {
  const latestDate = rows.reduce<string | null>(
    (latest, r) => (latest === null || r.rceptDate > latest ? r.rceptDate : latest),
    null,
  )
  const end = asOf ?? latestDate
  const start = end ? shiftDate(end, CONTRACT_WINDOW_DAYS) : null
  const recent = start ? rows.filter((r) => r.rceptDate >= start && r.rceptDate <= (end as string)) : rows
  const won = recent.filter((r) => r.role === 'FILER')
  const ratios = won.map((r) => r.salesRatio).filter((v): v is number => v !== null)
  return {
    count: recent.length,
    wonCount: won.length,
    wonAmount: won.reduce((sum, r) => sum + (r.contractAmount ?? 0), 0),
    maxSalesRatio: ratios.length ? Math.max(...ratios) : null,
    latestDate,
  }
}

export function formatSalesRatio(ratio: number | null): string {
  if (ratio === null) return '—'
  return `${ratio.toFixed(1)}%`
}

export function formatContractPeriod(start: string | null, end: string | null): string | null {
  const a = start ? start.slice(0, 7) : null
  const b = end ? end.slice(0, 7) : null
  if (a && b) return a === b ? a : `${a} ~ ${b}`
  return a ?? b
}

export function ratioBarWidth(ratio: number | null): number {
  if (ratio === null || ratio <= 0) return 0
  return Math.min(100, ratio)
}
