import { useCallback, useMemo } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, CircleAlert, RotateCw } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { CalendarMemberBanner } from '@/components/calendar/CalendarMemberBanner'
import { DayEventList } from '@/components/calendar/DayEventList'
import { EstimateBadge, FamilyLegend } from '@/components/calendar/EventMarker'
import { IpoBoard } from '@/components/calendar/IpoBoard'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import {
  CALENDAR_NOTICE,
  defaultSelection,
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
    <button
      type="button"
      aria-label={`${direction === 'prev' ? '이전 달' : '다음 달'} (${formatMonthTitle(target)})`}
      onClick={() => onStep(target)}
      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Icon className="size-4" strokeWidth={2} />
    </button>
  )
}

export default function CalendarPage() {
  const { status } = useAuth()
  const { pathname, search } = useLocation()
  const [params, setParams] = useSearchParams()
  const today = useMemo(() => kstToday(new Date()), [])

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
    <div className="page-container pb-12 pt-7">
      <header className="mb-5 flex flex-wrap items-baseline gap-x-[9px] gap-y-1">
        <h1 className="text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">증시 캘린더</h1>
        <span className="text-body text-muted-foreground break-keep">
          {member ? '휴장일과 KRX300·관심종목의 배당·증자·주총 일정' : '휴장일과 KRX300 종목의 배당·증자·주총 일정'}
        </span>
      </header>

      <CalendarMemberBanner className="mb-5" />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="calendar-month-title" className="card-surface overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4">
            <div className="flex items-center gap-1">
              <MonthStep direction="prev" target={shiftMonth(month, -1)} onStep={stepMonth} />
              <h2
                id="calendar-month-title"
                aria-live="polite"
                className="min-w-[6em] text-center text-title md:min-w-[7.5em] font-medium tabular-nums tracking-[-0.5px] text-foreground"
              >
                {monthTitle}
              </h2>
              <MonthStep direction="next" target={shiftMonth(month, 1)} onStep={stepMonth} />
              <Button variant="outline" size="sm" className="ml-2 shrink-0" onClick={goToday} disabled={onCurrentMonth}>
                오늘
              </Button>
              <span aria-live="polite" className="sr-only">
                {refreshing ? '일정을 갱신하는 중' : ''}
              </span>
            </div>
            <FamilyLegend showFavorite={member} />
          </div>

          {rangeEmpty && (
            <p className="border-t border-border bg-muted px-5 py-2.5 text-caption text-muted-foreground break-keep [text-wrap:pretty]">
              이 기간에 일정이 없습니다 — 시장 캘린더는 KRX300 종목만 담아 비수기에는 빈 달이 생길 수 있습니다.
            </p>
          )}

          {!loading && error ? (
            <div className="flex flex-col items-center justify-center gap-4 border-t border-border px-5 py-24 text-center">
              <CircleAlert className="size-8 text-muted-foreground" />
              <p className="text-body text-muted-foreground">
                {error.isRetryable
                  ? '일시적으로 일정을 불러올 수 없습니다.'
                  : '일정을 불러오지 못했습니다. 페이지를 새로 고치면 다시 요청합니다.'}
              </p>
              {error.isRetryable && (
                <Button variant="outline" size="sm" onClick={refetch}>
                  <RotateCw data-icon="inline-start" />
                  다시 시도
                </Button>
              )}
            </div>
          ) : (
            <div className="border-t border-border">
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
              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2 xl:hidden">
                <p className="min-w-0 truncate text-caption text-foreground-secondary">
                  {formatDayTitle(selected)}
                  {!pending && (
                    <span className="font-mono tabular-nums">
                      {' · '}
                      {selectedEvents.length > 0 ? `일정 ${selectedEvents.length}건` : '일정 없음'}
                    </span>
                  )}
                </p>
                <Button variant="ghost" size="sm" className="shrink-0" onClick={revealDayList}>
                  일정 보기
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}

          <p className="border-t border-border px-5 py-3 text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
            {asOf && (
              <>
                <span className="font-mono tabular-nums">{asOf}</span> 기준 ·{' '}
              </>
            )}
            배당락일은 기준일과 휴장일로 계산하며, 휴장일 정보가 아직 없는 날은 <EstimateBadge />으로 표시합니다.
          </p>
        </section>

        <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-1">
          <DayEventList
            id={DAY_LIST_ID}
            date={selected}
            events={selectedEvents}
            holiday={holidays.has(selected)}
            loading={pending}
            failed={failed}
            from={pathname + search}
          />
          <IpoBoard today={today} />
        </div>
      </div>

      <p className="mt-5 text-caption text-muted-foreground break-keep [text-wrap:pretty]">{CALENDAR_NOTICE}</p>
    </div>
  )
}
