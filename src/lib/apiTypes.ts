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
