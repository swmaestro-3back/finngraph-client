import { Star } from 'lucide-react'
import { FAMILY_LABELS, FAMILY_ORDER, type EventFamily } from '@/lib/calendar'
import { cn } from '@/lib/utils'

const FAMILY_DOT: Record<EventFamily, string> = {
  DIV: 'bg-chart-1',
  BONUS: 'bg-chart-3',
  RIGHTS: 'bg-chart-5',
  AGM: 'bg-chart-2',
}

interface EventMarkerProps {
  family: EventFamily
  favorite?: boolean
  className?: string
}

export function EventMarker({ family, favorite = false, className }: EventMarkerProps) {
  if (favorite) {
    return <Star aria-hidden className={cn('size-2.5 shrink-0 fill-current text-foreground', className)} strokeWidth={2.5} />
  }
  return <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', FAMILY_DOT[family], className)} />
}

export function EstimateBadge() {
  return (
    <span
      title="휴장일 정보가 아직 없는 기간이라 평일 기준으로 계산했습니다"
      className="inline-flex items-center rounded-full bg-accent-warm-bg px-1.5 text-micro font-medium leading-tight text-accent-warm"
    >
      (추정)
    </span>
  )
}

export function FamilyLegend({ showFavorite, className }: { showFavorite: boolean; className?: string }) {
  return (
    <ul aria-label="일정 구분" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground', className)}>
      {FAMILY_ORDER.map((family) => (
        <li key={family} className="inline-flex items-center gap-1.5">
          <EventMarker family={family} />
          {FAMILY_LABELS[family]}
        </li>
      ))}
      {showFavorite && (
        <li className="inline-flex items-center gap-1.5">
          <EventMarker family="DIV" favorite />
          관심종목
        </li>
      )}
    </ul>
  )
}
