import type { Ref } from 'react'
import { EstimateBadge, EventMarker } from '@/components/calendar/EventMarker'
import {
  KIND_DESCRIPTIONS,
  KIND_LABELS,
  formatDayRange,
  formatDayTitle,
  kindFamily,
  spanCountdown,
  type EventSummaryModel,
} from '@/lib/calendar'

interface EventSummaryProps {
  summary: EventSummaryModel
  today: string
  headingRef?: Ref<HTMLHeadingElement>
}

export function EventSummary({ summary, today, headingRef }: EventSummaryProps) {
  return (
    <section aria-labelledby="event-summary-title" className="flex flex-col gap-3 px-6 py-5 sm:px-8">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <EventMarker family={kindFamily(summary.kind)} />
        <h3
          id="event-summary-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-body font-semibold text-foreground outline-none"
        >
          {KIND_LABELS[summary.kind]}
        </h3>
        {summary.label && <span className="text-caption text-foreground-secondary">{summary.label}</span>}
        {summary.estimated && <EstimateBadge />}
      </div>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-mono text-lg font-medium tabular-nums text-foreground">
          {formatDayRange(summary.date, summary.endDate)}
        </span>
        <span className="font-mono text-caption font-medium tabular-nums text-foreground-secondary">
          {spanCountdown(summary, today)}
        </span>
      </p>
      {summary.details.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-body text-foreground-secondary">
          {summary.details.map((detail) => (
            <li key={detail} className="font-mono tabular-nums">
              {detail}
            </li>
          ))}
        </ul>
      )}
      <p className="text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
        {KIND_DESCRIPTIONS[summary.kind]}
      </p>
      {summary.lastBuy && (
        <div className="flex flex-col gap-0.5 rounded-lg bg-surface-inset px-3 py-2.5">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-caption font-medium text-foreground-secondary">매수 마감일</span>
            <span className="font-mono text-sm font-medium tabular-nums text-foreground">
              {formatDayTitle(summary.lastBuy.date)}
            </span>
            <span className="font-mono text-caption tabular-nums text-muted-foreground">
              {spanCountdown({ date: summary.lastBuy.date, endDate: null }, today)}
            </span>
            {summary.lastBuy.estimated && <EstimateBadge />}
          </p>
          <p className="text-caption text-muted-foreground break-keep">이날 장 마감까지 사야 이번 권리를 받습니다.</p>
        </div>
      )}
    </section>
  )
}
