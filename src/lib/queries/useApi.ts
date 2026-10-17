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

/**
 * 아직 답을 기다리는 중인가 — 스켈레톤을 그릴지 가른다.
 * useApi는 첫 렌더에서 loading=false, data=null 이라 `loading && !data`로는 빈 목록이 한 프레임 비친다.
 * 답(data)도 실패(error)도 없으면 기다리는 것이다. enabled=false 면 부르지 않으니 기다릴 것도 없다.
 */
export function awaiting(
  state: { data: unknown; loading: boolean; error: unknown },
  enabled = true,
): boolean {
  return enabled && state.data === null && state.error === null
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

/**
 * 탭이 살아 있는 동안 한 번만 받는 모듈 캐시 — 전종목·테마 목록처럼 여러 화면이 공유하는 큰 응답용.
 * 실패한 Promise는 버려 다음 호출이 다시 시도한다.
 */
export function cachedLoader<T>(load: () => Promise<T>): () => Promise<T> {
  let cache: Promise<T> | null = null
  return () => {
    cache ??= load().catch((err: unknown) => {
      cache = null
      throw err
    })
    return cache
  }
}
