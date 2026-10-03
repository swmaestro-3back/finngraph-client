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

interface ThemeTopStockRes {
  ticker: string
  name: string
}

interface ThemeLeaderRes {
  ticker: string
  name: string
  change: number | null
}

type ThemeHotSide = 'UP' | 'DOWN'

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
  baseDate?: string | null
  valuationDate?: string | null
  pricedCount?: number
  upCount?: number
  downCount?: number
  flatCount?: number
  suspendedCount?: number
  trimCount?: number
  meanChange?: number | null
  changeLower?: number | null
  changeUpper?: number | null
  sensitivity?: number | null
  w1Count?: number
  m1Count?: number
  m3Count?: number
  leaders?: ThemeLeaderRes[]
  sources?: string[]
  hotSide?: ThemeHotSide | null
  avgTradingValue?: number | null
  tradingValueRatio?: number | null
}

export type ThemeStockChangeStatus =
  | 'PRICED'
  | 'TRIMMED'
  | 'SUSPENDED'
  | 'DELISTING'
  | 'NO_CANDLE'
  | 'NO_PREV'

export interface ThemeStockRes {
  ticker: string
  name: string
  market: string
  price: number | null
  change: number | null
  tradingValue: number | null
  marketCap: number | null
  reason: string | null
  changeStatus?: ThemeStockChangeStatus
  tradingSuspended?: boolean
  underAdministration?: boolean
  delistingTrade?: boolean
}

