import { ChevronRight } from 'lucide-react'
import { EventMarker } from '@/components/calendar/EventMarker'
import { DetailNote, DetailSection } from '@/components/calendar/detail/DetailParts'
import type { CorporateActionRes } from '@/lib/apiTypes'
import { FAMILY_LABELS, KIND_LABELS, actionKey, focusStep, formatDateSpan, spanCountdown } from '@/lib/calendar'

interface OtherActionsProps {
  actions: readonly CorporateActionRes[]
  currentKey: string
  today: string
  onSelect: (action: CorporateActionRes) => void
}

export function OtherActions({ actions, currentKey, today, onSelect }: OtherActionsProps) {
  const others = actions.filter((action) => actionKey(action) !== currentKey)

  return (
    <DetailSection id="other-actions-title" title="이 종목의 다른 일정">
      <DetailNote className="fg-cal-dsec__lead">처음 연 일정 기준 앞뒤 180일 안의 권리 일정입니다.</DetailNote>
      {others.length === 0 ? (
        <p className="fg-cal-others__empty">이 기간에 다른 일정이 없습니다.</p>
      ) : (
        <ul className="fg-cal-others">
          {others.map((action) => {
            const step = focusStep(action, today)
            return (
              <li key={actionKey(action)}>
                <button type="button" onClick={() => onSelect(action)} className="fg-cal-other">
                  <span className="fg-cal-other__body">
                    <EventMarker family={action.family} />
                    <span className="fg-cal-other__name">{FAMILY_LABELS[action.family]}</span>
                    {action.label && <span className="fg-cal-other__label">{action.label}</span>}
                    {step && (
                      <span className="fg-cal-other__when">
                        <span>{KIND_LABELS[step.kind]}</span>
                        <span className="fg-num">{formatDateSpan(step.date, step.endDate)}</span>
                        <span className="fg-cal-other__dday fg-num">{spanCountdown(step, today)}</span>
                      </span>
                    )}
                  </span>
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </DetailSection>
  )
}
