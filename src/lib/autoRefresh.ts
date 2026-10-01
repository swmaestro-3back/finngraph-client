import { useEffect, useRef } from 'react'
import { isKrxOpen } from '@/lib/marketClock'
import { intradayTime, type PriceBasis } from '@/lib/referenceDate'

export const AUTO_REFRESH_MS = 5 * 60 * 1000

const KST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function shouldAutoRefresh(now: Date, basis: PriceBasis | null | undefined): boolean {
  if (isKrxOpen(now)) return true
  return intradayTime(basis) !== null && basis?.baseDate === KST_DATE.format(now)
}

export interface VisibilitySource {
  readonly visibilityState: DocumentVisibilityState
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

export interface AutoRefreshOptions {
  intervalMs: number
  refresh: () => void
  active: (now: Date) => boolean
  page?: VisibilitySource
}

export function startAutoRefresh({
  intervalMs,
  refresh,
  active,
  page = document,
}: AutoRefreshOptions): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let last = Date.now()

  const schedule = (delay: number) => {
    clearTimeout(timer)
    timer = setTimeout(run, delay)
  }

  function run() {
    timer = undefined
    if (page.visibilityState === 'hidden') return
    if (active(new Date())) {
      last = Date.now()
      refresh()
    }
    schedule(intervalMs)
  }

  const onVisibilityChange = () => {
    if (page.visibilityState === 'hidden') {
      clearTimeout(timer)
      timer = undefined
      return
    }
    schedule(Math.max(0, last + intervalMs - Date.now()))
  }

  page.addEventListener('visibilitychange', onVisibilityChange)
  schedule(intervalMs)

  return () => {
    clearTimeout(timer)
    page.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

export function useAutoRefresh(
  refresh: () => void,
  basis: PriceBasis | null | undefined,
  intervalMs = AUTO_REFRESH_MS,
): void {
  const latest = useRef({ refresh, basis })

  useEffect(() => {
    latest.current = { refresh, basis }
  })

  useEffect(
    () =>
      startAutoRefresh({
        intervalMs,
        refresh: () => latest.current.refresh(),
        active: (now) => shouldAutoRefresh(now, latest.current.basis),
      }),
    [intervalMs],
  )
}