export interface ThemeMarketRes {
  baseDate: string | null
  pricedCount: number
  upCount: number
  downCount: number
  flatCount: number
  medianChange: number | null
  upRatio: number | null
  downRatio: number | null
  coverage: number | null
  valuationDate?: string | null
  updatedAt?: string | null
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
  description: string | null
  descriptionSource: string | null
  descriptionRceptNo: string | null
  baseDate?: string | null
  valuationDate?: string | null
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
 * 기간별 캔들 개수 — 일봉 6개월(≈120거래일)·주봉 1년·월봉 3년. 백엔드 limit 상한은 500.
 * 길게 볼수록 봉을 굵게 — 상장이 짧은 종목은 백엔드가 더 적게 줄 수 있다.
 */
export const CANDLE_COUNTS: Record<CandlePeriod, number> = { D: 120, W: 52, M: 36 }

/** 캔들 기간 칩 — 종목 상세 차트와 테마 이슈 타임라인이 같은 순서·문구를 쓴다 */
export const CANDLE_PERIODS: { key: CandlePeriod; label: string; chartLabel: string }[] = [
  { key: 'D', label: '1일', chartLabel: '일봉' },
  { key: 'W', label: '1주', chartLabel: '주봉' },
  { key: 'M', label: '1달', chartLabel: '월봉' },
]

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

type AuthProviderKind = 'EMAIL' | 'KAKAO'

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

/** @public */
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

interface FavoriteStockRes {
  ticker: string
  name: string
  market: string
  price: number | null
  change: number | null
  marketCap: number | null
}

interface FavoriteThemeRes {
  id: number
  name: string
  change: number | null
  baseDate: string | null
  stockCount: number
  pricedCount?: number
}

export interface FavoriteListRes {
  count: number
  limit: number
  items: FavoriteItemRes[]
}

type ContractRole = 'FILER' | 'COUNTERPARTY'

export interface StockContractRes {
  rceptNo: string
  rceptDate: string
  reportName: string
  role: ContractRole
  contractType: string | null
  contractName: string | null
  counterpartyName: string | null
  counterpartyTicker: string | null
  contractAmount: number | null
  salesRatio: number | null
  startDate: string | null
  endDate: string | null
  link: string
  isCorrection: boolean
}

export interface RecentContractRes {
  rceptNo: string
  rceptDate: string
  reportName: string
  filerTicker: string | null
  filerName: string
  filerMarket: string | null
  contractType: string | null
  contractName: string | null
  counterpartyName: string | null
  counterpartyTicker: string | null
  contractAmount: number | null
  salesRatio: number | null
  startDate: string | null
  endDate: string | null
  link: string
  isCorrection: boolean
}

export type CitationType = 'NEWS' | 'DISCLOSURE' | 'RELATION' | 'CLUSTER'

export interface CitationRes {
  type: CitationType
  id: string
  label: string
  url: string | null
}

interface BriefingSentenceRes {
  text: string
  citations: CitationRes[]
}

export interface BriefingHeadlineRes {
  text: string
  citations: CitationRes[]
}

interface BriefingStockRes {
  ticker: string
  name: string
  market: string | null
  change: number | null
}

interface BriefingStockRefRes {
  ticker: string
  name: string
}

interface BriefingArticleRes {
  newsId: number
  title: string
  url: string | null
  publishedAt: string | null
}

export interface BriefingIssueRes {
  clusterId: number
  title: string
  keywords: string[]
  newsCount: number
  firstPublishedAt: string
  lastPublishedAt: string
  stocks: BriefingStockRes[]
  articles: BriefingArticleRes[]
  commentary: { sentences: BriefingSentenceRes[] } | null
}

interface BriefingLeaderRes {
  ticker: string
  name: string
  change: number
}

interface BriefingThemeRes {
  id: number
  name: string
  change: number | null
  hotSide: ThemeHotSide
  stockCount: number
  pricedCount: number
  upCount: number
  downCount: number
  flatCount: number
  leaders: BriefingLeaderRes[]
}

export type WatchKind = 'CORRECTION' | 'CONTRACT_END' | 'PLANNED_RELATION' | 'ISSUE_SPREAD'

export interface WatchPointRes {
  kind: WatchKind
  text: string
  citations: CitationRes[]
  stocks: BriefingStockRefRes[]
}

export type RiskKind =
  | 'ADMINISTRATION_NEW'
  | 'SUSPENDED_NEW'
  | 'DELISTING_NEW'
  | 'CORRECTION'
  | 'RELATION_DENIED'
  | 'RELATION_TERMINATED'
  | 'SANCTION'

export interface RiskRes {
  kind: RiskKind
  ticker: string
  name: string
  market: string | null
  detail: string
  source: CitationRes | null
}

export interface RelationPartyRes {
  name: string
  ticker: string | null
}

export interface RelationLineRes {
  id: number
  subject: RelationPartyRes
  relation: string
  object: RelationPartyRes
  item: string | null
  polarity: string
  tense: string
  subjectImpact: string | null
  objectImpact: string | null
  sourceSentence: string | null
  source: CitationRes
}

export interface AnalyzedNewsRes {
  newsId: number
  title: string
  url: string | null
  publishedAt: string | null
  summary: string | null
  companies: BriefingStockRes[]
  relationCount: number
  relations: RelationLineRes[] | null
}

interface RelationGraphNodeRes {
  id: string
  name: string
  ticker: string | null
  market: string | null
  change: number | null
}

interface RelationGraphEdgeRes {
  id: string
  source: string
  target: string
  relation: string
  item: string | null
  polarity: string
  tense: string
  mentionedCount: number
  sources: CitationRes[]
}

export interface RelationGraphRes {
  nodes: RelationGraphNodeRes[]
  edges: RelationGraphEdgeRes[]
}

export interface BriefingLockedRes {
  commentaries: number
  watchPoints: number
  risks: number
  relations: number
  graphEdges: number
}

export type BriefingStatus = 'READY' | 'PARTIAL'

export interface BriefingRes {
  baseDate: string
  previousTradingDate: string | null
  generatedAt: string
  status: BriefingStatus
  promptVersion: string
  market: ThemeMarketRes
  headline: BriefingHeadlineRes | null
  issues: BriefingIssueRes[]
  themes: BriefingThemeRes[]
  watchPoints: WatchPointRes[] | null
  risks: RiskRes[] | null
  analyzedNews: AnalyzedNewsRes[]
  relationGraph: RelationGraphRes | null
  locked: BriefingLockedRes | null
}

export interface BriefingSummaryRes {
  baseDate: string
  status: BriefingStatus
  generatedAt: string
  headline: string | null
}

export type CalendarEventKind =
  | 'DIV_EX'
  | 'DIV_RECORD'
  | 'DIV_PAY'
  | 'BONUS_EX'
  | 'BONUS_LIST'
  | 'RIGHTS_EX'
  | 'RIGHTS_SUBSCRIBE'
  | 'RIGHTS_LIST'
  | 'AGM'

export interface CalendarEventRes {
  date: string
  kind: CalendarEventKind
  ticker: string
  stockName: string
  endDate: string | null
  amount: number | null
  ratio: number | null
  label: string | null
  agenda: string[]
  agendaTruncated: boolean
  estimated: boolean
  favorite: boolean
}

export interface CalendarRes {
  from: string
  to: string
  asOf: string | null
  closedDates: string[]
  events: CalendarEventRes[]
}

export type IpoStatus = 'FILED' | 'UPCOMING' | 'SUBSCRIBING' | 'LISTING_PENDING' | 'LISTED'

export type IpoPriceBasis = 'CONFIRMED' | 'PLANNED'

export interface IpoRes {
  ticker: string | null
  corpCode: string | null
  name: string
  status: IpoStatus
  spac: boolean
  subscrStart: string
  subscrEnd: string
  offerPrice: number | null
  priceBasis: IpoPriceBasis
  leadManagers: string | null
  payDate: string | null
  refundDate: string | null
  listingDate: string | null
}

export interface IpoListRes {
  asOf: string | null
  offerings: IpoRes[]
}

export interface IpoScheduleRes {
  subscrStart: string | null
  subscrEnd: string | null
  payDate: string | null
  refundDate: string | null
  listingDate: string | null
}

export interface IpoUnderwriterRes {
  name: string
  role: string | null
  shares: number | null
  amount: number | null
  method: string | null
}

export interface IpoFundUseRes {
  purpose: string
  amount: number
  share: number | null
}

export interface IpoSellerRes {
  holder: string
  relation: string | null
  before: number | null
  sold: number | null
  after: number | null
}

export interface IpoPutbackRes {
  reason: string | null
  investors: string | null
  shares: string | null
  period: string | null
  price: string | null
}

export interface IpoOfferingRes {
  price: number | null
  priceBasis: IpoPriceBasis
  shares: number | null
  amount: number | null
  method: string | null
  underwriters: IpoUnderwriterRes[] | null
  fundUses: IpoFundUseRes[] | null
  fundUsesWithheld: boolean
  sellers: IpoSellerRes[] | null
  oldShareRatio: number | null
  putback: IpoPutbackRes | null
}

export interface IpoCompanyRes {
  ceo: string | null
  establishedOn: string | null
  address: string | null
  homepage: string | null
  description: string | null
  descriptionSource: string | null
  descriptionRceptNo: string | null
}

export interface IpoAfterListingRes {
  listingDate: string
  open: number
  close: number
  openReturn: number | null
  closeReturn: number | null
  price: number | null
  currentReturn: number | null
  priceDate: string | null
}

export interface IpoFilingRes {
  firstRceptNo: string
  latestRceptNo: string
  latestReportName: string
}

export interface IpoDetailRes {
  corpCode: string | null
  ticker: string | null
  name: string
  status: IpoStatus
  spac: boolean
  schedule: IpoScheduleRes
  offering: IpoOfferingRes
  company: IpoCompanyRes | null
  afterListing: IpoAfterListingRes | null
  filing: IpoFilingRes | null
  asOf: string | null
}

export type CalendarFamily = 'DIV' | 'BONUS' | 'RIGHTS' | 'AGM'

export interface ActionStepRes {
  kind: CalendarEventKind
  date: string
  endDate: string | null
  estimated: boolean
}

export interface AgendaItemRes {
  text: string
  tags: string[]
}

export type DpsBasis = 'CURRENT' | 'PREVIOUS'

export interface DividendMetricsRes {
  dps: number | null
  dpsBasis: DpsBasis | null
  expectedYield: number | null
}

export type ExPriceBasis = 'PREVIOUS_CLOSE' | 'CURRENT_PRICE'

export interface ExPriceRes {
  theoretical: number | null
  basis: ExPriceBasis
  actualOpen: number | null
}

export interface RightsMetricsRes {
  dilution: number | null
  issuePrice: number | null
  priceVsIssue: number | null
  exPrice: ExPriceRes
}

export interface BonusMetricsRes {
  exPrice: ExPriceRes
  returnAfter5: number | null
  returnAfter20: number | null
}

export interface CorporateActionRes {
  family: CalendarFamily
  label: string | null
  basisDate: string
  lastBuyDate: string
  lastBuyEstimated: boolean
  steps: ActionStepRes[]
  amount: number | null
  ratio: number | null
  agenda: AgendaItemRes[]
  agendaTruncated: boolean
  dividend: DividendMetricsRes | null
  rights: RightsMetricsRes | null
  bonus: BonusMetricsRes | null
}

export interface StockCalendarRes {
  ticker: string
  stockName: string
  market: string
  price: number | null
  change: number | null
  priceDate: string | null
  from: string
  to: string
  asOf: string | null
  actions: CorporateActionRes[]
}

export interface DividendReactionRes {
  recordDate: string
  kind: string
  dps: number
  exDate: string
  prevClose: number
  exOpen: number
  theoreticalDrop: number
  openGap: number
  recoveryDays: number | null
  pending: boolean
}
