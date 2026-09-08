import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ALL_CATEGORIES, type GraphFocus, type NodeCategory } from '@/data/graphTypes'
import type { KgMarket, KgMarketIndex } from '@/lib/kgApiTypes'

/** 원점에서 몇 홉까지 볼지 — 1은 원점의 바로 이웃까지다 (서버 허용 범위 1~3) */
export type Hop = 1 | 2 | 3

export const HOP_VALUES: Hop[] = [1, 2, 3]

/**
 * 탐색 범위 — 시장 하나 또는 지수 하나, 아니면 전체.
 * 서버가 market과 index를 함께 받지 않으므로(400) 값 하나로 모델링해 동시 선택을 원천 차단한다.
 */
export type Scope = 'all' | KgMarket | KgMarketIndex

export const MARKET_SCOPES: KgMarket[] = ['KOSPI', 'KOSDAQ']
export const INDEX_SCOPES: KgMarketIndex[] = ['krx100', 'krx300', 'kosdaq150']

export const SCOPE_LABELS: Record<Scope, string> = {
  all: '전체',
  KOSPI: 'KOSPI',
  KOSDAQ: 'KOSDAQ',
  krx100: 'KRX100',
  krx300: 'KRX300',
  kosdaq150: 'KOSDAQ150',
}

/**
 * 렌즈 — 기업 원점을 어느 축으로 보는가. 렌즈마다 서버 엔드포인트가 다르다.
 * 개요는 1홉 전체(서버 고정), 공급망은 hop·범위, 이벤트는 hop만 받는다.
 */
export type Lens = 'overview' | 'supply' | 'events'

export const LENS_VALUES: Lens[] = ['overview', 'supply', 'events']

export const LENS_LABELS: Record<Lens, string> = {
  overview: '개요',
  supply: '공급망',
  events: '이벤트',
}

function isLens(v: string | null | undefined): v is Lens {
  return (LENS_VALUES as string[]).includes(v ?? '')
}

/** 렌즈별로 상단에 보이는 컨트롤 — 서버가 받는 파라미터와 1:1 */
export function lensControls(lens: Lens): { hop: boolean; scope: boolean } {
  switch (lens) {
    case 'supply':
      return { hop: true, scope: true }
    case 'events':
      return { hop: true, scope: false }
    default:
      return { hop: false, scope: false }
  }
}

/** 렌즈별 노드 종류 필터 기본값 — 개요는 테마가 수십 개라 공급망이 묻히므로 숨기고 시작한다 */
export function lensDefaultCategories(lens: Lens): Set<NodeCategory> {
  return new Set(lens === 'overview' ? ALL_CATEGORIES.filter((c) => c !== 'theme') : ALL_CATEGORIES)
}

function isMarket(v: string | null | undefined): v is KgMarket {
  return (MARKET_SCOPES as string[]).includes(v ?? '')
}

function isIndex(v: string | null | undefined): v is KgMarketIndex {
  return (INDEX_SCOPES as string[]).includes(v ?? '')
}

/** 그래프 페이지의 URL 쿼리 상태 */
export interface GraphQuery {
  hop: Hop
  scope: Scope
  lens: Lens
}

export const DEFAULT_GRAPH_QUERY: GraphQuery = { hop: 1, scope: 'all', lens: 'overview' }

export function parseGraphQuery(params: URLSearchParams): GraphQuery {
  const hopRaw = Number(params.get('hop'))
  const hop = (HOP_VALUES as number[]).includes(hopRaw) ? (hopRaw as Hop) : 1
  // 손으로 고친 URL에 둘이 함께 있으면 market을 우선한다 — 서버는 둘을 같이 받지 않는다
  const market = params.get('market')
  const index = params.get('index')
  const scope: Scope = isMarket(market) ? market : isIndex(index) ? index : 'all'
  const lensRaw = params.get('lens')
  const lens: Lens = isLens(lensRaw) ? lensRaw : 'overview'
  return { hop, scope, lens }
}

/** 기본값(개요·hop 1·전체)은 쿼리에서 생략해 URL을 짧게 유지한다 */
export function graphSearch(query: GraphQuery): string {
  const params = new URLSearchParams()
  if (query.lens !== 'overview') params.set('lens', query.lens)
  if (query.hop !== 1) params.set('hop', String(query.hop))
  if (isMarket(query.scope)) params.set('market', query.scope)
  else if (isIndex(query.scope)) params.set('index', query.scope)
  const s = params.toString()
  return s ? `?${s}` : ''
}

/** 지식그래프 페이지 경로 — 기업은 티커, 테마는 이름으로 원점을 싣고 hop·범위는 쿼리로 이어 간다 */
export function graphPath(focus: GraphFocus, query: GraphQuery = DEFAULT_GRAPH_QUERY): string {
  const base =
    focus.kind === 'theme'
      ? `/graph/theme/${encodeURIComponent(focus.name)}`
      : `/graph/${focus.ticker}`
  return base + graphSearch(query)
}

/** 범위 → kg-api 공급망 쿼리 파라미터 */
export function scopeToKgOptions(scope: Scope): { market?: KgMarket; index?: KgMarketIndex } {
  if (isMarket(scope)) return { market: scope }
  if (isIndex(scope)) return { index: scope }
  return {}
}

/**
 * URL 쿼리에 실린 hop·범위·렌즈.
 * 갱신은 히스토리를 덧쓴다(replace) — 뒤로가기는 "이전 중심"으로만 이동해야 하므로
 * 홉·범위·렌즈를 바꾼 흔적은 항목으로 남기지 않는다.
 */
export function useGraphQuery(): [GraphQuery, (patch: Partial<GraphQuery>) => void] {
  const [params, setParams] = useSearchParams()
  const query = useMemo(() => parseGraphQuery(params), [params])
  const update = useCallback(
    (patch: Partial<GraphQuery>) => {
      setParams((prev) => new URLSearchParams(graphSearch({ ...parseGraphQuery(prev), ...patch })), {
        replace: true,
      })
    },
    [setParams],
  )
  return [query, update]
}
