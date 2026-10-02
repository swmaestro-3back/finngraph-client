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
  const dimmed = !cell.inMonth || weekend || isHoliday
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
        'relative flex min-h-16 min-w-0 cursor-pointer flex-col items-stretch bg-background p-1.5 text-left transition-colors md:min-h-28 md:p-2',
        'outline-none hover:bg-muted focus-visible:z-20 focus-visible:outline-solid focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring/50',
        isHoliday && 'bg-muted hover:bg-surface-inset',
        isSelected && 'z-10 ring-1 ring-inset ring-primary',
      )}
    >
      <span aria-hidden className="flex items-start justify-between gap-1">
        <span
          className={cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-body tabular-nums leading-none',
            dimmed ? 'text-muted-foreground' : 'text-foreground',
            cell.inMonth && 'font-medium',
            isToday && 'bg-foreground font-semibold text-background',
            isSelected && !isToday && 'font-semibold text-primary',
          )}
        >
          {cell.day}
        </span>
        {isHoliday && (
          <span className="hidden pt-0.5 text-micro font-medium leading-none text-foreground-secondary md:inline">휴장</span>
        )}
      </span>

      {loading && cell.inMonth && (
        <span aria-hidden className="mt-2 hidden h-3 w-4/5 animate-pulse rounded-sm bg-surface-inset motion-reduce:animate-none md:block" />
      )}

      {showChips && (
        <span aria-hidden className="mt-1.5 hidden min-w-0 flex-col gap-0.5 md:flex">
          {shown.map((item, index) => (
            <span
              key={`${index}-${item.kind}-${item.ticker}`}
              title={`${item.stockName} ${KIND_LABELS[item.kind]}`}
              className={cn(
                '@container flex min-w-0 items-center gap-1 rounded-sm px-1 py-0.5 text-caption leading-tight',
                item.favorite ? 'bg-surface-inset font-medium text-foreground' : 'text-foreground-secondary',
              )}
            >
              <EventMarker family={kindFamily(item.kind)} favorite={item.favorite} />
              <span className="min-w-0 truncate">{item.stockName}</span>
              <span
                className={cn(
                  'hidden shrink-0 @[8rem]:inline',
                  item.favorite ? 'text-foreground-secondary' : 'text-muted-foreground',
                )}
              >
                {KIND_SHORT_LABELS[item.kind]}
              </span>
            </span>
          ))}
          {more > 0 && (
            <span className="px-1 font-mono text-micro font-medium tabular-nums text-muted-foreground">+{more}</span>
          )}
        </span>
      )}

      {(showMarkers || isHoliday) && (
        <span
          aria-hidden
          className={cn(
            'mt-auto flex flex-wrap items-center gap-0.5 pt-1',
            (cell.inMonth || !showMarkers) && 'md:hidden',
          )}
        >
          {isHoliday && (
            <span className="w-full text-micro font-medium leading-none text-foreground-secondary md:hidden">휴장</span>
          )}
          {showMarkers &&
            shown.map((item, index) => (
              <EventMarker key={`${index}-${item.kind}-${item.ticker}`} family={kindFamily(item.kind)} favorite={item.favorite} />
            ))}
          {showMarkers && more > 0 && (
            <span className="font-mono text-micro tabular-nums leading-none text-muted-foreground">+{more}</span>
          )}
        </span>
      )}
    </button>
  )
}
