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
    <section aria-labelledby="event-summary-title" className="fg-cal-dsec fg-cal-dsum">
      <div className="fg-cal-dsum__kind">
        <EventMarker family={kindFamily(summary.kind)} />
        <h3 id="event-summary-title" ref={headingRef} tabIndex={-1} className="fg-cal-dsec__title fg-cal-dsum__title">
          {KIND_LABELS[summary.kind]}
        </h3>
        {summary.label && <span className="fg-cal-dsum__label">{summary.label}</span>}
        {summary.estimated && <EstimateBadge />}
      </div>
      <p className="fg-cal-dsum__when fg-num">
        <span className="fg-cal-dsum__date">{formatDayRange(summary.date, summary.endDate)}</span>
        <span className="fg-cal-dsum__dday">{spanCountdown(summary, today)}</span>
      </p>
      {summary.details.length > 0 && (
        <ul className="fg-cal-dsum__details fg-num">
          {summary.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
      <p className="fg-cal-dsum__desc">{KIND_DESCRIPTIONS[summary.kind]}</p>
      {summary.lastBuy && (
        <div className="fg-cal-lastbuy">
          <p className="fg-cal-lastbuy__row fg-num">
            <span className="fg-cal-lastbuy__term">매수 마감일</span>
            <span className="fg-cal-lastbuy__date">{formatDayTitle(summary.lastBuy.date)}</span>
            <span className="fg-cal-lastbuy__dday">
              {spanCountdown({ date: summary.lastBuy.date, endDate: null }, today)}
            </span>
            {summary.lastBuy.estimated && <EstimateBadge />}
          </p>
          <p className="fg-cal-lastbuy__note">이날 장 마감까지 사야 이번 권리를 받습니다.</p>
        </div>
      )}
    </section>
  )
}
