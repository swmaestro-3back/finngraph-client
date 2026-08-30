export interface NewsRes {
  id: number
  title: string | null
  summary: string | null
  link: string | null
  originallink?: string | null
  publishedAt: string | null
}

export interface ThemeTopStockRes {
  ticker: string
  name: string
}

export interface ThemeRes {
  name: string
  description: string | null
  change: number | null
  tradingValue: number | null
  w1: number | null
  m1: number | null
  m3: number | null
  marketCap: number | null
  stockCount: number
  topStocks: ThemeTopStockRes[]
}

export interface ThemeStockRes {
  ticker: string
  name: string
  market: string
  price: number | null
  change: number | null
  tradingValue: number | null
  marketCap: number | null
  reason: string | null
}

export interface CandleRes {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockRowRes {
  ticker: string
  name: string
  market: string
  price: number | null
  change: number | null
  w1: number | null
  m1: number | null
  m3: number | null
  marketCap: number | null
  per: number | null
  pbr: number | null
  roe: number | null
  dividendYield: number | null
  themeName: string | null
}

export interface StockDetailRes {
  ticker: string
  name: string
  market: string
  price: number | null
  change: number | null
  themeName: string | null
  marketCap: number | null
  per: number | null
  pbr: number | null
  roe: number | null
  eps: number | null
  dividendYield: number | null
  foreignRatio: number | null
  revenueGrowth: number | null
}

export interface InvestorFlowRes {
  date: string
  foreignNet: number | null
  institutionNet: number | null
  individualNet: number | null
  foreignRatio: number | null
}

export interface AnnualFinancialsRes {
  year: number
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
