import { DetailSection } from '@/components/calendar/detail/DetailParts'
import { StepTimeline } from '@/components/calendar/detail/StepTimeline'
import type { CorporateActionRes } from '@/lib/apiTypes'
import { timelineItems, type ActionFocus } from '@/lib/calendar'

interface ActionTimelineProps {
  action: CorporateActionRes
  focus: Pick<ActionFocus, 'kind' | 'date'>
  today: string
}

export function ActionTimeline({ action, focus, today }: ActionTimelineProps) {
  const items = timelineItems(action).map((item) => ({
    ...item,
    focused: item.kind === focus.kind && item.date === focus.date,
  }))

  return (
    <DetailSection id="action-timeline-title" title="권리 일정 흐름">
      <StepTimeline items={items} today={today} />
    </DetailSection>
  )
}
