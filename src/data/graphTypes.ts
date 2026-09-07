export type EntityType = "company" | "theme" | "event";

export const LABEL_TO_TYPE: Record<string, EntityType> = {
  COMPANY: "company",
  THEME: "theme",
  EVENT: "event",
};

export type Predicate = "SUPPLIES_TO" | "ACQUIRES" | "INVESTS_IN" | "BELONGS_TO" | "HAS_EVENT";

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
    ticker?: string;
    market?: string;
    krx100?: boolean;
    krx300?: boolean;
    kosdaq150?: boolean;
    /** 이벤트(뉴스 클러스터) 전용 — 제목은 label에 있다 */
    clusterId?: number;
    keywords?: string[];
    /** 이벤트에 언급된 기업명 — 그래프 노드와는 이름으로만 맞춰 볼 수 있다 */
    companies?: string[];
    memberCount?: number;
    firstPublishedAt?: string;
    lastPublishedAt?: string;
    representativeNewsId?: number;
    [k: string]: unknown;
  };
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface EdgeItem {
  text: string;
  type: EntityType;
}

export interface NewsMention {
  news_id: string;
  item: string | null;
}

export interface DisclosureMention {
  rcept_no: string;
  item: string | null;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: Predicate;
  item?: EdgeItem | null;
  mentioned_count: number;
  news_id?: string;
  news_title?: string;
  news_url?: string;
  source_sentence?: string;
  timestamp?: string;
  is_negated?: boolean;
  tense?: "past_or_present_fact" | "future_or_planned";
  news_mention_count?: number;
  news?: NewsMention[];
  disclosure_count?: number;
  disclosures?: DisclosureMention[];
  first_mentioned_at?: string | null;
  last_mentioned_at?: string | null;
  reason?: string | null;
  value: number;
}

export type GraphSelection =
  | { kind: "node"; node: GraphNode }
  | { kind: "edge"; link: GraphLink; source: GraphNode; target: GraphNode };

export interface GraphScale {
  maxDegree: number;
  maxMentionedCount: number;
}

export function endId(v: string | GraphNode): string {
  return typeof v === "string" ? v : v.id;
}

/**
 * 이벤트 언급 간선인가. 근거가 쌓이는 관계가 아니라 "언급됐다"는 사실뿐이라
 * 점선으로 물러나 그리고, 클릭해도 보여줄 상세가 없으므로 선택 대상이 아니다.
 */
export function isEventLink(link: Pick<GraphLink, "type">): boolean {
  return link.type === "HAS_EVENT";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  metadata: {
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

export type NodeCategory = "kospi" | "kosdaq" | "theme" | "event";

export function marketCategory(market: string | null | undefined): NodeCategory {
  return market === "KOSDAQ" ? "kosdaq" : "kospi";
}

export function nodeCategory(node: Pick<GraphNode, "type" | "data">): NodeCategory {
  if (node.type === "event") return "event";
  return node.type === "theme" ? "theme" : marketCategory(node.data.market);
}

// 이벤트는 중성 회색 — 기업(빨강·파랑)·테마(보라) 옆에서 정보성 부속물로 물러난다
const PALETTES = {
  redGreen: { kospi: "#d96868", kosdaq: "#689d4b", theme: "#91ae6e", event: "#8a9099" },
  redBlue: { kospi: "#e07a7a", kosdaq: "#6f9bd1", theme: "#b08bc9", event: "#8a9099" },
} satisfies Record<string, Record<NodeCategory, string>>;

const ACTIVE_PALETTE: keyof typeof PALETTES = "redBlue";

export const CATEGORY_COLORS: Record<NodeCategory, string> = PALETTES[ACTIVE_PALETTE];

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  kospi: "KOSPI 기업",
  kosdaq: "KOSDAQ 기업",
  theme: "테마",
  event: "이벤트",
};

export const ALL_CATEGORIES: NodeCategory[] = ["kospi", "kosdaq", "theme", "event"];

export function nodeColor(node: Pick<GraphNode, "type" | "data">): string {
  return CATEGORY_COLORS[nodeCategory(node)];
}

export const PREDICATE_LABELS: Record<Predicate, string> = {
  SUPPLIES_TO: "공급",
  ACQUIRES: "인수",
  INVESTS_IN: "투자",
  BELONGS_TO: "테마 소속",
  HAS_EVENT: "이벤트",
};

export const ALL_ENTITY_TYPES: EntityType[] = ["company", "theme", "event"];

export const ALL_PREDICATES: Predicate[] = ["SUPPLIES_TO", "ACQUIRES", "INVESTS_IN", "BELONGS_TO", "HAS_EVENT"];
