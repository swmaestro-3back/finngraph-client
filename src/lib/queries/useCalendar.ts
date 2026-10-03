import { useMemo } from 'react'
import { getData } from '@/lib/api'
import type { CalendarRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/favorites'
import { useApi, type ApiState } from '@/lib/queries/useApi'

const PENDING: Promise<CalendarRes> = new Promise(() => {})

export function useCalendar(from: string, to: string): ApiState<CalendarRes> {
  const { status } = useAuth()
  const { items, ready, error } = useFavorites()
  const favoriteTickers = useMemo(
    () =>
      items
        .filter((item) => item.type === 'STOCK')
        .map((item) => item.key)
        .sort()
        .join(','),
    [items],
  )
  const waiting = status === 'loading' || (status === 'authenticated' && !ready && !error)
  const path = status === 'authenticated' ? '/v1/me/calendar' : '/v1/calendar'
  return useApi<CalendarRes>(
    () => (waiting ? PENDING : getData<CalendarRes>(path, { from, to })),
    [path, from, to, status, waiting, favoriteTickers],
  )
}
