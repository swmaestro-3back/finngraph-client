import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/lib/api'
import type { IssueSort } from '@/lib/apiTypes'
import { FEED_PAGE_SIZE, type FeedChunk, type FeedRequest } from '@/lib/fg/home'
import { loadIssueList, type IssueList } from '@/lib/queries/useIssue'

const FIRST: FeedRequest = { date: null, page: 0 }

interface FeedState {
  sort: IssueSort
  chunks: FeedChunk[]
  pending: FeedRequest | null
  failed: FeedRequest | null
  error: ApiError | null
}

export interface IssueFeed {
  chunks: FeedChunk[]
  pending: FeedRequest | null
  error: ApiError | null
  more: (request: FeedRequest) => void
  retry: () => void
}

function initial(sort: IssueSort): FeedState {
  return { sort, chunks: [], pending: FIRST, failed: null, error: null }
}

function toChunk(list: IssueList, request: FeedRequest): FeedChunk {
  return {
    date: list.meta?.date ?? request.date,
    page: list.pagination.page,
    totalPages: list.pagination.totalPages,
    prevDate: list.meta?.prevDate ?? null,
    items: list.items,
  }
}

export function useIssueFeed(sort: IssueSort): IssueFeed {
  const [state, setState] = useState<FeedState>(() => initial(sort))
  const generation = useRef(0)

  const run = useCallback((request: FeedRequest, forSort: IssueSort) => {
    const gen = ++generation.current
    setState((prev) => ({ ...(prev.sort === forSort ? prev : initial(forSort)), pending: request, failed: null, error: null }))
    loadIssueList({ date: request.date, sort: forSort, page: request.page, size: FEED_PAGE_SIZE }).then(
      (list) => {
        if (gen !== generation.current) return
        setState((prev) => ({ ...prev, chunks: [...prev.chunks, toChunk(list, request)], pending: null }))
      },
      (e: unknown) => {
        if (gen !== generation.current) return
        const error = e instanceof ApiError ? e : new ApiError('INTERNAL_ERROR', 0, String(e))
        setState((prev) => ({ ...prev, pending: null, failed: request, error }))
      },
    )
  }, [])

  useEffect(() => {
    run(FIRST, sort)
  }, [run, sort])

  const current = state.sort === sort ? state : initial(sort)
  const more = useCallback((request: FeedRequest) => run(request, sort), [run, sort])
  const failed = current.failed
  const retry = useCallback(() => run(failed ?? FIRST, sort), [run, failed, sort])
  return { chunks: current.chunks, pending: current.pending, error: current.error, more, retry }
}
