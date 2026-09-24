import { useMemo } from 'react'
import type { Hop } from '@/components/graph/HopSelector'
import type { GraphData, GraphLink, GraphNode } from '@/data/graphTypes'
import { ApiError } from '@/lib/api'
import type { NewsDetail } from '@/lib/apiTypes'
import { getKgData } from '@/lib/kgApi'
import type { KgNewsGraphRes } from '@/lib/kgApiTypes'
import { toNewsGraph } from '@/lib/kgMappers'
import { useApi } from '@/lib/queries/useApi'

export interface NewsRelation {
  link: GraphLink
  source: GraphNode
  target: GraphNode
}

export interface NewsGraphData {
  graph: GraphData
  relations: NewsRelation[]
  expanded: NewsRelation[]
  seedIds: string[]
  /** 서버 노드 상한에 걸려 확장 일부가 잘렸는가 — 캔버스 아래 안내 문구용 */
  truncated: boolean
}

/**
 * 캔버스에서 "메인"으로 크게 그릴 노드 — 시드 기업에, 모달 상단 관련 기업 칩과 ticker가 맞는 노드를 더한다.
 * 칩은 백엔드(뉴스→기업)에서, 시드는 kg-api(관계→뉴스)에서 오므로 둘이 어긋날 수 있어 합집합으로 본다.
 */
export function primaryNodeIds(nodes: GraphNode[], seedIds: string[], tickers: string[]): Set<string> {
  const ids = new Set(seedIds)
  const wanted = new Set(tickers)
  nodes.forEach((n) => {
    if (n.data.ticker && wanted.has(n.data.ticker)) ids.add(n.id)
  })
  return ids
}

const NO_SIMILAR: NewsDetail[] = []

/**
 * 기사 기반 서브그래프 — kg-api `/news/{id}/graph?hop=`.
 * 이 뉴스를 근거로 가진 관계가 없으면 서버가 404를 주는데, 그건 오류가 아니라 "그릴 게 없음"이라 null로 삼킨다.
 * 다른 오류도 모달 본문(제목·요약)은 그대로 보여야 하므로 섹션만 비운다.
 */
export function useNewsGraph(
  newsId: string | null,
  hop: Hop = 1,
): {
  data: NewsGraphData | null
  similar: NewsDetail[]
} {
  const res = useApi<KgNewsGraphRes | null>(
    () =>
      newsId
        ? getKgData<KgNewsGraphRes>(`/v1/news/${encodeURIComponent(newsId)}/graph`, { hop }).catch(
            (e: unknown) => {
              if (e instanceof ApiError && e.isNotFound) return null
              throw e
            },
          )
        : Promise.resolve(null),
    [newsId, hop],
  )

  const data = useMemo(() => (res.data ? toNewsGraph(res.data) : null), [res.data])

  return { data, similar: NO_SIMILAR }
}
