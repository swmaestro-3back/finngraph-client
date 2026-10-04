import { ChevronRight, ExternalLink } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MockBadge } from '@/components/fg/Gap'
import { formatChange } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import { navState, stockTabSearch } from '@/lib/fg/stockDetail'
import { cn } from '@/lib/utils'

export type EventAction =
  | { kind: 'sheet'; href: string; open: () => void }
  | { kind: 'modal'; open: () => void }
  | { kind: 'link'; url: string }
  | { kind: 'button'; run: () => void }

export interface EventRow {
  key: string
  marker: string
  dateLabel: string
  title: string
  badge: ReactNode
  meta: string
  dayLabel: string | null
  change: number | null
  action: EventAction
}

interface ActionProps {
  action: EventAction
  className: string
  children: ReactNode
  onPick?: () => void
  selected?: boolean
}

function EventLink({ action, className, children, onPick, selected }: ActionProps) {
  const common = {
    className,
    'data-sel': selected ? 'true' : undefined,
    onMouseEnter: onPick,
    onFocus: onPick,
  }
  if (action.kind === 'link') {
    return (
      <a {...common} href={action.url} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  if (action.kind === 'modal') {
    return (
      <button {...common} type="button" aria-haspopup="dialog" onClick={action.open}>
        {children}
      </button>
    )
  }
  if (action.kind === 'button') {
    return (
      <button {...common} type="button" onClick={action.run}>
        {children}
      </button>
    )
  }
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    action.open()
  }
  return (
    <a {...common} href={action.href} aria-haspopup="dialog" onClick={open}>
      {children}
    </a>
  )
}

function ActionIcon({ action }: { action: EventAction }) {
  return action.kind === 'link' ? (
    <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
  ) : (
    <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
  )
}

interface StockEventListProps {
  title: string
  sub: string
  moreLabel: string
  mock: boolean
  rows: readonly EventRow[]
  selected: string | null
  onPick: (marker: string) => void
  tools?: ReactNode
  children?: ReactNode
}

export function StockEventList({ title, sub, moreLabel, mock, rows, selected, onPick, tools, children }: StockEventListProps) {
  const { pathname, search, state } = useLocation()
  return (
    <section className="fg-section fg-sev" aria-labelledby="fg-sev-title">
      <div className="fg-section__head">
        <div className="fg-sev__titles">
          <span className="fg-sev__title">
            <h2 id="fg-sev-title" className="fg-section__title">
              {title}
            </h2>
            {mock && <MockBadge />}
          </span>
          <p className="fg-section__sub">{sub}</p>
        </div>
        <Link
          to={{ pathname, search: stockTabSearch(search, 'news') }}
          state={navState(state)}
          replace
          className="fg-sdmore"
        >
          {moreLabel}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
      {tools}
      {rows.length > 0 && (
        <ol className="fg-sev__list" aria-label={title}>
          {rows.map((row) => (
            <li key={row.key}>
              <EventLink
                action={row.action}
                className="fg-sev__row fg-num"
                selected={row.marker === selected}
                onPick={() => onPick(row.marker)}
              >
                <span className="fg-sev__dia" aria-hidden="true" />
                <span className="fg-sev__date">{row.dateLabel}</span>
                <span className="fg-sev__body">
                  <span className="fg-sev__name">{row.title}</span>
                  <span className="fg-sev__meta">
                    {row.badge}
                    <span>
                      {row.meta}
                      <span className="fg-sev__mdate"> · {row.dateLabel}</span>
                    </span>
                  </span>
                </span>
                {row.change !== null && row.dayLabel ? (
                  <span className="fg-sev__chg">
                    <span className="fg-sev__chglbl">{row.dayLabel}</span>
                    <span className={cn('fg-sev__chgv', toneClass(row.change))}>{formatChange(row.change)}</span>
                  </span>
                ) : (
                  <span />
                )}
                <ActionIcon action={row.action} />
              </EventLink>
            </li>
          ))}
        </ol>
      )}
      {children}
    </section>
  )
}

interface EventCalloutProps {
  dateLabel: string
  title: string
  dayLabel: string | null
  change: number | null
  volumeRatio: number | null
  actionLabel: string
  action: EventAction
}

export function EventCallout({ dateLabel, title, dayLabel, change, volumeRatio, actionLabel, action }: EventCalloutProps) {
  return (
    <div className="fg-pc__callout fg-sdcall">
      <i className="fg-dia" aria-hidden="true" />
      <span className="fg-pc__callout-date">{dateLabel}</span>
      <span className="fg-pc__callout-title">{title}</span>
      {(change !== null || volumeRatio !== null) && (
        <span className="fg-pc__callout-meta">
          {change !== null && dayLabel && (
            <>
              {dayLabel} <b className={toneClass(change)}>{formatChange(change)}</b>
            </>
          )}
          {change !== null && dayLabel && volumeRatio !== null && ' · '}
          {volumeRatio !== null && `거래량 평소의 ${volumeRatio.toFixed(1)}배`}
        </span>
      )}
      <EventLink action={action} className="fg-sdmore fg-sdcall__go">
        {actionLabel}
        <ActionIcon action={action} />
      </EventLink>
    </div>
  )
}
