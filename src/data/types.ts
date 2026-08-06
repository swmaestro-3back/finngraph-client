import type { Market } from '@/data/stockMeta'

export interface ThemeCell {
  id: string
  name: string
  change: number
  size: number
}

export interface ThemeStock {
  code: string
  name: string
  market: Market
  price: number
  change: number
  tradingValue: number // 백만 단위
  marketCap: number // 억 단위
  reason: string
}

export interface ThemeNews {
  id: string
  title: string
  daysAgo: number
}

export interface AnnualFinancials {
  year: number
  estimated?: boolean
  revenue: number | null
  operatingProfit: number | null
  netIncome: number | null
  operatingMargin: number | null
  roe: number | null
  debtRatio: number | null
  totalAssets: number | null
  separateAssets: number | null
  totalEquity: number | null
  totalDebt: number | null
  eps: number | null
  per: number | null
  pbr: number | null
  dps: number | null
  payoutRatio: number | null
}
