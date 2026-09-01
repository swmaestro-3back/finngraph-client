import {
  ALL_ENTITY_TYPES,
  ALL_PREDICATES,
  endId,
  type EntityType,
  type GraphData,
  type GraphLink,
  type GraphNode,
  type Predicate,
} from '@/data/graphTypes'
import type { NewsRelation } from '@/data/graphNews'
import type { KgGraphRes, KgNewsGraphRes } from '@/lib/kgApiTypes'

const LABEL_PRIORITY: [string, EntityType][] = [
  ['Company', 'company'],
  ['Theme', 'theme'],
  ['Country', 'country'],
  ['Commodity', 'commodity'],
  ['Product', 'product'],
]

function labelsToType(labels: string[]): EntityType | null {
  for (const [label, type] of LABEL_PRIORITY) {
    if (labels.includes(label)) return type
  }
  return null
}

const KNOWN_PREDICATES = new Set<string>(ALL_PREDICATES)

function isKnownPredicate(type: string): type is Predicate {
  return KNOWN_PREDICATES.has(type)
}

export function toGraphData(res: KgGraphRes): GraphData {
  const nodes: GraphNode[] = []
  const nodeIds = new Set<string>()

  for (const n of res.nodes) {
    const type = labelsToType(n.labels)
    if (!type) continue
    const props = n.properties
    const name = typeof props.name === 'string' ? props.name : undefined
    const ticker = typeof props.ticker === 'string' ? props.ticker : undefined
    nodes.push({
      id: n.id,
      label: name ?? ticker ?? n.id,
      type,
      data: {
        description: typeof props.description === 'string' ? props.description : undefined,
        ticker,
      },
    })
    nodeIds.add(n.id)
  }

  const links: GraphLink[] = []
  for (const r of res.relationships) {
    if (!isKnownPredicate(r.type)) continue
    if (!nodeIds.has(r.start) || !nodeIds.has(r.end)) continue
    const mc = r.mention_count ?? 1
    links.push({
      id: r.id,
      source: r.start,
      target: r.end,
      type: r.type,
      mentioned_count: mc,
      value: mc,
    })
  }

  const centerLabel = nodes.find((n) => n.id === res.center)?.label

  return {
    nodes,
    links,
    metadata: {
      center: centerLabel,
      entity_types: ALL_ENTITY_TYPES,
      predicate_types: ALL_PREDICATES,
      stats: { total_nodes: nodes.length, total_edges: links.length },
    },
  }
}

export interface NewsGraphData {
  graph: GraphData
  relations: NewsRelation[]
  expanded: NewsRelation[]
  seedIds: string[]
}

export function toNewsGraphData(res: KgNewsGraphRes): NewsGraphData {
  const graph = toGraphData(res)
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const seedRelIds = new Set(res.seed_relationship_ids)

  const relations: NewsRelation[] = []
  const expanded: NewsRelation[] = []
  const seedNodeIds = new Set<string>()
  for (const link of graph.links) {
    const source = nodeById.get(endId(link.source))
    const target = nodeById.get(endId(link.target))
    if (!source || !target) continue
    const relation: NewsRelation = { link, source, target }
    if (seedRelIds.has(link.id)) {
      relations.push(relation)
      seedNodeIds.add(source.id)
      seedNodeIds.add(target.id)
    } else {
      expanded.push(relation)
    }
  }

  return { graph, relations, expanded, seedIds: [...seedNodeIds] }
}
