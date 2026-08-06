import type {
  GraphData,
  GraphNode,
  GraphLink,
  EntityType,
  Predicate,
  EdgeItem,
} from '@/data/graphTypes'
import { LABEL_TO_TYPE, ALL_ENTITY_TYPES, ALL_PREDICATES } from '@/data/graphTypes'
import raw from '../../data/samsung-graph.json'

/**
 * data/samsung-graph.json (뉴스 분석으로 추출한 삼중항 관계)을
 * 그래프 컴포넌트가 쓰는 GraphData(nodes/links)로 변환한다.
 * 백엔드가 준비되면 이 모듈 대신 fetch 결과를 같은 형태로 매핑하면 된다.
 */

interface RawEntity {
  text: string
  label: string
  description?: string
  aliases?: string[]
}

interface RawRef {
  text: string
  label: string
}

interface RawRelation {
  news_id?: string
  news_title?: string
  news_url?: string
  timestamp?: string
  mentioned_count?: number
  predicate: string
  is_negated?: boolean
  tense?: string
  subject: RawRef
  object: RawRef
  item?: RawRef | null
  source_sentence?: string
}

interface RawGraph {
  center?: string
  entities: RawEntity[]
  relations: RawRelation[]
}

const data = raw as RawGraph

/** 엔티티 text → 안정적인 노드 id */
function nodeId(text: string): string {
  return `n:${text}`
}

function toType(label: string): EntityType {
  return LABEL_TO_TYPE[label] ?? 'company'
}

function buildGraph(): GraphData {
  const nodeMap = new Map<string, GraphNode>()

  const ensureNode = (text: string, label: string) => {
    const id = nodeId(text)
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        label: text,
        type: toType(label),
        data: {},
      })
    }
    return nodeMap.get(id)!
  }

  // 1) 선언된 엔티티(설명/별칭 포함)로 노드 시드
  data.entities.forEach((e) => {
    const node = ensureNode(e.text, e.label)
    node.data.description = e.description
    node.data.aliases = e.aliases
  })

  // 2) 관계에서 노드 보강 + 링크 생성
  const links: GraphLink[] = data.relations.map((r, i) => {
    ensureNode(r.subject.text, r.subject.label)
    ensureNode(r.object.text, r.object.label)

    let item: EdgeItem | null = null
    if (r.item) {
      item = { text: r.item.text, type: toType(r.item.label) }
    }

    const mc = r.mentioned_count ?? 1
    return {
      id: r.news_id ? `${r.news_id}#${i}` : `rel-${i}`,
      source: nodeId(r.subject.text),
      target: nodeId(r.object.text),
      type: r.predicate as Predicate,
      item,
      mentioned_count: mc,
      news_id: r.news_id,
      news_title: r.news_title,
      news_url: r.news_url,
      source_sentence: r.source_sentence ?? '',
      timestamp: r.timestamp ?? '',
      is_negated: r.is_negated ?? false,
      tense: (r.tense as GraphLink['tense']) ?? 'past_or_present_fact',
      value: mc,
    }
  })

  const nodes = [...nodeMap.values()]

  return {
    nodes,
    links,
    metadata: {
      center: data.center,
      entity_types: ALL_ENTITY_TYPES,
      predicate_types: ALL_PREDICATES,
      stats: {
        total_nodes: nodes.length,
        total_edges: links.length,
      },
    },
  }
}

export const MOCK_GRAPH: GraphData = buildGraph()
