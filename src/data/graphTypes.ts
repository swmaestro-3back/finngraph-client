export type EntityType = "company" | "theme";

export const LABEL_TO_TYPE: Record<string, EntityType> = {
  COMPANY: "company",
  THEME: "theme",
};

export type Predicate = "SUPPLIES_TO" | "BELONGS_TO";

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

export type NodeCategory = "kospi" | "kosdaq" | "theme";

export function marketCategory(market: string | null | undefined): NodeCategory {
  return market === "KOSDAQ" ? "kosdaq" : "kospi";
}

export function nodeCategory(node: Pick<GraphNode, "type" | "data">): NodeCategory {
  return node.type === "theme" ? "theme" : marketCategory(node.data.market);
}

const PALETTES = {
  redGreen: { kospi: "#d96868", kosdaq: "#689d4b", theme: "#91ae6e" },
  redBlue: { kospi: "#e07a7a", kosdaq: "#6f9bd1", theme: "#b08bc9" },
} satisfies Record<string, Record<NodeCategory, string>>;

const ACTIVE_PALETTE: keyof typeof PALETTES = "redBlue";

export const CATEGORY_COLORS: Record<NodeCategory, string> = PALETTES[ACTIVE_PALETTE];

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  kospi: "KOSPI 기업",
  kosdaq: "KOSDAQ 기업",
  theme: "테마",
};

export const ALL_CATEGORIES: NodeCategory[] = ["kospi", "kosdaq", "theme"];

export function nodeColor(node: Pick<GraphNode, "type" | "data">): string {
  return CATEGORY_COLORS[nodeCategory(node)];
}

export const PREDICATE_LABELS: Record<Predicate, string> = {
  SUPPLIES_TO: "공급",
  BELONGS_TO: "테마 소속",
};

export const ALL_ENTITY_TYPES: EntityType[] = ["company", "theme"];

export const ALL_PREDICATES: Predicate[] = ["SUPPLIES_TO", "BELONGS_TO"];
