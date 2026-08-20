// 기업 지식그래프 도메인 타입
// 엔티티(기업/국가/제품/원자재)와 삼중항 관계(11개 서술어)를 표현한다.

/** 엔티티(노드) 종류 */
export type EntityType = "company" | "country" | "product" | "commodity";

/** 원본 데이터의 라벨(대문자) → 내부 EntityType 매핑 */
export const LABEL_TO_TYPE: Record<string, EntityType> = {
  COMPANY: "company",
  COUNTRY: "country",
  PRODUCT: "product",
  COMMODITY: "commodity",
};

/** 관계(간선) 서술어 */
export type Predicate =
  | "DIVESTS_FROM"
  | "INVESTS_IN"
  | "PARTNERS_WITH"
  | "ACQUIRES"
  | "SUPPLIES_TO"
  | "EXPORTS_TO"
  | "LOCATED_IN"
  | "PRODUCES"
  | "COMPETES_WITH"
  | "DEVELOPS"
  | "SANCTIONS";

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  data: {
    description?: string;
    aliases?: string[];
    [k: string]: unknown;
  };
  // D3 simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

/** 삼중항의 중간 항목 (예: A가 B에게 '무엇을' 공급/수출) */
export interface EdgeItem {
  text: string;
  type: EntityType;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: Predicate;
  /** 삼중항 중간 항목 — 없을 수 있음 */
  item?: EdgeItem | null;
  /** 언급 횟수 — 간선 가중치(굵기)에 사용 */
  mentioned_count: number;
  /** 근거가 된 뉴스 식별자/제목 */
  news_id?: string;
  news_title?: string;
  /** 뉴스 원문 링크 — 백엔드가 주면 상세 패널에 '원문 보기' 버튼이 뜬다 */
  news_url?: string;
  /** 근거 문장 */
  source_sentence: string;
  timestamp: string;
  is_negated: boolean;
  tense: "past_or_present_fact" | "future_or_planned";
  /** 시뮬레이션 힘 계산용 가중치 (mentioned_count 기반) */
  value: number;
}

/** 사용자가 선택한 대상 — 노드 하나 또는 간선 하나 */
export type GraphSelection =
  | { kind: "node"; node: GraphNode }
  | { kind: "edge"; link: GraphLink; source: GraphNode; target: GraphNode };

/**
 * 상세 패널의 강도 게이지 기준값 — 그래프 전체를 훑어야 나오므로 상위에서 계산해 내려준다.
 * 개별 노드/간선은 자기 값만 알기 때문에 "전체 대비 얼마나 센가"를 스스로 알 수 없다.
 */
export interface GraphScale {
  /** 이웃이 가장 많은 노드의 이웃 수 */
  maxDegree: number;
  /** 가장 많이 언급된 간선의 언급 횟수 */
  maxMentionedCount: number;
}

/** 간선의 source/target은 시뮬레이션 전에는 id 문자열, 이후에는 노드 객체다 */
export function endId(v: string | GraphNode): string {
  return typeof v === "string" ? v : v.id;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  metadata: {
    center?: string;
    entity_types: EntityType[];
    predicate_types: Predicate[];
    stats: {
      total_nodes: number;
      total_edges: number;
    };
  };
}

/**
 * 엔티티 종류별 색 (데이터 인코딩). 브랜드 블루를 중심 엔티티(기업)에 앵커링.
 * 캔버스 렌더라 var() 대신 리터럴 — 값은 index.css 토큰과 1:1로 동기화한다 (graphTheme.ts와 같은 계약).
 */
export const NODE_COLORS: Record<EntityType, string> = {
  /** --primary */
  company: "#0052ff", // 브랜드 블루 — 기업
  /** --chart-1 */
  product: "#1f897d", // 틸 — 제품
  /** --chart-5 */
  commodity: "#f4b000", // 액센트 옐로 — 원자재
  /** --chart-3 */
  country: "#874ef5", // 바이올렛 — 국가
};

/**
 * 노드 안에 얹는 라벨 색 — 채움색 위에서 읽히도록 대비를 맞춘다.
 * 옐로(원자재) 위 흰 글자는 대비가 2:1 수준이라 어두운 글자를 쓴다.
 */
export const NODE_TEXT_COLORS: Record<EntityType, string> = {
  company: "#ffffff",
  product: "#ffffff",
  commodity: "#0a0b0d",
  country: "#ffffff",
};

/** 엔티티 종류 한글 라벨 */
export const ENTITY_LABELS: Record<EntityType, string> = {
  company: "기업",
  country: "국가",
  product: "제품",
  commodity: "원자재",
};

/** 서술어 한글 라벨 */
export const PREDICATE_LABELS: Record<Predicate, string> = {
  DIVESTS_FROM: "매각",
  INVESTS_IN: "투자",
  PARTNERS_WITH: "협력",
  ACQUIRES: "인수",
  SUPPLIES_TO: "공급",
  EXPORTS_TO: "수출",
  LOCATED_IN: "위치",
  PRODUCES: "생산",
  COMPETES_WITH: "경쟁",
  DEVELOPS: "개발",
  SANCTIONS: "제재",
};

export const ALL_ENTITY_TYPES: EntityType[] = [
  "company",
  "product",
  "commodity",
  "country",
];

export const ALL_PREDICATES: Predicate[] = [
  "PRODUCES",
  "SUPPLIES_TO",
  "DEVELOPS",
  "PARTNERS_WITH",
  "COMPETES_WITH",
  "INVESTS_IN",
  "ACQUIRES",
  "DIVESTS_FROM",
  "EXPORTS_TO",
  "LOCATED_IN",
  "SANCTIONS",
];
