import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { ActionTimeline } from '@/components/calendar/detail/ActionTimeline'
import { SectionNotice } from '@/components/calendar/detail/DetailParts'
import { EventDetailHeader } from '@/components/calendar/detail/EventDetailHeader'
import { EventPriceChart } from '@/components/calendar/detail/EventPriceChart'
import { EventSummary } from '@/components/calendar/detail/EventSummary'
import { FamilyPanel } from '@/components/calendar/detail/FamilyPanel'
import { OtherActions } from '@/components/calendar/detail/OtherActions'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { CalendarEventRes, CorporateActionRes } from '@/lib/apiTypes'
import {
  CALENDAR_NOTICE,
  KIND_LABELS,
  actionKey,
  focusStep,
  formatAsOf,
  selectAction,
  stockCalendarWindow,
  summaryFromAction,
  summaryFromRow,
  type ActionFocus,
  type EventDetailTarget,
} from '@/lib/calendar'
import { useStockCalendar } from '@/lib/queries/useStockCalendar'
import { cn } from '@/lib/utils'

const PULSE = 'animate-pulse rounded-lg bg-muted motion-reduce:animate-none'

interface EventDetailBodyProps {
  target: EventDetailTarget
  fallback: CalendarEventRes | null
  from: string
  today: string
  onClose: () => void
}

export function EventDetailBody({ target, fallback, from, today, onClose }: EventDetailBodyProps) {
  const range = useMemo(() => stockCalendarWindow(target.date), [target.date])
  const { data, loading, error, refetch } = useStockCalendar(target.ticker, range.from, range.to)
  const [focus, setFocus] = useState<ActionFocus>({ key: null, kind: target.kind, date: target.date })
  const bodyRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const switched = useRef(false)

  useEffect(() => {
    if (!switched.current) return
    bodyRef.current?.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [focus])

  const selectOther = useCallback(
    (next: CorporateActionRes) => {
      const step = focusStep(next, today)
      if (!step) return
      switched.current = true
      setFocus({ key: actionKey(next), kind: step.kind, date: step.date })
    },
    [today],
  )
  const name = fallback?.stockName ?? target.ticker

  if (error && !loading) {
    const notFound = error.isNotFound
    return (
      <div className="px-6 pt-7 pb-10 sm:px-8">
        <DialogTitle className="pr-8 text-title font-medium tracking-[-0.5px] text-foreground">
          {notFound ? '종목을 찾을 수 없습니다' : name}
        </DialogTitle>
        <DialogDescription className="sr-only">일정 조회 실패</DialogDescription>
        <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
          <CircleAlert className="size-8 text-muted-foreground" />
          <p className="text-body text-muted-foreground break-keep">
            {notFound
              ? '상장폐지됐거나 더 이상 조회되지 않는 종목입니다.'
              : error.isRetryable
                ? '일시적으로 일정을 불러올 수 없습니다.'
                : '일정을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.'}
          </p>
          {!notFound && error.isRetryable ? (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RotateCw data-icon="inline-start" />
              다시 시도
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onClose}>
              닫기
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!data || loading) {
    return (
      <div aria-busy="true" className="px-6 pt-7 pb-10 sm:px-8">
        <DialogTitle className="pr-8 text-title font-medium tracking-[-0.5px] text-foreground">{name}</DialogTitle>
        <DialogDescription className="mt-1 text-caption text-muted-foreground">
          {KIND_LABELS[target.kind]} 일정을 불러오는 중
        </DialogDescription>
        <div className={cn('mt-4 h-6 w-40', PULSE)} />
        <div className="my-6 border-t border-border" />
        <div className={cn('h-28', PULSE)} />
        <div className={cn('mt-4 h-40', PULSE)} />
      </div>
    )
  }

  const action = selectAction(data.actions, focus, target.label)
  const summary = action ? summaryFromAction(action, focus.kind, focus.date) : summaryFromRow(target, fallback)
  const asOf = formatAsOf(data.asOf)

  return (
    <div ref={bodyRef} className="min-h-0 overflow-y-auto">
      <EventDetailHeader
        stock={data}
        description={`${KIND_LABELS[summary.kind]} 일정`}
        from={from}
        onNavigate={onClose}
      />
      <div className="border-t border-border lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          <EventSummary summary={summary} today={today} headingRef={headingRef} />
          {!action && (
            <div className="px-6 pb-5 sm:px-8">
              <SectionNotice>
                일정이 갱신됐습니다. 이 일정은 최신 자료에서 바뀌었거나 빠졌습니다. 달력을 새로 고치면 바뀐 일정을 볼 수 있습니다.
              </SectionNotice>
            </div>
          )}
          {action && <ActionTimeline action={action} focus={focus} today={today} />}
          {action && <FamilyPanel ticker={data.ticker} action={action} price={data.price} today={today} />}
        </div>
        <div className="min-w-0 lg:border-l lg:border-border lg:[&>section:first-child]:border-t-0">
          <EventPriceChart ticker={data.ticker} kind={focus.kind} date={focus.date} today={today} />
          {action && (
            <OtherActions actions={data.actions} currentKey={actionKey(action)} today={today} onSelect={selectOther} />
          )}
        </div>
      </div>
      <footer className="border-t border-border px-6 py-4 sm:px-8">
        <p className="text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
          {asOf && (
            <>
              <span className="font-mono tabular-nums">{asOf}</span> 기준 ·{' '}
            </>
          )}
          {CALENDAR_NOTICE}
        </p>
      </footer>
    </div>
  )
}
