import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { CalendarMemberBanner } from '@/components/calendar/CalendarMemberBanner'
import { DayEventList } from '@/components/calendar/DayEventList'
import { EventDetailModal } from '@/components/calendar/EventDetailModal'
import { EstimateBadge, FamilyLegend } from '@/components/calendar/EventMarker'
import { IpoBoard } from '@/components/calendar/IpoBoard'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { IconButton } from '@/components/fg/IconButton'
import { StateBlock } from '@/components/fg/StateBlock'
import { useAuth } from '@/lib/auth'
import {
  CALENDAR_NOTICE,
  defaultSelection,
  findEvent,
  formatAsOf,
  formatDayTitle,
  formatMonthParam,
  formatMonthTitle,
  groupEventsByDate,
  kstToday,
  monthGrid,
  monthOf,
  parseDateParam,
  parseMonthParam,
  shiftMonth,
  weekdayHolidays,
  type EventDetailTarget,
  type YearMonth,
} from '@/lib/calendar'
import { useCalendar } from '@/lib/queries/useCalendar'
import type { CalendarEventRes } from '@/lib/apiTypes'

const NO_EVENTS: readonly CalendarEventRes[] = []

const DAY_LIST_ID = 'calendar-day'

function revealDayList() {
  const target = document.getElementById(DAY_LIST_ID)
  if (!target) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

function MonthStep({ direction, target, onStep }: { direction: 'prev' | 'next'; target: YearMonth; onStep: (ym: YearMonth) => void }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  return (
    <IconButton
      label={`${direction === 'prev' ? '이전 달' : '다음 달'} (${formatMonthTitle(target)})`}
      onClick={() => onStep(target)}
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
    </IconButton>
  )
}

export default function CalendarPage() {
  const { status } = useAuth()
  const { pathname, search } = useLocation()
  const [params, setParams] = useSearchParams()
  const today = useMemo(() => kstToday(new Date()), [])
  const [target, setTarget] = useState<EventDetailTarget | null>(null)

  const dateParam = parseDateParam(params.get('date'))
  const monthKey = formatMonthParam(
    parseMonthParam(params.get('month')) ?? monthOf(dateParam ?? today),
  )
  const month = useMemo(() => parseMonthParam(monthKey) ?? monthOf(today), [monthKey, today])
  const cells = useMemo(() => monthGrid(month), [month])
  const from = cells[0].date
  const to = cells[cells.length - 1].date
  const selected = dateParam && dateParam >= from && dateParam <= to ? dateParam : defaultSelection(month, today)

  const { data, loading, error, refetch } = useCalendar(from, to)
  const fresh = data && data.from === from && data.to === to ? data : null
  const pending = loading && !fresh
  const refreshing = loading && fresh !== null

  const eventsByDate = useMemo(() => groupEventsByDate(fresh?.events ?? []), [fresh])
  const holidays = useMemo(() => weekdayHolidays(fresh?.closedDates ?? []), [fresh])
  const rangeEmpty = fresh !== null && fresh.events.length === 0
  const selectedEvents = eventsByDate.get(selected) ?? NO_EVENTS
  const asOf = formatAsOf(fresh?.asOf ?? null)
  const failed = !loading && error !== null
  const targetRow = useMemo(() => (target ? findEvent(fresh?.events ?? [], target) : null), [fresh, target])
  const openEvent = useCallback(
    (item: CalendarEventRes) => setTarget({ ticker: item.ticker, kind: item.kind, date: item.date, label: item.label }),
    [],
  )
  const changeModal = useCallback((open: boolean) => {
    if (!open) setTarget(null)
  }, [])

  const update = useCallback(
    (next: { month?: string | null; date?: string | null }) => {
      setParams(
        (prev) => {
          const draft = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(next)) {
            if (value) draft.set(key, value)
            else draft.delete(key)
          }
          return draft
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const selectDate = useCallback(
    (date: string) => {
      const inGrid = date >= from && date <= to
      update({ month: inGrid ? monthKey : formatMonthParam(monthOf(date)), date })
    },
    [from, to, monthKey, update],
  )

  const stepMonth = useCallback((ym: YearMonth) => update({ month: formatMonthParam(ym), date: null }), [update])
  const goToday = useCallback(() => update({ month: null, date: null }), [update])
  const onCurrentMonth = monthKey === formatMonthParam(monthOf(today)) && selected === today

  const member = status === 'authenticated'
  const monthTitle = formatMonthTitle(month)

  return (
    <div className="fg-main fg-wrap fg-cal">
      <header className="fg-pagehead">
        <div>
          <h1 className="fg-pagehead__title">증시 캘린더</h1>
          <p className="fg-pagehead__sub">
            {member ? '휴장일과 주요 종목·관심종목의 배당·증자·주총 일정' : '휴장일과 주요 종목의 배당·증자·주총 일정'}
          </p>
        </div>
        {asOf && (
          <span className="fg-pagehead__meta">
            <span className="fg-num">{asOf}</span> 기준
          </span>
        )}
      </header>

      <CalendarMemberBanner />

      <div className="fg-grid">
        <div className="fg-col">
          <section aria-labelledby="calendar-month-title" className="fg-section fg-cal-month">
            <div className="fg-cal-month__head">
              <div className="fg-cal-month__nav">
                <MonthStep direction="prev" target={shiftMonth(month, -1)} onStep={stepMonth} />
                <h2 id="calendar-month-title" aria-live="polite" className="fg-section__title fg-cal-month__title fg-num">
                  {monthTitle}
                </h2>
                <MonthStep direction="next" target={shiftMonth(month, 1)} onStep={stepMonth} />
                <Button size="sm" className="fg-cal-month__today" onClick={goToday} disabled={onCurrentMonth}>
                  오늘
                </Button>
                <span aria-live="polite" className="fg-sr">
                  {refreshing ? '일정을 갱신하는 중' : ''}
                </span>
              </div>
              <FamilyLegend showFavorite={member} />
            </div>

            {rangeEmpty && (
              <p className="fg-cal-month__empty">
                이 기간에 일정이 없습니다 — 시장 캘린더는 주요 종목만 담아 비수기에는 빈 달이 생길 수 있습니다.
              </p>
            )}

            {!loading && error ? (
              <StateBlock
                kind="error"
                title={
                  error.isRetryable
                    ? '일시적으로 일정을 불러올 수 없습니다.'
                    : '일정을 불러오지 못했습니다. 페이지를 새로 고치면 다시 요청합니다.'
                }
                action={
                  error.isRetryable ? (
                    <Button size="sm" onClick={refetch}>
                      다시 시도
                    </Button>
                  ) : undefined
                }
                className="fg-cal-month__state"
              />
            ) : (
              <>
                <MonthGrid
                  label={`${monthTitle} 일정`}
                  cells={cells}
                  eventsByDate={eventsByDate}
                  holidays={holidays}
                  today={today}
                  selected={selected}
                  loading={pending}
                  onSelect={selectDate}
                />
                <div className="fg-cal-month__peek">
                  <p className="fg-cal-month__peek-text">
                    {formatDayTitle(selected)}
                    {!pending && (
                      <span className="fg-num">
                        {' · '}
                        {selectedEvents.length > 0 ? `일정 ${selectedEvents.length}건` : '일정 없음'}
                      </span>
                    )}
                  </p>
                  <Button variant="text" size="sm" onClick={revealDayList}>
                    일정 보기
                    <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
                  </Button>
                </div>
              </>
            )}

            <p className="fg-cal-month__foot">
              배당락일은 기준일과 휴장일로 계산하며, 휴장일 정보가 아직 없는 날은 <EstimateBadge />으로 표시합니다.
            </p>
          </section>
          <IpoBoard today={today} from={pathname + search} />
        </div>

        <div className="fg-rail">
          <DayEventList
            id={DAY_LIST_ID}
            date={selected}
            events={selectedEvents}
            holiday={holidays.has(selected)}
            loading={pending}
            failed={failed}
            onOpen={openEvent}
          />
          <Disclaimer text={CALENDAR_NOTICE} />
        </div>
      </div>

      <EventDetailModal
        target={target}
        fallback={targetRow}
        from={pathname + search}
        today={today}
        onOpenChange={changeModal}
      />
    </div>
  )
}
