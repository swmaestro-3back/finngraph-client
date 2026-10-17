import type { KeyboardEvent, Ref } from 'react'
import { EventMarker } from '@/components/calendar/EventMarker'
import type { CalendarEventRes } from '@/lib/apiTypes'
import {
  KIND_LABELS,
  KIND_SHORT_LABELS,
  cellPreview,
  formatDayTitle,
  kindFamily,
  type GridCell,
} from '@/lib/calendar'
import { cn } from '@/lib/utils'

interface DayCellProps {
  cell: GridCell
  events: readonly CalendarEventRes[]
  isToday: boolean
  isSelected: boolean
  isHoliday: boolean
  loading: boolean
  buttonRef: Ref<HTMLButtonElement>
  onSelect: (date: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, date: string) => void
}

function accessibleName(cell: GridCell, count: number, isToday: boolean, isHoliday: boolean): string {
  const parts = [formatDayTitle(cell.date)]
  if (isToday) parts.push('오늘')
  if (isHoliday) parts.push('휴장')
  parts.push(count > 0 ? `일정 ${count}건` : '일정 없음')
  return parts.join(', ')
}

export function DayCell({
  cell,
  events,
  isToday,
  isSelected,
  isHoliday,
  loading,
  buttonRef,
  onSelect,
  onKeyDown,
}: DayCellProps) {
  const weekend = cell.weekday === 0 || cell.weekday === 6
  const { shown, more } = cellPreview(events)
  const showMarkers = !loading && events.length > 0
  const showChips = showMarkers && cell.inMonth

  return (
    <button
      ref={buttonRef}
      type="button"
      role="gridcell"
      aria-selected={isSelected}
      aria-label={accessibleName(cell, events.length, isToday, isHoliday)}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onSelect(cell.date)}
      onKeyDown={(event) => onKeyDown(event, cell.date)}
      className={cn(
        'fg-cal-day',
        !cell.inMonth && 'fg-cal-day--out',
        (weekend || isHoliday) && 'fg-cal-day--off',
        isHoliday && 'fg-cal-day--holiday',
        isToday && 'fg-cal-day--today',
        isSelected && 'fg-cal-day--selected',
      )}
    >
      <span aria-hidden className="fg-cal-day__top">
        <span className="fg-cal-day__num fg-num">{cell.day}</span>
        {isHoliday && <span className="fg-cal-tag">휴장</span>}
      </span>

      {loading && cell.inMonth && <span aria-hidden className="fg-skel fg-cal-day__skel" />}

      {showChips && (
        <span aria-hidden className="fg-cal-day__chips">
          {shown.map((item, index) => (
            <span
              key={`${index}-${item.kind}-${item.ticker}`}
              title={`${item.stockName} ${KIND_LABELS[item.kind]}`}
              className={cn('fg-cal-chip', item.favorite && 'fg-cal-chip--fav')}
            >
              <EventMarker family={kindFamily(item.kind)} favorite={item.favorite} />
              <span className="fg-cal-chip__name">{item.stockName}</span>
              <span className="fg-cal-chip__kind">{KIND_SHORT_LABELS[item.kind]}</span>
            </span>
          ))}
          {more > 0 && <span className="fg-cal-day__more fg-num">+{more}</span>}
        </span>
      )}

      {showMarkers && (
        <span aria-hidden className={cn('fg-cal-day__dots', !cell.inMonth && 'fg-cal-day__dots--out')}>
          {shown.map((item, index) => (
            <EventMarker key={`${index}-${item.kind}-${item.ticker}`} family={kindFamily(item.kind)} favorite={item.favorite} />
          ))}
          {more > 0 && <span className="fg-cal-day__more fg-num">+{more}</span>}
        </span>
      )}
    </button>
  )
}
