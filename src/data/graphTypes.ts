// 지식그래프 도메인 타입
// kg-api가 주는 그래프는 기업(Company)·테마(Theme) 두 노드와
// 공급(SUPPLIES_TO)·테마 소속(BELONGS_TO) 두 관계로만 이루어진다.

/** 엔티티(노드) 종류 */
export type EntityType = "company" | "theme";

/** 원본 데이터의 라벨(대문자) → 내부 EntityType 매핑 (데모 시드 데이터용) */
export const LABEL_TO_TYPE: Record<string, EntityType> = {
  COMPANY: "company",
  THEME: "theme",
};

/** 관계(간선) 서술어 */
export type Predicate = "SUPPLIES_TO" | "BELONGS_TO";

/** 그래프의 원점 — 기업은 티커로 공급망을, 테마는 이름으로 소속 기업을 조회한다 */
export type GraphFocus =
  | { kind: "company"; ticker: string }
  | { kind: "theme"; name: string };

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  data: {
    description?: string;
    aliases?: string[];
    /** 기업 노드 — 종목 코드와 상장 시장(KOSPI/KOSDAQ) */
    ticker?: string;
    market?: string;
    /** 기업 노드 — 지수 편입 여부 */
    krx100?: boolean;
    krx300?: boolean;
    kosdaq150?: boolean;
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

/** 트리플의 중간 항목 (예: A가 B에게 '무엇을' 공급/수출) */
export interface EdgeItem {
  text: string;
  type: EntityType;
}

/** 관계의 근거 뉴스 한 건 */
export interface NewsMention {
  news_id: string;
  /** 뉴스에서 추출된 품목/근거 문구 */
  item: string | null;
}

/** 관계의 근거 공시 한 건 */
export interface DisclosureMention {
  /** DART 접수번호 */
  rcept_no: string;
  /** 공시 항목명 */
  item: string | null;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: Predicate;
  /** 트리플 중간 항목 — 없을 수 있음 */
  item?: EdgeItem | null;
  /** 언급 횟수 — 간선 가중치(굵기)에 사용 */
  mentioned_count: number;
  /** 근거가 된 뉴스 식별자/제목 */
  news_id?: string;
  news_title?: string;
  /** 뉴스 원문 링크 — 백엔드가 주면 상세 패널에 '원문 보기' 버튼이 뜬다 */
  news_url?: string;
  /** 근거 문장 */
  source_sentence?: string;
  timestamp?: string;
  is_negated?: boolean;
  tense?: "past_or_present_fact" | "future_or_planned";
  /** 근거 뉴스 건수·목록 — kg-api 공급망 관계(SUPPLIES_TO)에만 있다 */
  news_mention_count?: number;
  news?: NewsMention[];
  /** 근거 공시 건수·목록 — 공급망 관계에만 있다 */
  disclosure_count?: number;
  disclosures?: DisclosureMention[];
  first_mentioned_at?: string | null;
  last_mentioned_at?: string | null;
  /** 테마로 분류된 근거 — 테마 소속 관계(BELONGS_TO)에만 있다 */
  reason?: string | null;
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
    /** 중심 노드의 라벨(표시용)과 id(캔버스 강조·재중심 판정용) */
    center?: string;
    centerId?: string;
    entity_types: EntityType[];
    predicate_types: Predicate[];
    stats: {
      total_nodes: number;
      total_edges: number;
    };
  };
}

/**
 * 노드의 시각 분류 — 색·범례·종류 필터의 단위.
 * 기업은 상장 시장으로 갈리고 테마는 그대로다. 종류(EntityType)는 도메인 의미를,
 * 분류(NodeCategory)는 화면에서 어떻게 보이는지를 맡는다.
 */
export type NodeCategory = "kospi" | "kosdaq" | "theme";

/** 시장 문자열 → 기업 분류. 시장 정보가 없으면 KOSPI 색으로 그린다 */
export function marketCategory(market: string | null | undefined): NodeCategory {
  return market === "KOSDAQ" ? "kosdaq" : "kospi";
}

export function nodeCategory(node: Pick<GraphNode, "type" | "data">): NodeCategory {
  return node.type === "theme" ? "theme" : marketCategory(node.data.market);
}

/**
 * 분류별 색 (데이터 인코딩). 브랜드 블루를 KOSPI 기업에 앵커링하고 KOSDAQ은 틸로 갈라 놓는다.
 * 캔버스 렌더라 var() 대신 리터럴 — 값은 index.css 토큰과 1:1로 동기화한다 (graphTheme.ts와 같은 계약).
 */
export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  /** --primary */
  kospi: "#0052ff",
  /** --chart-1 */
  kosdaq: "#1f897d",
  /** --chart-4 */
  theme: "#f6657a",
};

/** 노드 안에 얹는 라벨 색 — 세 채움색 모두 흰 글자가 읽힌다 */
export const NODE_LABEL_COLOR = "#ffffff";

/** 분류 한글 라벨 */
export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  kospi: "KOSPI 기업",
  kosdaq: "KOSDAQ 기업",
  theme: "테마",
};

export const ALL_CATEGORIES: NodeCategory[] = ["kospi", "kosdaq", "theme"];

export function nodeColor(node: Pick<GraphNode, "type" | "data">): string {
  return CATEGORY_COLORS[nodeCategory(node)];
}

/** 서술어 한글 라벨 */
export const PREDICATE_LABELS: Record<Predicate, string> = {
  SUPPLIES_TO: "공급",
  BELONGS_TO: "테마 소속",
};

export const ALL_ENTITY_TYPES: EntityType[] = ["company", "theme"];

export const ALL_PREDICATES: Predicate[] = ["SUPPLIES_TO", "BELONGS_TO"];
