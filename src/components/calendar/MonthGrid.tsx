import { useEffect, useRef, type KeyboardEvent } from 'react'
import { DayCell } from '@/components/calendar/DayCell'
import type { CalendarEventRes } from '@/lib/apiTypes'
import { WEEKDAY_LABELS, keyboardTarget, type GridCell } from '@/lib/calendar'
import { cn } from '@/lib/utils'

const NO_EVENTS: readonly CalendarEventRes[] = []

interface MonthGridProps {
  label: string
  cells: readonly GridCell[]
  eventsByDate: ReadonlyMap<string, CalendarEventRes[]>
  holidays: ReadonlySet<string>
  today: string
  selected: string
  loading: boolean
  onSelect: (date: string) => void
}

export function MonthGrid({ label, cells, eventsByDate, holidays, today, selected, loading, onSelect }: MonthGridProps) {
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const pendingFocus = useRef<string | null>(null)

  useEffect(() => {
    if (pendingFocus.current !== selected) return
    const target = buttons.current.get(selected)
    if (!target) return
    target.focus()
    pendingFocus.current = null
  }, [selected, cells])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const target = keyboardTarget(date, event.key)
    if (!target) return
    event.preventDefault()
    pendingFocus.current = target
    onSelect(target)
  }

  const rows = Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7))

  return (
    <div role="grid" aria-label={label} aria-busy={loading || undefined} className="flex flex-col">
      <div role="row" className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_LABELS.map((weekday, index) => (
          <span
            key={weekday}
            role="columnheader"
            className={cn(
              'py-2 text-center text-caption font-medium',
              index === 0 || index === 6 ? 'text-muted-foreground' : 'text-foreground-secondary',
            )}
          >
            {weekday}
          </span>
        ))}
      </div>
      <div className="grid gap-px bg-border">
        {rows.map((week) => (
          <div key={week[0].date} role="row" className="grid grid-cols-7 gap-px">
            {week.map((cell) => (
              <DayCell
                key={cell.date}
                cell={cell}
                events={eventsByDate.get(cell.date) ?? NO_EVENTS}
                isToday={cell.date === today}
                isSelected={cell.date === selected}
                isHoliday={holidays.has(cell.date)}
                loading={loading}
                buttonRef={(node) => {
                  if (node) buttons.current.set(cell.date, node)
                  else buttons.current.delete(cell.date)
                }}
                onSelect={onSelect}
                onKeyDown={handleKeyDown}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
