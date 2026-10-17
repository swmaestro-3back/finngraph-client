import { ChevronRight, CircleAlert, Inbox, Star } from 'lucide-react'
import { EstimateBadge, EventMarker } from '@/components/calendar/EventMarker'
import { Skeleton } from '@/components/fg/Skeleton'
import type { CalendarEventRes } from '@/lib/apiTypes'
import { KIND_LABELS, agendaCountLabel, eventDetails, formatDayTitle, kindFamily } from '@/lib/calendar'
import { cn } from '@/lib/utils'

interface DayEventListProps {
  id?: string
  date: string
  events: readonly CalendarEventRes[]
  holiday: boolean
  loading: boolean
  failed: boolean
  onOpen: (item: CalendarEventRes) => void
  className?: string
}

function Detail({ value, numeric = false }: { value: string; numeric?: boolean }) {
  return (
    <span className="fg-cal-event__detail">
      <span aria-hidden="true">·</span>
      <span className={cn(numeric && 'fg-num')}>{value}</span>
    </span>
  )
}

function EventRow({ item, onOpen }: { item: CalendarEventRes; onOpen: (item: CalendarEventRes) => void }) {
  const details = eventDetails(item)
  const agenda = agendaCountLabel(item)

  return (
    <li>
      <button type="button" aria-haspopup="dialog" onClick={() => onOpen(item)} className="fg-cal-event">
        <span className="fg-cal-event__body">
          <span className="fg-cal-event__top">
            {item.favorite && <Star aria-label="관심종목" role="img" className="fg-cal-event__fav" strokeWidth={2} />}
            <span className="fg-cal-event__name">{item.stockName}</span>
            <span className="fg-cal-event__code fg-num">{item.ticker}</span>
          </span>
          <span className="fg-cal-event__meta">
            <EventMarker family={kindFamily(item.kind)} />
            <span className="fg-cal-event__kind">{KIND_LABELS[item.kind]}</span>
            {item.estimated && <EstimateBadge />}
            {item.label && <Detail value={item.label} />}
            {details.map((value, index) => (
              <Detail key={`${index}-${value}`} value={value} numeric />
            ))}
            {agenda && <Detail value={agenda} numeric />}
          </span>
        </span>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </li>
  )
}

function Placeholder({ kind, title, description }: { kind: 'empty' | 'error'; title: string; description?: string }) {
  const Icon = kind === 'error' ? CircleAlert : Inbox
  return (
    <div className="fg-state fg-cal-day-list__state">
      <div className="fg-state__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <p className="fg-state__title">{title}</p>
      {description && <p className="fg-state__desc">{description}</p>}
    </div>
  )
}

export function DayEventList({ id, date, events, holiday, loading, failed, onOpen, className }: DayEventListProps) {
  const count = events.length

  return (
    <section id={id} aria-labelledby="calendar-day-title" className={cn('fg-section fg-cal-day-list', className)}>
      <div className="fg-section__head fg-cal-day-list__head">
        <div className="fg-cal-day-list__title">
          <h2 id="calendar-day-title" className="fg-section__title">
            {formatDayTitle(date)}
          </h2>
          {holiday && <span className="fg-cal-tag">휴장</span>}
        </div>
        {!loading && !failed && count > 0 && <span className="fg-cal-day-list__count fg-num">{count}건</span>}
      </div>

      {loading && (
        <div className="fg-cal-day-list__skel" aria-hidden="true">
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </div>
      )}

      {!loading && failed && (
        <Placeholder
          kind="error"
          title="일정을 불러오지 못했습니다"
          description="달력 카드에 원인과 다시 요청하는 방법이 표시됩니다."
        />
      )}

      {!loading && !failed && count === 0 && (
        <Placeholder
          kind="empty"
          title={holiday ? '휴장일입니다' : '이 날은 일정이 없습니다'}
          description="일정이 있는 날은 달력 칸에 종목 이름이나 점으로 표시됩니다."
        />
      )}

      {!loading && !failed && count > 0 && (
        <ul className="fg-cal-day-list__list">
          {events.map((item, index) => (
            <EventRow key={`${index}-${item.kind}-${item.ticker}`} item={item} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </section>
  )
}
