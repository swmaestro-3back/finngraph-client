import type { ReactNode } from 'react'
import { Badge } from '@/components/fg/Badge'
import { StateBlock } from '@/components/fg/StateBlock'
import type { GapId } from '@/lib/dataGaps'
import { cn } from '@/lib/utils'

export const NOT_READY_TITLE = '이 정보는 준비 중이에요'
export const NOT_READY_DESCRIPTION = '곧 볼 수 있어요'

interface NotReadyProps {
  gap: GapId
  title?: string
  description?: string
  className?: string
}

export function NotReady({ gap, title = NOT_READY_TITLE, description = NOT_READY_DESCRIPTION, className }: NotReadyProps) {
  return (
    <div className={className} data-gap={gap}>
      <StateBlock kind="not-ready" title={title} description={description} />
    </div>
  )
}

interface NotReadyPageProps {
  gap: GapId
  heading: string
  title: string
  description: string
}

export function NotReadyPage({ gap, heading, title, description }: NotReadyPageProps) {
  return (
    <div className="fg-main fg-wrap">
      <h1 className="fg-sr">{heading}</h1>
      <section className="fg-section">
        <NotReady gap={gap} title={title} description={description} />
      </section>
    </div>
  )
}

interface GapValueProps {
  gap: GapId
  mock?: ReactNode
  label?: string
  className?: string
}

export function GapValue({ gap, mock = null, label, className }: GapValueProps) {
  if (mock !== null && mock !== undefined) {
    return (
      <span className={cn('fg-gapv', className)} data-gap={gap} data-mock="true">
        {mock}
      </span>
    )
  }
  if (label) {
    return (
      <span className={cn('fg-gapv', className)} data-gap={gap}>
        {label}
      </span>
    )
  }
  return (
    <span className={cn('fg-gapv', className)} data-gap={gap}>
      <span aria-hidden="true">—</span>
      <span className="fg-sr">준비 중</span>
    </span>
  )
}

export function MockBadge() {
  return <Badge tone="event">목업</Badge>
}
