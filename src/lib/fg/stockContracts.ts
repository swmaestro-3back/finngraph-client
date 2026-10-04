import type { StockContractRes } from '@/lib/apiTypes'
import { addDays } from '@/lib/calendar'
import { formatContractPeriod, formatSalesRatio } from '@/lib/contracts'
import { formatCompactKrw } from '@/lib/format'
import { monthDayLabel } from '@/lib/fg/themeCharts'

export const CONTRACT_WINDOW_DAYS = 365
export const CONTRACT_PREVIEW = 5
export const CONTRACT_FETCH_LIMIT = 200

const ANON = '상대방 공개 안 함'

export interface ContractItem {
  key: string
  who: string
  anon: boolean
  ticker: string | null
  date: string
  amount: string
  sub: string
  url: string
}

function ratioText(row: StockContractRes, who: string, anon: boolean): string | null {
  if (row.salesRatio === null) return null
  const ratio = formatSalesRatio(row.salesRatio)
  if (row.role === 'FILER') return `매출액 대비 ${ratio}`
  return `${anon ? '상대방' : who} 매출액 대비 ${ratio}`
}

export function contractItems(rows: readonly StockContractRes[], today: string): ContractItem[] {
  const start = addDays(today, -CONTRACT_WINDOW_DAYS)
  const refYear = Number(today.slice(0, 4))
  return rows
    .filter((row) => row.rceptDate >= start && row.rceptDate <= today)
    .sort((a, b) => b.rceptDate.localeCompare(a.rceptDate) || b.rceptNo.localeCompare(a.rceptNo))
    .map((row) => {
      const anon = row.counterpartyName === null
      const who = row.counterpartyName ?? ANON
      const period = formatContractPeriod(row.startDate, row.endDate)?.replaceAll('-', '.') ?? null
      const sub = [row.role === 'FILER' ? '수주' : '발주', ratioText(row, who, anon), period, row.isCorrection ? '정정' : null]
      return {
        key: row.rceptNo,
        who,
        anon,
        ticker: row.counterpartyTicker,
        date: monthDayLabel(row.rceptDate, refYear),
        amount: row.contractAmount === null ? '금액 공개 안 함' : `${formatCompactKrw(row.contractAmount)} 원`,
        sub: sub.filter((part): part is string => part !== null).join(' · '),
        url: row.link,
      }
    })
}

export function contractsCaption(count: number): string {
  return `단일판매·공급계약 공시 · 최근 1년${count > 0 ? ` ${count}건` : ''}`
}
