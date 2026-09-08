// finngraph-ai-server(kg-api) 응답 계약 — 서버 app/schemas.py와 1:1.
// 노드는 Company·Theme·Event, 관계는 SUPPLIES_TO / ACQUIRES / INVESTS_IN(기업→기업), BELONGS_TO(기업→테마),
// HAS_EVENT(기업→이벤트). 관계 응답에는 type 필드가 실려 온다.
// 단, /supplychain은 Cypher가 SUPPLIES_TO만 따라가므로 인수·투자는 /companies/{ticker}(개요)에서만 나온다.

/** 상장 시장 — `market` 쿼리 파라미터 값 */
export type KgMarket = 'KOSPI' | 'KOSDAQ'
/** 지수 구성종목 — `index` 쿼리 파라미터 값. market과 함께 보내면 서버가 400을 준다 */
export type KgMarketIndex = 'krx100' | 'krx300' | 'kosdaq150'

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
}

export interface KgThemeNode {
  id: string
  name: string | null
  description: string | null
  source_theme_id: number | null
}

export interface KgNewsMention {
  news_id: string
  /** 뉴스에서 추출된 품목/근거 문구 */
  item: string | null
}

export interface KgDisclosureMention {
  /** DART 접수번호 */
  rcept_no: string
  /** 공시 항목명 */
  item: string | null
}

/** 기업→기업 관계 타입 — 공급망 응답은 SUPPLIES_TO만, 개요 응답은 셋 다 */
export type KgSupplyRelType = 'SUPPLIES_TO' | 'ACQUIRES' | 'INVESTS_IN'

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

/** 이벤트(뉴스 클러스터) 노드 */
export interface KgEventNode {
  id: string
  /** 뉴스 클러스터 id */
  cluster_id: number | null
  title: string | null
  keywords: string[]
  /** 이벤트에 언급된 기업명 */
  companies: string[]
  news_ids: number[]
  representative_news_id: number | null
  /** 정제 후 남은 뉴스 건수 */
  member_count: number | null
  original_size: number | null
  first_published_at: string | null
  last_published_at: string | null
  titled_at: string | null
  synced_at: string | null
}

/** 기업이 이벤트에 언급됨 — start(기업) → end(이벤트). 근거 필드가 없다 */
export interface KgHasEventRelRes {
  id: string
  type: 'HAS_EVENT'
  start: string
  end: string
}

export type KgCompanyRelRes = KgSupplyRelRes | KgBelongsToRelRes | KgHasEventRelRes

/** GET /v1/companies/{ticker} — 중심 기업의 1홉 전체. center 필드는 없다 */
export interface KgCompanyRes {
  companies: KgCompanyNode[]
  themes: KgThemeNode[]
  events: KgEventNode[]
  relationships: KgCompanyRelRes[]
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
