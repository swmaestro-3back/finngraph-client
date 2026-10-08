import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IpoDetailBody } from '@/components/calendar/ipo/IpoDetailBody'
import type { IpoRes } from '@/lib/apiTypes'
import { ipoTargetKey, type IpoDetailTarget } from '@/lib/ipoDetail'

interface IpoDetailModalProps {
  target: IpoDetailTarget | null
  fallback: IpoRes | null
  from: string
  today: string
  onOpenChange: (open: boolean) => void
}

interface Shown {
  target: IpoDetailTarget
  fallback: IpoRes | null
}

export function IpoDetailModal({ target, fallback, from, today, onOpenChange }: IpoDetailModalProps) {
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
    <IpoDetailBody
      key={`${session.count}|${ipoTargetKey(shown.target)}`}
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
