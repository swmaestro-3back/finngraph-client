import { useMemo } from 'react'
import type { Hop } from '@/components/graph/HopSelector'
import type { GraphData } from '@/data/graphTypes'
import { getKgData } from '@/lib/kgApi'
import type { KgGraphRes } from '@/lib/kgApiTypes'
import { toGraphData } from '@/lib/kgMappers'
import { useApi, type ApiState } from '@/lib/queries/useApi'

export function useKgGraph(ticker: string, hop: Hop): ApiState<GraphData> {
  const res = useApi<KgGraphRes>(
    () => getKgData<KgGraphRes>(`/v1/stocks/${encodeURIComponent(ticker)}`, { hop }),
    [ticker, hop],
  )
  const data = useMemo(() => (res.data ? toGraphData(res.data) : null), [res.data])
  return { ...res, data }
}
