
import raw from '@/data/samsung-graph.json'
import { MOCK_GRAPH, NEWS_LINKS } from '@/data/graph'
import { ALL_THEME_NEWS } from '@/data/themeNews'
import {
  endId,
  type EntityType,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from '@/data/graphTypes'
import { expandGraph } from '@/lib/graphTraversal'

export interface NewsDetail {
  id: string
  title: string
  summary: string
  url: string
  collectedAt: string
}

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
ALL_THEME_NEWS.forEach((n) => newsById.set(n.id, n))
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

const PRESS_BY_HOST: Record<string, string> = {
  'www.hankyung.com': '한국경제',
  'www.mk.co.kr': '매일경제',
  'www.yna.co.kr': '연합뉴스',
  'news.mt.co.kr': '머니투데이',
  'www.edaily.co.kr': '이데일리',
  'www.sedaily.com': '서울경제',
  'www.etnews.com': '전자신문',
  'www.newspim.com': '뉴스핌',
  'www.newsis.com': '뉴시스',
  'www.asiae.co.kr': '아시아경제',
  'www.fnnews.com': '파이낸셜뉴스',
  'biz.heraldcorp.com': '헤럴드경제',
  'www.thelec.kr': '디일렉',
  'news.example.com': '데모경제',
  'press.example.com': '샘플경제',
  'wire.example.net': '목업뉴스',
  'daily.example.org': '가상일보',
}

export function pressOf(url: string): string {
  try {
    const host = new URL(url).hostname
    return PRESS_BY_HOST[host] ?? host
  } catch {
    return '출처 미상'
  }
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
