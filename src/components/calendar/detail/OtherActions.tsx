import { EventMarker } from '@/components/calendar/EventMarker'
import { DetailSection } from '@/components/calendar/detail/DetailParts'
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
      <p className="-mt-2 mb-3 text-caption text-muted-foreground break-keep">
        처음 연 일정 기준 앞뒤 180일 안의 권리 일정입니다.
      </p>
      {others.length === 0 ? (
        <p className="text-caption text-muted-foreground">이 기간에 다른 일정이 없습니다.</p>
      ) : (
        <ul className="flex flex-col">
          {others.map((action) => {
            const step = focusStep(action, today)
            return (
              <li key={actionKey(action)} className="border-b border-surface-inset last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(action)}
                  className="flex w-full cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <EventMarker family={action.family} />
                  <span className="text-sm font-medium text-foreground">{FAMILY_LABELS[action.family]}</span>
                  {action.label && <span className="text-caption text-foreground-secondary">{action.label}</span>}
                  {step && (
                    <span className="ml-auto flex items-baseline gap-2 text-caption text-foreground-secondary">
                      <span>{KIND_LABELS[step.kind]}</span>
                      <span className="font-mono tabular-nums">{formatDateSpan(step.date, step.endDate)}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">{spanCountdown(step, today)}</span>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </DetailSection>
  )
}
