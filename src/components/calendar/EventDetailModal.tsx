import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EventDetailBody } from '@/components/calendar/detail/EventDetailBody'
import type { CalendarEventRes } from '@/lib/apiTypes'
import type { EventDetailTarget } from '@/lib/calendar'

interface EventDetailModalProps {
  target: EventDetailTarget | null
  fallback: CalendarEventRes | null
  from: string
  today: string
  onOpenChange: (open: boolean) => void
}

interface Shown {
  target: EventDetailTarget
  fallback: CalendarEventRes | null
}

export function EventDetailModal({ target, fallback, from, today, onOpenChange }: EventDetailModalProps) {
  const [last, setLast] = useState<Shown | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const open = target !== null
  const [session, setSession] = useState({ open, count: open ? 1 : 0 })
  if (session.open !== open) setSession({ open, count: open ? session.count + 1 : session.count })

  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) opener.current = document.activeElement
  }, [open])

  useEffect(() => {
    if (target) setLast({ target, fallback })
  }, [target, fallback])

  const shown = target ? { target, fallback } : last
  if (!shown) return null

  return (
    <EventDetailBody
      key={`${session.count}|${shown.target.ticker}|${shown.target.kind}|${shown.target.date}|${shown.target.label ?? ''}`}
      target={shown.target}
      fallback={shown.fallback}
      open={open}
      from={from}
      today={today}
      returnFocusRef={opener}
      onOpenChange={onOpenChange}
    />
  )
}
