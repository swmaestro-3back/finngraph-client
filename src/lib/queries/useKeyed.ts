import { ApiError } from '@/lib/api'
import { useApi } from '@/lib/queries/useApi'

interface Keyed<K, T> {
  key: K
  data: T
}

export interface KeyedState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  refresh: () => void
  retry: () => void
}

const errorKeys = new WeakMap<ApiError, unknown>()

function keyedError(key: unknown, e: unknown): ApiError {
  const error = e instanceof ApiError ? e : new ApiError('INTERNAL_ERROR', 0, String(e))
  errorKeys.set(error, key)
  return error
}

export function useKeyed<K extends string | number, T>(key: K | null, load: (key: K) => Promise<T>): KeyedState<T> {
  const state = useApi<Keyed<K, T> | null>(
    () =>
      key === null
        ? Promise.resolve(null)
        : load(key).then(
            (data) => ({ key, data }),
            (e: unknown) => {
              throw keyedError(key, e)
            },
          ),
    [key],
  )
  const data = key !== null && state.data?.key === key ? state.data.data : null
  const error = key !== null && data === null && state.error !== null && errorKeys.get(state.error) === key ? state.error : null
  return {
    data,
    loading: key !== null && data === null && error === null,
    error,
    refresh: state.refresh,
    retry: state.refetch,
  }
}
