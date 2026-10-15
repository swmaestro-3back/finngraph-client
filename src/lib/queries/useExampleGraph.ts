import type { GraphData } from '@/data/graphTypes'
import { EXAMPLE_TICKER } from '@/lib/graphStart'
import { toCompanyOverviewGraph } from '@/lib/kgMappers'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useExampleGraph(enabled: boolean): ApiState<GraphData | null> {
  return useApi<GraphData | null>(
    () =>
      enabled
        ? import('@/data/graphExample').then(({ GRAPH_EXAMPLE }) =>
            toCompanyOverviewGraph(GRAPH_EXAMPLE, EXAMPLE_TICKER),
          )
        : Promise.resolve(null),
    [enabled],
  )
}
