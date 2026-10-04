import { useRef, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { nextTabIndex } from '@/lib/fg/tabs'
import { useSlidingMark } from '@/lib/fg/useSlidingMark'
import { cn } from '@/lib/utils'

export interface TabOption<T extends string> {
  value: T
  label: string
  count?: number | null
}

interface TabListProps<T extends string> {
  label: string
  options: readonly TabOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

interface TabButtonsProps<T extends string> {
  options: readonly TabOption<T>[]
  value: T
  onChange: (value: T) => void
  tabClass?: string
}

function TabButtons<T extends string>({ options, value, onChange, tabClass }: TabButtonsProps<T>) {
  const current = options.findIndex((option) => option.value === value)
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextTabIndex(e.key, current, options.length)
    if (next === null) return
    e.preventDefault()
    onChange(options[next].value)
    e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }
  return (
    <>
      {options.map((option, i) => {
        const selected = i === current
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            className={tabClass}
            aria-selected={selected}
            tabIndex={selected || (current < 0 && i === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
          >
            {option.label}
            {option.count !== undefined && option.count !== null && (
              <span className="fg-tab__count fg-num">{option.count}</span>
            )}
          </button>
        )
      })}
    </>
  )
}

export function UnderlineTabs<T extends string>({ label, className, options, value, onChange }: TabListProps<T>) {
  const list = useRef<HTMLDivElement>(null)
  const mark = useRef<HTMLSpanElement>(null)
  useSlidingMark(list, mark, options.findIndex((option) => option.value === value))
  return (
    <div ref={list} className={cn('fg-tabs', className)} role="tablist" aria-label={label}>
      <span ref={mark} className="fg-tabs__mark" aria-hidden="true" />
      <TabButtons tabClass="fg-tab" options={options} value={value} onChange={onChange} />
    </div>
  )
}

export function Segment<T extends string>({ label, className, options, value, onChange }: TabListProps<T>) {
  const list = useRef<HTMLDivElement>(null)
  const mark = useRef<HTMLSpanElement>(null)
  useSlidingMark(list, mark, options.findIndex((option) => option.value === value))
  return (
    <div ref={list} className={cn('fg-seg', className)} role="tablist" aria-label={label}>
      <span ref={mark} className="fg-seg__mark" aria-hidden="true" />
      <TabButtons options={options} value={value} onChange={onChange} />
    </div>
  )
}

interface HeadingTabOption {
  key: string
  label: string
  to: string
}

interface HeadingTabsProps {
  label: string
  options: readonly HeadingTabOption[]
  current: string
  className?: string
}

export function HeadingTabs({ label, options, current, className }: HeadingTabsProps) {
  return (
    <nav className={cn('fg-htabs', className)} aria-label={label}>
      {options.map((option) => (
        <Link
          key={option.key}
          to={option.to}
          replace
          className="fg-htab"
          aria-current={option.key === current ? 'page' : undefined}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  )
}
