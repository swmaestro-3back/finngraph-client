// finngraph-ai-server(kg-api) 응답 계약 — 서버 app/schemas.py와 1:1.
// 노드는 Company·Theme·Event, 관계는 SUPPLIES_TO / ACQUIRES / INVESTS_IN(기업→기업), BELONGS_TO(기업→테마),
// HAS_EVENT(기업→이벤트). 관계 응답에는 type 필드가 실려 온다.
// 단, /supplychain은 Cypher가 SUPPLIES_TO만 따라가므로 인수·투자는 /companies/{ticker}(개요)에서만 나온다.

/** 상장 시장 — `market` 쿼리 파라미터 값 */
export type KgMarket = 'KOSPI' | 'KOSDAQ'
/** 지수 구성종목 — `index` 쿼리 파라미터 값. market과 함께 보내면 서버가 400을 준다 */
export type KgMarketIndex = 'krx100' | 'krx300' | 'kosdaq150'

/** 종목 시세 — 최신 일봉·밸류에이션. 등락·수익률 단위는 % */
export interface KgStockQuote {
  price: number | null
  change: number | null
  market_cap: number | null
  r_1w: number | null
  r_1m: number | null
  r_3m: number | null
  /** 기준 거래일 YYYY-MM-DD */
  price_date: string | null
}

/** 테마 지수 시세 — 가격 대신 지수 등락. 시가총액은 소속 종목 합 */
export interface KgThemeQuote {
  change: number | null
  market_cap: number | null
  r_1w: number | null
  r_1m: number | null
  r_3m: number | null
  price_date: string | null
}

export interface KgCompanyNode {
  /** Neo4j element_id — 렌더링 키 */
  id: string
  ticker: string | null
  name: string | null
  market: string | null
  country: string | null
  is_listed: boolean | null
  company_id: number | null
  /** DART 고유번호 */
  corp_code: string | null
  krx100: boolean
  krx300: boolean
  kosdaq150: boolean
  /** 그래프 응답만 채운다 — 뉴스 그래프 등은 null */
  quote?: KgStockQuote | null
}

export interface KgThemeNode {
  id: string
  name: string | null
  description: string | null
  /** Postgres themes.id — 테마 상세 링크 */
  theme_id: number | null
  quote?: KgThemeQuote | null
}

interface KgNewsMention {
  news_id: string
  /** 뉴스에서 추출된 품목/근거 문구 */
  item: string | null
}

interface KgDisclosureMention {
  /** DART 접수번호 */
  rcept_no: string
  /** 공시 항목명 */
  item: string | null
}

/** 기업→기업 관계 타입 — 공급망 응답은 SUPPLIES_TO만, 개요 응답은 셋 다 */
type KgSupplyRelType = 'SUPPLIES_TO' | 'ACQUIRES' | 'INVESTS_IN'

/** 기업→기업 관계 — start(공급자/인수자/투자자) → end. 근거가 인라인이라 별도 상세 조회가 없다 */
export interface KgSupplyRelRes {
  id: string
  type: KgSupplyRelType
  start: string
  end: string
  news_mention_count: number
  news: KgNewsMention[]
  disclosure_count: number
  disclosures: KgDisclosureMention[]
  first_mentioned_at: string | null
  last_mentioned_at: string | null
}

/** 테마 소속 — start(기업) → end(테마) */
export interface KgBelongsToRelRes {
  id: string
  type: 'BELONGS_TO'
  start: string
  end: string
  /** 해당 테마로 분류된 근거 */
  reason: string | null
}

/** 이벤트(뉴스 클러스터) 노드 — 기사 목록·관련 기업은 GET /v1/events/{cluster_id} */
export interface KgEventNode {
  id: string
  /** 뉴스 클러스터 id */
  cluster_id: number | null
  title: string | null
  keywords: string[]
  representative_news_id: number | null
  /** 정제 후 남은 뉴스 건수 */
  member_count: number | null
  first_published_at: string | null
  last_published_at: string | null
}

