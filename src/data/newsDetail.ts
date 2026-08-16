// 뉴스 상세 — 뉴스 테이블 한 행과 그 뉴스에서 추출된 서브그래프
//
// 목업 뉴스 테이블은 samsung-graph.json의 `news` 배열이고, relations는 news_id로 그 행을 참조한다.
// 백엔드가 준비되면 listNews/getNewsGraph 내부만 fetch 결과로 바꾸면 된다.

import raw from '@/data/samsung-graph.json'
import { MOCK_GRAPH, NEWS_LINKS } from '@/data/graph'
import {
  endId,
  type EntityType,
  type GraphData,
  type GraphLink,
  type GraphNode,
} from '@/data/graphTypes'
import { expandGraph } from '@/lib/graphTraversal'

/** 뉴스 테이블 한 행 — 백엔드가 주는 전부 */
export interface NewsDetail {
  id: string
  title: string
  /** 원문 그대로 출력한다 (클라이언트가 가공하지 않는다) */
  summary: string
  url: string
  /** 수집 시각 ISO */
  collectedAt: string
}

/** 관계 하나 + 양 끝 노드 — 목록이 라벨을 그리려면 id만으로는 부족하다 */
export interface NewsRelation {
  link: GraphLink
  source: GraphNode
  target: GraphNode
}

/** 뉴스 + 그 뉴스에서 추출된 서브그래프 — 모달이 받는 단위 */
export interface NewsGraph {
  news: NewsDetail
  /** 기사에 직접 등장한 관계 */
  relations: NewsRelation[]
  /** 캔버스용 데이터 — 기사에 등장한 엔티티와 관계, 홉 확장을 요청했으면 그 이웃까지 */
  graph: GraphData
  /** 기사에 등장한 엔티티 id — 확장된 그래프에서 "기사에서 온 것"을 가려낸다 */
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

/** news_id → 그 기사에서 추출된 관계들 (합쳐지기 전 원본 링크를 쓴다) */
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

/** 뉴스에 등장한 엔티티 노드 id — 유사도 계산과 서브그래프 시드에 함께 쓴다 */
function seedIds(newsId: string): Set<string> {
  const ids = new Set<string>()
  relationsByNews.get(newsId)?.forEach(({ source, target }) => {
    ids.add(source.id)
    ids.add(target.id)
  })
  return ids
}

/** 신문사 도메인 → 이름. 없는 호스트는 호스트 문자열을 그대로 쓴다 */
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
}

/** 원문 URL에서 신문사를 유도한다 (뉴스 테이블에 신문사 컬럼이 없다) */
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

/**
 * 뉴스 하나와 그 서브그래프.
 *
 * 기본(hops = 0)은 기사에서 추출된 관계와 그 양 끝 엔티티뿐이다.
 * hops를 주면 그 엔티티들을 시드로 전체 그래프를 그만큼 따라가 넓힌다 —
 * 기사를 읽다가 "이 기업 주변엔 또 뭐가 있지"를 이어서 볼 수 있게.
 */
export function getNewsGraph(newsId: string, hops = 0): NewsGraph | null {
  const news = newsById.get(newsId)
  if (!news) return null

  const relations = relationsByNews.get(newsId) ?? []

  const keep = seedIds(newsId)
  const nodes = MOCK_GRAPH.nodes.filter((n) => keep.has(n.id))
  const links = relations.map((r) => r.link)

  // 중심은 이 기사에서 가장 많이 언급된 관계의 주어로 잡는다
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

  return {
    news,
    relations,
    graph: expandGraph(MOCK_GRAPH, seed, hops),
    seedIds: nodes.map((n) => n.id),
  }
}

/** 헤더 칩 한 개 — 그래프에 노드가 있으면 nodeId가 붙어 호버 강조가 가능하다 */
export interface NewsEntity {
  label: string
  type: EntityType
  nodeId?: string
}

const nodeByLabel = new Map(MOCK_GRAPH.nodes.map((n) => [n.label, n]))

/** 기사에 등장한 엔티티 — 주어·목적어 다음에 삼중항의 중간 항목(제품·원자재)을 붙인다 */
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

/** 공유 엔티티가 많은 순으로 유사한 뉴스를 고른다 (동수면 언급 횟수 합) */
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
