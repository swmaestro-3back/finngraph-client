import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ActionTimeline } from '@/components/calendar/detail/ActionTimeline'
import { DetailLoading, SectionNotice } from '@/components/calendar/detail/DetailParts'
import { EventDetailHeader, EventDetailMeta } from '@/components/calendar/detail/EventDetailHeader'
import { EventPriceChart } from '@/components/calendar/detail/EventPriceChart'
import { EventSummary } from '@/components/calendar/detail/EventSummary'
import { FamilyPanel } from '@/components/calendar/detail/FamilyPanel'
import { OtherActions } from '@/components/calendar/detail/OtherActions'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { SideSheet } from '@/components/fg/SideSheet'
import { StateBlock } from '@/components/fg/StateBlock'
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

interface EventDetailBodyProps {
  target: EventDetailTarget
  fallback: CalendarEventRes | null
  open: boolean
  from: string
  today: string
  returnFocusRef: RefObject<HTMLElement | null>
  onOpenChange: (open: boolean) => void
}

export function EventDetailBody({
  target,
  fallback,
  open,
  from,
  today,
  returnFocusRef,
  onOpenChange,
}: EventDetailBodyProps) {
  const range = useMemo(() => stockCalendarWindow(target.date), [target.date])
  const { data, loading, error, refetch } = useStockCalendar(target.ticker, range.from, range.to)
  const [focus, setFocus] = useState<ActionFocus>({ key: null, kind: target.kind, date: target.date })
  const bodyRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const switched = useRef(false)

  useEffect(() => {
    if (!switched.current) return
    bodyRef.current?.closest('[role="dialog"]')?.scrollTo({ top: 0 })
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
  const onClose = () => onOpenChange(false)
  const name = fallback?.stockName ?? target.ticker

  let title: string
  let meta: ReactNode = null
  let body: ReactNode

  if (error && !loading) {
    const notFound = error.isNotFound
    title = notFound ? '종목을 찾을 수 없습니다' : name
    body = (
      <StateBlock
        kind="error"
        className="fg-cal-dstate"
        title={
          notFound
            ? '상장폐지됐거나 더 이상 조회되지 않는 종목입니다.'
            : error.isRetryable
              ? '일시적으로 일정을 불러올 수 없습니다.'
              : '일정을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.'
        }
        action={
          !notFound && error.isRetryable ? (
            <Button size="sm" onClick={refetch}>
              다시 시도
            </Button>
          ) : (
            <Button size="sm" onClick={onClose}>
              닫기
            </Button>
          )
        }
      />
    )
  } else if (!data || loading) {
    title = name
    meta = <span className="fg-cal-dkick">{KIND_LABELS[target.kind]} 일정을 불러오는 중</span>
    body = <DetailLoading />
  } else {
    const action = selectAction(data.actions, focus, target.label)
    const summary = action ? summaryFromAction(action, focus.kind, focus.date) : summaryFromRow(target, fallback)
    const asOf = formatAsOf(data.asOf)
    title = data.stockName
    meta = <EventDetailMeta stock={data} description={`${KIND_LABELS[summary.kind]} 일정`} />
    body = (
      <div ref={bodyRef} className="fg-cal-detail">
        <EventDetailHeader stock={data} from={from} onNavigate={onClose} />
        <EventSummary summary={summary} today={today} headingRef={headingRef} />
        {!action && (
          <SectionNotice>
            일정이 갱신됐습니다. 이 일정은 최신 자료에서 바뀌었거나 빠졌습니다. 달력을 새로 고치면 바뀐 일정을 볼 수 있습니다.
          </SectionNotice>
        )}
        {action && <ActionTimeline action={action} focus={focus} today={today} />}
        {action && <FamilyPanel ticker={data.ticker} action={action} price={data.price} today={today} />}
        <EventPriceChart ticker={data.ticker} kind={focus.kind} date={focus.date} today={today} />
        {action && (
          <OtherActions actions={data.actions} currentKey={actionKey(action)} today={today} onSelect={selectOther} />
        )}
        <Disclaimer
          text={asOf ? `${asOf} 기준 · ${CALENDAR_NOTICE}` : CALENDAR_NOTICE}
          className="fg-snote fg-num"
        />
      </div>
    )
  }

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      meta={meta}
      closeLabel="일정 상세 닫기"
      returnFocusRef={returnFocusRef}
      variant="modal"
    >
      {body}
    </SideSheet>
  )
}
