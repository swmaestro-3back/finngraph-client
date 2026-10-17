import { EstimateBadge } from '@/components/calendar/EventMarker'
import { nextStepIndex, timelineRow } from '@/lib/calendar'

export interface StepTimelineItem {
  key: string
  label: string
  date: string | null
  endDate: string | null
  estimated?: boolean
  focused?: boolean
}

export function StepTimeline({ items, today }: { items: readonly StepTimelineItem[]; today: string }) {
  const nextIndex = nextStepIndex(items, today)

  return (
    <ol className="fg-cal-steps">
      {items.map((item, index) => {
        const row = timelineRow(item, today)
        const next = index === nextIndex
        return (
          <li
            key={item.key}
            aria-current={next ? 'step' : undefined}
            className="fg-cal-step"
            data-state={row.state ?? 'undated'}
            data-next={next ? 'true' : undefined}
            data-focused={item.focused ? 'true' : undefined}
          >
            <span className="fg-cal-step__date fg-num">{row.dateText}</span>
            <span className="fg-cal-step__label">
              <span>
                {item.label}
                {item.focused && <span className="fg-sr"> (선택한 일정)</span>}
              </span>
              {item.estimated && <EstimateBadge />}
            </span>
            {row.countdown && <span className="fg-cal-step__dday fg-num">{row.countdown}</span>}
          </li>
        )
      })}
    </ol>
  )
}
