import type { GraphData, GraphFocus } from '@/data/graphTypes'
import { qs } from '@/lib/api'
import { AUTO_REFRESH_MS } from '@/lib/autoRefresh'
import { scopeToKgOptions, type GraphQuery } from '@/lib/graphRoute'
import { getKgData } from '@/lib/kgApi'
import type {
  KgCompanyEventsRes,
  KgCompanyRes,
  KgCompanyThemesRes,
  KgSupplyChainRes,
  KgThemeRes,
} from '@/lib/kgApiTypes'
import {
  toCompanyEventsGraph,
  toCompanyOverviewGraph,
  toCompanyThemesGraph,
  toSupplyChainGraph,
  toThemeGraph,
} from '@/lib/kgMappers'
import { createTtlCache } from '@/lib/queries/ttlCache'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export interface KgGraphRequest {
  path: string
  params: Record<string, string | number>
}

/** 원점·렌즈가 실제로 서버에 보내는 경로와 파라미터 — 보내지 않는 값은 키에도 들어가지 않는다 */
export function kgGraphRequest(focus: GraphFocus, { hop, scope, lens }: GraphQuery): KgGraphRequest {
  if (focus.kind === 'theme') return { path: `/v1/themes/${encodeURIComponent(focus.name)}`, params: {} }
  const base = `/v1/companies/${encodeURIComponent(focus.ticker)}`
  switch (lens) {
    case 'supply':
      return { path: `${base}/supplychain`, params: { hop, ...scopeToKgOptions(scope) } }
    case 'events':
      return { path: `${base}/events`, params: { hop } }
    case 'themes':
      return { path: `${base}/themes`, params: {} }
    default:
      // 개요는 서버가 1홉 고정 — hop·범위를 보내지 않는다
      return { path: base, params: {} }
  }
}

export function kgGraphKey(req: KgGraphRequest): string {
  return `${req.path}${qs(req.params)}`
}

// 원본 응답을 캐시한다 — GraphData는 캔버스(d3)가 좌표·참조를 써 넣으므로 매번 새로 매핑해 건넨다.
// 응답에 시세가 실리지만 종목 목록 캐시와 같은 주기라 오래된 정도는 전과 같다.
const responses = createTtlCache<unknown>(AUTO_REFRESH_MS)

function fetchGraph(focus: GraphFocus, query: GraphQuery): Promise<GraphData> {
  const req = kgGraphRequest(focus, query)
  const load = <T,>() => responses(kgGraphKey(req), () => getKgData<T>(req.path, req.params)) as Promise<T>
  if (focus.kind === 'theme') return load<KgThemeRes>().then(toThemeGraph)
  switch (query.lens) {
    case 'supply':
      return load<KgSupplyChainRes>().then((res) => toSupplyChainGraph(res, focus.ticker))
    case 'events':
      return load<KgCompanyEventsRes>().then((res) => toCompanyEventsGraph(res, focus.ticker))
    case 'themes':
      return load<KgCompanyThemesRes>().then(toCompanyThemesGraph)
    default:
      return load<KgCompanyRes>().then((res) => toCompanyOverviewGraph(res, focus.ticker))
  }
}

/**
 * 원점 종류와 렌즈에 따라 kg-api를 골라 GraphData로 매핑한다.
 * 실제 요청 키가 같으면 다시 부르지 않는다 — 개요에서 hop을 바꾸거나, 홉을 왔다 갔다 해도 같은 요청은 캐시에서 온다.
 * 기업 원점에서 렌즈가 바뀌면 경로가 바뀌어 키도 바뀌고, 테마 원점은 렌즈와 무관하게 같은 경로·같은 매퍼다.
 * enabled가 false면(인증 확인 중) 부르지 않는다 — 확인이 끝난 뒤의 hop으로 한 번만 부른다.
 */
export function useKgGraph(focus: GraphFocus, query: GraphQuery, enabled = true): ApiState<GraphData | null> {
  const key = kgGraphKey(kgGraphRequest(focus, query))
  return useApi<GraphData | null>(
    () => (enabled ? fetchGraph(focus, query) : Promise.resolve(null)),
    [key, enabled],
  )
}
