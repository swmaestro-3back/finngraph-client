export interface KgGraphNodeRes {
  id: string
  labels: string[]
  properties: Record<string, unknown>
}

export interface KgGraphRelRes {
  id: string
  type: string
  start: string
  end: string
  mention_count: number | null
}

export interface KgGraphRes {
  center: string
  nodes: KgGraphNodeRes[]
  relationships: KgGraphRelRes[]
}

export interface KgNewsGraphRes extends KgGraphRes {
  seed_relationship_ids: string[]
}

export interface KgRelationshipDetailRes {
  id: string
  type: string
  start: string
  end: string
  news_ids: string[]
  source_sentences: string[]
  mentioned_ats: string[]
  mention_count: number | null
  first_mentioned_at: string | null
  last_mentioned_at: string | null
}
