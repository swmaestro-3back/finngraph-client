import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EstimateBadge, EventMarker } from '@/components/calendar/EventMarker'
import type { CalendarEventRes } from '@/lib/apiTypes'
import { KIND_LABELS, eventDetails, formatDayTitle, kindFamily } from '@/lib/calendar'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface DayEventListProps {
  id?: string
  date: string
  events: readonly CalendarEventRes[]
  holiday: boolean
  loading: boolean
  failed: boolean
  from: string
  className?: string
}

function Detail({ value, numeric = false }: { value: string; numeric?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-foreground-secondary">
      <span aria-hidden className="text-foreground-tertiary">
        ·
      </span>
      <span className={cn(numeric && 'font-mono tabular-nums')}>{value}</span>
    </span>
  )
}

function EventRow({ item, from }: { item: CalendarEventRes; from: string }) {
  const details = eventDetails(item)
  const agenda = item.kind === 'AGM' && item.agenda.length > 0

  return (
    <li className="group relative flex flex-col gap-1 border-b border-surface-inset px-5 py-3 transition-colors last:border-b-0 hover:bg-muted has-[a:focus-visible]:bg-muted">
      <Link
        to={`/stock/${encodeURIComponent(item.ticker)}`}
        state={fromState(from)}
        className="flex flex-col gap-1 outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-inset focus-visible:after:ring-ring/50"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {item.favorite && (
            <Star aria-label="관심종목" role="img" className="size-3.5 shrink-0 fill-current text-foreground" strokeWidth={2} />
          )}
          <span className="min-w-0 truncate text-sm font-medium text-foreground group-hover:text-primary">
            {item.stockName}
          </span>
          <span className="shrink-0 font-mono text-caption tabular-nums text-muted-foreground">{item.ticker}</span>
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption">
          <EventMarker family={kindFamily(item.kind)} />
          <span className="font-medium text-foreground-secondary">{KIND_LABELS[item.kind]}</span>
          {item.estimated && <EstimateBadge />}
          {item.label && <Detail value={item.label} />}
          {details.map((value, index) => (
            <Detail key={`${index}-${value}`} value={value} numeric />
          ))}
        </span>
      </Link>
      {agenda && (
        <div className="mt-1 flex flex-col gap-1 rounded-lg bg-muted px-3 py-2 group-hover:bg-surface-inset">
          <ol
            aria-label={`${item.stockName} 주총 안건`}
            className="list-decimal space-y-0.5 pl-4 text-caption leading-relaxed text-foreground-secondary marker:font-mono marker:text-muted-foreground"
          >
            {item.agenda.map((agendum, index) => (
              <li key={`${index}-${agendum}`} className="break-keep">
                {agendum}
              </li>
            ))}
          </ol>
          {item.agendaTruncated && <p className="text-caption text-muted-foreground">외 다수 — 일부 안건만 받았습니다</p>}
        </div>
      )}
    </li>
  )
}

function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-8 text-center">
      <p className="text-body font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">{description}</p>
      )}
    </div>
  )
}

export function DayEventList({ id, date, events, holiday, loading, failed, from, className }: DayEventListProps) {
  const count = events.length

  return (
    <section
      id={id}
      aria-labelledby="calendar-day-title"
      className={cn('card-surface flex min-h-0 scroll-mt-20 flex-col overflow-hidden', className)}
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id="calendar-day-title" className="text-lg font-medium tracking-[-0.4px] text-foreground">
          {formatDayTitle(date)}
        </h2>
        <span className="flex shrink-0 items-center gap-2 text-caption text-muted-foreground">
          {holiday && (
            <span className="rounded-full border border-border px-2 py-0.5 font-medium text-foreground-secondary">휴장</span>
          )}
          {!loading && !failed && count > 0 && <span className="font-mono tabular-nums">{count}건</span>}
        </span>
      </div>

      {loading && (
        <div className="flex flex-col gap-2 px-5 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {!loading && failed && (
        <Placeholder title="일정을 불러오지 못했습니다" description="달력 카드에 원인과 다시 요청하는 방법이 표시됩니다." />
      )}

      {!loading && !failed && count === 0 && (
        <Placeholder
          title={holiday ? '휴장일입니다' : '이 날은 일정이 없습니다'}
          description="일정이 있는 날은 달력 칸에 종목 이름이나 점으로 표시됩니다."
        />
      )}

      {!loading && !failed && count > 0 && (
        <ul className="min-h-0 overflow-y-auto overscroll-contain xl:max-h-[min(70vh,640px)]">
          {events.map((item, index) => (
            <EventRow key={`${index}-${item.kind}-${item.ticker}`} item={item} from={from} />
          ))}
        </ul>
      )}
    </section>
  )
}
