import { useState, useEffect, useCallback } from 'react'
import type { GraphData } from '@/data/graphTypes'
import { MOCK_GRAPH } from '@/data/graph'

/**
 * 로컬 목업 데이터를 반환하는 그래프 데이터 훅.
 * 백엔드(/api)가 준비되면 이 훅 내부만 fetch 로 교체하면 된다.
 */
export function useGraphData() {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error] = useState<string | null>(null)

  const fetchGraph = useCallback((_filters?: { category?: string; node_type?: string }) => {
    void _filters
    setLoading(true)
    setData(MOCK_GRAPH)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  return { data, loading, error, refetch: fetchGraph }
}
