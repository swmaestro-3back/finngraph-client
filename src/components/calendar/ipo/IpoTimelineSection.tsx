import { DetailSection } from '@/components/calendar/detail/DetailParts'
import { StepTimeline } from '@/components/calendar/detail/StepTimeline'
import type { IpoDetailRes } from '@/lib/apiTypes'
import { ipoTimeline } from '@/lib/ipoDetail'

export function IpoTimelineSection({ detail, today }: { detail: IpoDetailRes; today: string }) {
  return (
    <DetailSection id="ipo-timeline-title" title="공모 일정 흐름">
      <StepTimeline items={ipoTimeline(detail)} today={today} />
      {detail.status === 'FILED' && (
        <p className="mt-3 text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
          증권신고서에 적힌 일정이라 정정 공시가 나오면 바뀔 수 있습니다.
        </p>
      )}
    </DetailSection>
  )
}
