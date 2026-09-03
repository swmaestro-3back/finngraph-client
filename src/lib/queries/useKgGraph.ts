import type { Hop } from '@/components/graph/HopSelector'
import type { GraphData, GraphFocus } from '@/data/graphTypes'
import { getKgData } from '@/lib/kgApi'
import type { KgMarket, KgMarketIndex, KgSupplyChainRes, KgThemeRes } from '@/lib/kgApiTypes'
import { toSupplyChainGraph, toThemeGraph } from '@/lib/kgMappers'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export interface KgGraphOptions {
  /** 해당 시장 상장 기업으로만 경로를 제한 — index와 함께 쓰면 서버가 400을 준다 */
  market?: KgMarket
  /** 해당 지수 구성종목으로만 경로를 제한 */
  index?: KgMarketIndex
}

/**
 * 원점 종류에 따라 kg-api를 골라 GraphData로 매핑한다.
 * 기업은 hop(1~3)·market/index를 받는 공급망 조회, 테마는 파라미터 없는 소속 기업 조회다.
 */
export function useKgGraph(
  focus: GraphFocus,
  hop: Hop,
  { market, index }: KgGraphOptions = {},
): ApiState<GraphData> {
  const key = focus.kind === 'theme' ? focus.name : focus.ticker
  return useApi<GraphData>(
    () =>
      focus.kind === 'theme'
        ? getKgData<KgThemeRes>(`/v1/themes/${encodeURIComponent(focus.name)}`).then(toThemeGraph)
        : getKgData<KgSupplyChainRes>(
            `/v1/companies/${encodeURIComponent(focus.ticker)}/supplychain`,
            { hop, market, index },
          ).then((res) => toSupplyChainGraph(res, focus.ticker)),
    [focus.kind, key, hop, market, index],
  )
}
