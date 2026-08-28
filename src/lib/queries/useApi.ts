import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  refetch: () => void
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const generation = useRef(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const myGen = ++generation.current
    setLoading(true)
    setError(null)
    fetcher().then(
      (result) => {
        if (generation.current !== myGen) return
        setData(result)
        setLoading(false)
      },
      (e: unknown) => {
        if (generation.current !== myGen) return
        setData(null)
        setError(
          e instanceof ApiError ? e : new ApiError('INTERNAL_ERROR', 0, String(e)),
        )
        setLoading(false)
      },
    )
  }, [...deps, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, error, refetch }
}
