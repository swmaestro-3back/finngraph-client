import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  refetch: () => void
  refresh: () => void
  mutate: (next: T) => void
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const generation = useRef(0)
  const inFlight = useRef(false)
  const latestFetcher = useRef(fetcher)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    latestFetcher.current = fetcher
  })

  useEffect(() => {
    const myGen = ++generation.current
    inFlight.current = true
    setLoading(true)
    setError(null)
    fetcher().then(
      (result) => {
        if (generation.current !== myGen) return
        inFlight.current = false
        setData(result)
        setLoading(false)
      },
      (e: unknown) => {
        if (generation.current !== myGen) return
        inFlight.current = false
        setData(null)
        setError(
          e instanceof ApiError ? e : new ApiError('INTERNAL_ERROR', 0, String(e)),
        )
        setLoading(false)
      },
    )
  }, [...deps, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  const refresh = useCallback(() => {
    if (inFlight.current) return
    const myGen = ++generation.current
    latestFetcher.current().then(
      (result) => {
        if (generation.current !== myGen) return
        setData(result)
        setError(null)
      },
      () => {},
    )
  }, [])

  const mutate = useCallback((next: T) => {
    generation.current += 1
    inFlight.current = false
    setData(next)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, refetch, refresh, mutate }
}
