import { Star } from 'lucide-react'
import { Badge } from '@/components/fg/Badge'
import { FAMILY_LABELS, FAMILY_ORDER, type EventFamily } from '@/lib/calendar'
import { cn } from '@/lib/utils'

const FAMILY_DOT: Record<EventFamily, string> = {
  DIV: 'fg-cal-dot--div',
  BONUS: 'fg-cal-dot--bonus',
  RIGHTS: 'fg-cal-dot--rights',
  AGM: 'fg-cal-dot--agm',
}

interface EventMarkerProps {
  family: EventFamily
  favorite?: boolean
  className?: string
}

export function EventMarker({ family, favorite = false, className }: EventMarkerProps) {
  if (favorite) {
    return <Star aria-hidden className={cn('fg-cal-star', className)} strokeWidth={2.5} />
  }
  return <span aria-hidden className={cn('fg-cal-dot', FAMILY_DOT[family], className)} />
}

export function EstimateBadge() {
  return (
    <Badge title="휴장일 정보가 아직 없는 기간이라 평일 기준으로 계산했습니다" className="fg-cal-est">
      (추정)
    </Badge>
  )
}

export function FamilyLegend({ showFavorite, className }: { showFavorite: boolean; className?: string }) {
  return (
    <ul aria-label="일정 구분" className={cn('fg-cal-legend', className)}>
      {FAMILY_ORDER.map((family) => (
        <li key={family}>
          <EventMarker family={family} />
          {FAMILY_LABELS[family]}
        </li>
      ))}
      {showFavorite && (
        <li>
          <EventMarker family="DIV" favorite />
          관심종목
        </li>
      )}
    </ul>
  )
}
