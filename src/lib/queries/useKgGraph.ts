import type { GraphData, GraphFocus } from '@/data/graphTypes'
import { scopeToKgOptions, type GraphQuery } from '@/lib/graphRoute'
import { getKgData } from '@/lib/kgApi'
import type {
  KgCompanyEventsRes,
  KgCompanyRes,
  KgSupplyChainRes,
  KgThemeRes,
} from '@/lib/kgApiTypes'
import {
  toCompanyEventsGraph,
  toCompanyOverviewGraph,
  toSupplyChainGraph,
  toThemeGraph,
} from '@/lib/kgMappers'
import { useApi, type ApiState } from '@/lib/queries/useApi'

/** 원점·렌즈에 맞는 kg-api 호출 한 번과 GraphData 매핑 */
function fetchGraph(focus: GraphFocus, { hop, scope, lens }: GraphQuery): Promise<GraphData> {
  if (focus.kind === 'theme') {
    return getKgData<KgThemeRes>(`/v1/themes/${encodeURIComponent(focus.name)}`).then(toThemeGraph)
  }
  const base = `/v1/companies/${encodeURIComponent(focus.ticker)}`
  switch (lens) {
    case 'supply':
      return getKgData<KgSupplyChainRes>(`${base}/supplychain`, {
        hop,
        ...scopeToKgOptions(scope),
      }).then((res) => toSupplyChainGraph(res, focus.ticker))
    case 'events':
      return getKgData<KgCompanyEventsRes>(`${base}/events`, { hop }).then((res) =>
        toCompanyEventsGraph(res, focus.ticker),
      )
    default:
      // 개요는 서버가 1홉 고정 — hop·범위를 보내지 않는다
      return getKgData<KgCompanyRes>(base).then((res) => toCompanyOverviewGraph(res, focus.ticker))
  }
}

/**
 * 원점 종류와 렌즈에 따라 kg-api를 골라 GraphData로 매핑한다.
 * 테마는 파라미터 없는 소속 기업 조회, 기업은 렌즈별로 개요(1홉 전체)·공급망(hop·범위)·이벤트(hop)다.
 */
export function useKgGraph(focus: GraphFocus, query: GraphQuery): ApiState<GraphData> {
  const key = focus.kind === 'theme' ? focus.name : focus.ticker
  return useApi<GraphData>(
    () => fetchGraph(focus, query),
    [focus.kind, key, query.lens, query.hop, query.scope],
  )
}
