// Lucian UX/UI Prompt #031 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#031
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ListOption<T extends string> {
  value: T
  label: string
  hint?: string
}

interface ListSelectProps<T extends string> {
  label: string
  value: T
  options: readonly ListOption<T>[]
  onChange: (value: T) => void
  prefix?: ReactNode
  align?: 'left' | 'right'
  size?: 'md' | 'lg'
  block?: boolean
  className?: string
}

export function ListSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  prefix,
  align = 'right',
  size = 'md',
  block = false,
  className,
}: ListSelectProps<T>) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [swapped, setSwapped] = useState(false)
  const selected = Math.max(0, options.findIndex((option) => option.value === value))
  const current = options[selected]

  useEffect(() => {
    if (!open) return
    list.current?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  useEffect(() => {
    if (!open) return
    list.current?.querySelector<HTMLElement>(`[data-k="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active])

  const show = () => {
    setActive(selected)
    setOpen(true)
  }
  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }
  const pick = (index: number) => {
    const option = options[index]
    close(true)
    if (!option || option.value === value) return
    setSwapped(true)
    onChange(option.value)
  }

  const onButtonKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    show()
  }
  const onListKey = (event: KeyboardEvent) => {
    const last = options.length - 1
    if (event.key === 'ArrowDown') setActive((index) => Math.min(last, index + 1))
    else if (event.key === 'ArrowUp') setActive((index) => Math.max(0, index - 1))
    else if (event.key === 'Home') setActive(0)
    else if (event.key === 'End') setActive(last)
    else if (event.key === 'Enter' || event.key === ' ') pick(active)
    else if (event.key === 'Escape') close(true)
    else {
      if (event.key === 'Tab') close(false)
      return
    }
    event.preventDefault()
  }

  return (
    <div
      ref={root}
      className={cn(
        'fg-lsel',
        open && 'is-open',
        align === 'left' && 'fg-lsel--left',
        size === 'lg' && 'fg-lsel--lg',
        block && 'fg-lsel--block',
        className,
      )}
    >
      <button
        ref={button}
        type="button"
        className="fg-lsel__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? close(true) : show())}
        onKeyDown={onButtonKey}
      >
        <span id={`${id}-label`} className={prefix ? 'fg-lsel__pre' : 'fg-sr'}>
          {prefix ?? label}
        </span>
        <span key={value} id={`${id}-value`} className={cn('fg-lsel__v', swapped && 'is-swap')}>
          {current?.label}
          {current?.hint && <small>{current.hint}</small>}
        </span>
        <svg className="fg-lsel__car" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <path d="M4.5 7l4.5 4.5L13.5 7" />
        </svg>
      </button>
      <div
        ref={list}
        id={`${id}-list`}
        role="listbox"
        tabIndex={-1}
        aria-label={label}
        aria-activedescendant={open ? `${id}-o${active}` : undefined}
        className="fg-lsel__list"
        style={{ '--i': open ? active : selected } as CSSProperties}
        onKeyDown={onListKey}
        onBlur={(event) => {
          if (open && !root.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
        }}
      >
        <span className="fg-lsel__hl" aria-hidden="true" />
        {options.map((option, k) => (
          <div
            key={option.value}
            id={`${id}-o${k}`}
            data-k={k}
            role="option"
            aria-selected={k === selected}
            className="fg-lsel__o"
            onPointerMove={() => setActive(k)}
            onClick={() => pick(k)}
          >
            <span>
              {option.label}
              {option.hint && <small>{option.hint}</small>}
            </span>
            <svg className="fg-lsel__ck" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
              <path d="M4 9.5l3.5 3.5L14 6" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}