/** 기업이 이벤트에 언급됨 — start(기업) → end(이벤트). 근거 필드가 없다 */
export interface KgHasEventRelRes {
  id: string
  type: 'HAS_EVENT'
  start: string
  end: string
}

/**
 * GET /v1/news/{news_id}/graph?hop= — 뉴스 한 건을 근거로 추출된 기업 간 관계(시드)와 hop 확장.
 * 테마·이벤트는 오지 않는다. seed_* 로 기사에서 온 것과 확장으로 딸려온 것을 나눈다.
 */
export interface KgNewsGraphRes {
  companies: KgCompanyNode[]
  relationships: KgSupplyRelRes[]
  /** 이 뉴스를 근거로 가진 관계 id */
  seed_relationship_ids: string[]
  /** 시드 관계의 양끝 기업 id — 기사에 등장한 기업 */
  seed_company_ids: string[]
  /** 서버 노드 상한에 걸려 확장 이웃 일부를 버렸는가 */
  truncated: boolean
}

export type KgCompanyRelRes = KgSupplyRelRes | KgHasEventRelRes

/**
 * GET /v1/companies/{ticker} — 중심 기업의 1홉 이웃(기업·이벤트). center 필드는 없다.
 * 테마(BELONGS_TO)는 빠진다 — /companies/{ticker}/themes 가 따로 책임진다.
 */
export interface KgCompanyRes {
  companies: KgCompanyNode[]
  events: KgEventNode[]
  relationships: KgCompanyRelRes[]
}

/** GET /v1/companies/{ticker}/themes — 중심 기업 + 소속 테마 */
export interface KgCompanyThemesRes {
  company: KgCompanyNode
  themes: KgThemeNode[]
  relationships: KgBelongsToRelRes[]
}

/** GET /v1/companies/{ticker}/events — 기업과 이벤트가 번갈아 나오는 서브그래프 */
export interface KgCompanyEventsRes {
  companies: KgCompanyNode[]
  events: KgEventNode[]
  relationships: KgHasEventRelRes[]
}

/** GET /v1/companies/{ticker}/supplychain — 중심 기업을 포함한 경로상의 모든 기업. center 필드는 없다 */
export interface KgSupplyChainRes {
  companies: KgCompanyNode[]
  relationships: KgSupplyRelRes[]
}

/** GET /v1/themes/{name} — 테마 노드 + 소속 기업(테마주) */
export interface KgThemeRes {
  theme: KgThemeNode
  companies: KgCompanyNode[]
  relationships: KgBelongsToRelRes[]
}

/** 목록 한 줄에 필요한 기사 정보 */
export interface KgNewsBrief {
  news_id: string
  title: string | null
  url: string | null
  original_url: string | null
  published_at: string | null
}

export interface KgEvidenceNews extends KgNewsBrief {
  /** 이 기사에서 뽑힌 품목 문구 */
  items: string[]
}

/** GET /v1/relationships/{element_id}/evidence?limit= — 간선 근거 */
export interface KgRelationshipEvidenceRes {
  /** 최신순 limit건 */
  news: KgEvidenceNews[]
  /** 근거 기사 전체 수 */
  news_total: number
  /** 오래된 달부터. 기사 없는 달은 빠져 있다 */
  monthly: { month: string; count: number }[]
  disclosures: { rcept_no: string; report_nm: string | null; rcept_dt: string | null; item: string | null }[]
}

export interface KgEventCompany {
  name: string
  ticker: string | null
  quote: KgStockQuote | null
}

/** GET /v1/events/{cluster_id}?limit= — 이벤트 상세. news는 분석된 기사만 최신순 */
export interface KgEventDetailRes {
  cluster_id: number
  title: string | null
  keywords: string[]
  member_count: number | null
  representative_news_id: number | null
  first_published_at: string | null
  last_published_at: string | null
  news: KgNewsBrief[]
  /** 분석 여부와 무관한 클러스터 전체 기사 수 */
  news_total: number
  companies: KgEventCompany[]
}
