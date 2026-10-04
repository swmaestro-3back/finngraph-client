import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_HEIGHT = 56

export interface SectionTab<T extends string> {
  key: T
  label: string
}

export function useTabParam<T extends string>(tabs: SectionTab<T>[], fallback: T): [T, (next: T) => void] {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const raw = params.get('tab')
  const tab = tabs.some((t) => t.key === raw) ? (raw as T) : fallback

  const setTab = useCallback(
    (next: T) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          if (next === fallback) updated.delete('tab')
          else updated.set('tab', next)
          return updated
        },
        { replace: true, state: location.state },
      )
    },
    [setParams, location.state, fallback],
  )

  return [tab, setTab]
}

interface SectionTabsProps<T extends string> {
  tabs: SectionTab<T>[]
  value: T
  onChange: (next: T) => void
  idPrefix: string
  label: string
  mini?: ReactNode
  counts?: Partial<Record<T, number>>
  children: ReactNode
}

export function SectionTabs<T extends string>({
  tabs,
  value,
  onChange,
  idPrefix,
  label,
  mini,
  counts,
  children,
}: SectionTabsProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({})
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    let frame = 0
    const update = () => {
      frame = 0
      setStuck(sentinel.getBoundingClientRect().top < NAV_HEIGHT)
    }
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [])

  const select = (next: T, focus = false) => {
    onChange(next)
    if (focus) tabRefs.current[next]?.focus()
    const sentinel = sentinelRef.current
    if (stuck && sentinel) {
      window.scrollTo({ top: sentinel.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT })
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.key === value)
    const last = tabs.length - 1
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (target === null) return
    event.preventDefault()
    select(tabs[target].key, true)
  }

  return (
    <section aria-label={label} className="mt-10">
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div className="sticky top-14 z-30 -mx-2 border-b border-border bg-background px-2 md:top-16">
        <div className="flex items-center gap-6">
          {mini && (
            <div
              aria-hidden
              className={cn('hidden min-w-0 shrink-0 items-baseline gap-2 md:flex', !stuck && 'md:hidden')}
            >
              {mini}
            </div>
          )}
          <div
            role="tablist"
            aria-label={label}
            onKeyDown={onKeyDown}
            className="-mb-px flex min-w-0 flex-1 gap-5 overflow-x-auto"
          >
            {tabs.map((tab) => {
              const active = tab.key === value
              const count = counts?.[tab.key]
              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[tab.key] = el
                  }}
                  type="button"
                  role="tab"
                  id={`${idPrefix}-tab-${tab.key}`}
                  aria-selected={active}
                  aria-controls={`${idPrefix}-panel-${tab.key}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => select(tab.key)}
                  className={cn(
                    'shrink-0 cursor-pointer whitespace-nowrap py-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    active
                      ? 'text-primary shadow-[inset_0_-2px_0_0_var(--primary)]'
                      : 'text-foreground-secondary hover:text-foreground',
                  )}
                >
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span className="ml-1 font-mono text-caption tabular-nums text-muted-foreground">{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${idPrefix}-panel-${value}`}
        aria-labelledby={`${idPrefix}-tab-${value}`}
        tabIndex={0}
        className="pt-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {children}
      </div>
    </section>
  )
}
