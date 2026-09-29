import { ApiError, getData } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { BriefingRes, BriefingSummaryRes } from '@/lib/apiTypes'
import { useApi, type ApiState } from '@/lib/queries/useApi'

interface BriefingEnvelope {
  briefing: BriefingRes | null
}

export interface BriefingState {
  data: BriefingRes | null
  loading: boolean
  error: ApiError | null
  notFound: boolean
  refetch: () => void
}

const PENDING: Promise<BriefingEnvelope> = new Promise(() => {})

export function useBriefing(date: string | null): BriefingState {
  const { status } = useAuth()
  const path = date ? `/v1/briefings/${encodeURIComponent(date)}` : '/v1/briefings/latest'
  const state = useApi<BriefingEnvelope>(
    () =>
      status === 'loading'
        ? PENDING
        : getData<BriefingRes>(path)
            .then((briefing) => ({ briefing }))
            .catch((e: unknown) => {
              if (e instanceof ApiError && e.isNotFound) return { briefing: null }
              throw e
            }),
    [path, status],
  )
  return {
    data: state.data?.briefing ?? null,
    loading: state.loading,
    error: state.error,
    notFound: !state.loading && !state.error && state.data !== null && state.data.briefing === null,
    refetch: state.refetch,
  }
}

export function useBriefingDates(limit = 30): ApiState<BriefingSummaryRes[]> {
  return useApi<BriefingSummaryRes[]>(
    () => getData<BriefingSummaryRes[]>('/v1/briefings', { limit }),
    [limit],
  )
}
