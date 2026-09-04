// finngraph-ai-server(kg-api) 응답 계약 — 서버 app/schemas.py와 1:1.
// 그래프는 (:Company)-[:SUPPLIES_TO]->(:Company), (:Company)-[:BELONGS_TO]->(:Theme) 두 관계만 가진다.
// 관계 타입은 응답에 없고 엔드포인트가 정한다 (공급망 → SUPPLIES_TO, 테마 → BELONGS_TO).

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

/** 공급 관계 — start(공급자) → end(수요자). 근거가 인라인이라 별도 상세 조회가 없다 */
export interface KgSupplyRelRes {
  id: string
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
  start: string
  end: string
  /** 해당 테마로 분류된 근거 */
  reason: string | null
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
