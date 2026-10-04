import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { IpoDetailBody } from '@/components/calendar/ipo/IpoDetailBody'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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

  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) opener.current = document.activeElement
  }, [open])

  useEffect(() => {
    if (target) setLast({ target, fallback })
  }, [target, fallback])

  const shown = target ? { target, fallback } : last

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-8 flex max-h-[calc(100vh-56px)] translate-y-0 flex-col gap-0 overflow-hidden p-0 outline-none sm:max-w-[1080px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (opener.current?.isConnected) opener.current.focus()
          opener.current = null
        }}
      >
        {shown && (
          <IpoDetailBody
            key={ipoTargetKey(shown.target)}
            target={shown.target}
            fallback={shown.fallback}
            from={from}
            today={today}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
