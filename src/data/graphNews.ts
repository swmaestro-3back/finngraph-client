
import raw from '@/data/samsung-graph.json'
import { MOCK_GRAPH, NEWS_LINKS } from '@/data/graph'
import {
  endId,
  type EntityType,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from '@/data/graphTypes'
import type { NewsDetail } from '@/lib/apiTypes'
import { expandGraph } from '@/lib/graphTraversal'

export interface NewsRelation {
  link: GraphLink
  source: GraphNode
  target: GraphNode
}

export interface NewsGraph {
  news: NewsDetail
  relations: NewsRelation[]
  expanded: NewsRelation[]
  graph: GraphData
  seedIds: string[]
}

interface RawNews {
  news_id: string
  title: string
  summary: string
  url: string
  collected_at: string
}

const NEWS: NewsDetail[] = ((raw as { news?: RawNews[] }).news ?? []).map((n) => ({
  id: n.news_id,
  title: n.title,
  summary: n.summary,
  url: n.url,
  collectedAt: n.collected_at,
}))

const newsById = new Map(NEWS.map((n) => [n.id, n]))
const nodeById = new Map(MOCK_GRAPH.nodes.map((n) => [n.id, n]))

const relationsByNews = new Map<string, NewsRelation[]>()
NEWS_LINKS.forEach((link) => {
  if (!link.news_id) return
  const source = nodeById.get(endId(link.source))
  const target = nodeById.get(endId(link.target))
  if (!source || !target) return
  const list = relationsByNews.get(link.news_id)
  if (list) list.push({ link, source, target })
  else relationsByNews.set(link.news_id, [{ link, source, target }])
})

function tripleKey(link: GraphLink): string {
  return [endId(link.source), link.type, endId(link.target), link.item?.text ?? ''].join('|')
}

function seedIds(newsId: string): Set<string> {
  const ids = new Set<string>()
  relationsByNews.get(newsId)?.forEach(({ source, target }) => {
    ids.add(source.id)
    ids.add(target.id)
  })
  return ids
}

export function listNews(): NewsDetail[] {
  return NEWS
}

export function getNews(newsId: string): NewsDetail | null {
  return newsById.get(newsId) ?? null
}

export function getNewsGraph(newsId: string, hops = 0): NewsGraph | null {
  const news = newsById.get(newsId)
  if (!news) return null

  const relations = relationsByNews.get(newsId) ?? []

  const keep = seedIds(newsId)
  const nodes = MOCK_GRAPH.nodes.filter((n) => keep.has(n.id))
  const links = relations.map((r) => r.link)

  const center = relations.reduce<NewsRelation | null>(
    (top, r) => (!top || r.link.mentioned_count > top.link.mentioned_count ? r : top),
    null,
  )?.source.label

  const seed: GraphData = {
    nodes,
    links,
    metadata: {
      center,
      entity_types: MOCK_GRAPH.metadata.entity_types,
      predicate_types: MOCK_GRAPH.metadata.predicate_types,
      stats: { total_nodes: nodes.length, total_edges: links.length },
    },
  }

  const graph = expandGraph(MOCK_GRAPH, seed, hops)

  const seedLinkIds = new Set(links.map((l) => l.id))
  const seedTriples = new Set(links.map(tripleKey))
  const expanded: NewsRelation[] = graph.links.flatMap((link) => {
    if (seedLinkIds.has(link.id) || seedTriples.has(tripleKey(link))) return []
    const source = nodeById.get(endId(link.source))
    const target = nodeById.get(endId(link.target))
    return source && target ? [{ link, source, target }] : []
  })

  return {
    news,
    relations,
    expanded,
    graph,
    seedIds: nodes.map((n) => n.id),
  }
}

export interface NewsEntity {
  label: string
  type: EntityType
  nodeId?: string
}

const nodeByLabel = new Map(MOCK_GRAPH.nodes.map((n) => [n.label, n]))

export function newsEntities(relations: NewsRelation[]): NewsEntity[] {
  const byLabel = new Map<string, NewsEntity>()
  const add = (entity: NewsEntity) => {
    if (!byLabel.has(entity.label)) byLabel.set(entity.label, entity)
  }

  relations.forEach(({ source, target }) => {
    add({ label: source.label, type: source.type, nodeId: source.id })
    add({ label: target.label, type: target.type, nodeId: target.id })
  })
  relations.forEach(({ link }) => {
    if (!link.item) return
    add({
      label: link.item.text,
      type: link.item.type,
      nodeId: nodeByLabel.get(link.item.text)?.id,
    })
  })
  return [...byLabel.values()]
}

export function getSimilarNews(newsId: string, limit = 5): NewsDetail[] {
  const base = seedIds(newsId)
  if (base.size === 0) return []

  const mentionSum = (id: string) =>
    (relationsByNews.get(id) ?? []).reduce((sum, r) => sum + r.link.mentioned_count, 0)

  return NEWS.filter((n) => n.id !== newsId)
    .map((n) => ({
      news: n,
      shared: [...seedIds(n.id)].filter((id) => base.has(id)).length,
    }))
    .filter((c) => c.shared > 0)
    .sort((a, b) => b.shared - a.shared || mentionSum(b.news.id) - mentionSum(a.news.id))
    .slice(0, limit)
    .map((c) => c.news)
}
