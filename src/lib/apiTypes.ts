export interface NewsRes {
  id: number
  title: string | null
  summary: string | null
  url: string | null
  originalUrl?: string | null
  publishedAt: string | null
  collectedAt: string | null
  tripleExtracted?: boolean | null
}

export interface ThemeTopStockRes {
  ticker: string
  name: string
}

export interface ThemeRes {
  id: number
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
  themeId: number | null
  themeName: string | null
}

export interface StockDetailRes {
  ticker: string
  name: string
  market: string
  price: number | null
  change: number | null
  themeId: number | null
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

export interface RelatedCompanyRes {
  companyName: string
  ticker: string | null
  market: string | null
  price: number | null
  change: number | null
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

export type CandlePeriod = 'D' | 'W' | 'M'

/**
 * 기간별 캔들 개수 — 일봉 6개월(≈120거래일). 백엔드 limit 상한은 500.
 * 주봉·월봉은 ETL 적재 이력(STOCK_PERIOD_LOOKBACK_DAYS=120, 2026-05-18~)에 맞춘 값이라
 * 백필 후에는 주봉 52(1년)·월봉 36(3년)으로 올린다.
 */
export const CANDLE_COUNTS: Record<CandlePeriod, number> = { D: 120, W: 18, M: 7 }

/** 투자자별 수급 조회 기간 — 백엔드는 거래일 개수(limit)만 받으므로 1개월 ≈ 20거래일로 환산한다 */
export type SupplyRange = '1M' | '3M' | '6M' | '1Y'

export const SUPPLY_RANGES: { key: SupplyRange; label: string; limit: number }[] = [
  { key: '1M', label: '1개월', limit: 20 },
  { key: '3M', label: '3개월', limit: 60 },
  { key: '6M', label: '6개월', limit: 120 },
  { key: '1Y', label: '1년', limit: 250 },
]

export const SUPPLY_RANGE_LIMITS: Record<SupplyRange, number> = Object.fromEntries(
  SUPPLY_RANGES.map((r) => [r.key, r.limit]),
) as Record<SupplyRange, number>

export interface Candle {
  open: number
  high: number
  low: number
  close: number
  volume: number
  label: string
}

export interface CandleDate {
  label: string
  date: string
}

export type Market = 'KOSPI' | 'KOSDAQ'

export interface NewsDetail {
  id: string
  title: string
  summary: string
  url: string
  collectedAt: string
  /** 트리플 추출 결과 관계가 있는 뉴스 — 상세 모달에 관계망이 그려진다. 응답에 없으면 null */
  tripleExtracted: boolean | null
}

export interface NewsItem {
  id: string
  title: string
  meta: string
  /** 원문 링크 — 미분석(tripleExtracted !== true) 뉴스는 상세 대신 이 링크로 바로 나간다 */
  url: string | null
  tripleExtracted: boolean | null
}

export type IssueKind = '호재' | '악재' | '중립'

export interface IssueNews extends NewsItem {
  kind: IssueKind
}

export interface IssueDay {
  label: string
  date: string
  good: number
  bad: number
  neutral: number
  items: IssueNews[]
}

export interface SupplyPoint {
  label: string
  foreignRatio: number | null
  foreignNet: number | null
  institutionNet: number | null
  individualNet: number | null
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

export type AuthProviderKind = 'EMAIL' | 'KAKAO'

export interface MeRes {
  nickname: string
  email: string | null
  provider: AuthProviderKind
  joinedAt: string
}

export interface AuthTokenRes {
  accessToken: string
  expiresIn: number
  isNewUser: boolean
  user: MeRes
}

export type FavoriteKind = 'STOCK' | 'THEME'

export interface FavoriteRes {
  type: FavoriteKind
  key: string
  createdAt: string
}

/** 목록 항목 — resolved=false면 ETL에서 사라진 대상이라 보강 필드가 비어 온다 */
export interface FavoriteItemRes {
  type: FavoriteKind
  key: string
  createdAt: string
  resolved: boolean
  stock: FavoriteStockRes | null
  theme: FavoriteThemeRes | null
}

export interface FavoriteStockRes {
  ticker: string
  name: string
  market: string
  price: number | null
  change: number | null
  marketCap: number | null
}

export interface FavoriteThemeRes {
  id: number
  name: string
  change: number | null
  baseDate: string | null
  stockCount: number
}

export interface FavoriteListRes {
  count: number
  limit: number
  items: FavoriteItemRes[]
}
