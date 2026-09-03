import type {
  GraphData,
  GraphNode,
  GraphLink,
  EntityType,
  Predicate,
  EdgeItem,
} from '@/data/graphTypes'
import { LABEL_TO_TYPE, ALL_ENTITY_TYPES, ALL_PREDICATES } from '@/data/graphTypes'
import raw from '@/data/samsung-graph.json'

/**
 * data/samsung-graph.json (뉴스 분석으로 추출한 트리플 관계)을
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

const nodeMap = new Map<string, GraphNode>()

function ensureNode(text: string, label: string): GraphNode {
  const id = nodeId(text)
  if (!nodeMap.has(id)) {
    nodeMap.set(id, { id, label: text, type: toType(label), data: {} })
  }
  return nodeMap.get(id)!
}

// 선언된 엔티티(설명/별칭 포함)로 노드 시드
data.entities.forEach((e) => {
  const node = ensureNode(e.text, e.label)
  node.data.description = e.description
  node.data.aliases = e.aliases
})

const KNOWN_PREDICATES = new Set<string>(ALL_PREDICATES)

/**
 * 관계 하나 = 링크 하나. 같은 트리플이 여러 기사에 나오면 링크도 그만큼 생긴다.
 * 기사별 근거 문장·언급 횟수가 살아 있어야 뉴스 서브그래프를 그릴 수 있다.
 * 시드 JSON에는 지금 그래프가 쓰지 않는 서술어(PRODUCES 등)가 섞여 있어 라벨이 없는 것은 걸러낸다.
 */
export const NEWS_LINKS: GraphLink[] = data.relations
  .filter((r) => KNOWN_PREDICATES.has(r.predicate))
  .map((r, i) => {
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

/**
 * 전체 그래프용 링크 — 같은 (주어·서술어·목적어)를 하나로 합친다.
 * 합치지 않으면 여러 기사가 반복 언급한 관계가 겹쳐 그려진다.
 * 언급 횟수는 합산하고, 나머지 필드는 가장 많이 언급한 기사 것을 대표로 쓴다.
 */
function mergeLinks(links: GraphLink[]): GraphLink[] {
  const byTriple = new Map<string, GraphLink[]>()
  links.forEach((link) => {
    const key = `${link.source}|${link.type}|${link.target}`
    const group = byTriple.get(key)
    if (group) group.push(link)
    else byTriple.set(key, [link])
  })

  return [...byTriple.values()].map((group) => {
    const total = group.reduce((sum, l) => sum + l.mentioned_count, 0)
    const top = group.reduce((a, b) => (b.mentioned_count > a.mentioned_count ? b : a))
    return { ...top, mentioned_count: total, value: total }
  })
}

const nodes = [...nodeMap.values()]
const links = mergeLinks(NEWS_LINKS)

export const MOCK_GRAPH: GraphData = {
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
