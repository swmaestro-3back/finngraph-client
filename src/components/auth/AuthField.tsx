// Lucian UX/UI Prompt #025 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#025
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AuthFieldProps {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  trailing?: ReactNode
  action?: ReactNode
  after?: ReactNode
  ok?: boolean
  variant?: 'float' | 'plain'
  className?: string
  children: ReactNode
}

export function AuthField({
  id,
  label,
  error,
  hint,
  trailing,
  action,
  after,
  ok = false,
  variant = 'float',
  className,
  children,
}: AuthFieldProps) {
  const help = error ? (
    <p id={`${id}-error`} className="fg-af__err">
      {error}
    </p>
  ) : hint ? (
    <p id={`${id}-hint`} className="fg-af__hint">
      {hint}
    </p>
  ) : null

  if (variant === 'plain') {
    return (
      <div className={cn('fg-af', className)}>
        <div className="fg-af__top">
          <label htmlFor={id} className="fg-af__toplab">
            {label}
          </label>
          {trailing}
        </div>
        {children}
        {help}
        {after}
      </div>
    )
  }

  const box = (
    <div className="fg-af__box">
      {children}
      <fieldset aria-hidden className="fg-af__line">
        <legend>
          <span>{label}</span>
        </legend>
      </fieldset>
      <label htmlFor={id} className="fg-af__lab">
        {label}
      </label>
      {trailing && <span className="fg-af__trail">{trailing}</span>}
      <span aria-hidden className="fg-af__ok">
        <svg viewBox="0 0 14 14">
          <path d="M3 7.3l2.7 2.7L11 4.5" />
        </svg>
      </span>
    </div>
  )

  return (
    <div className={cn('fg-af', error ? 'is-bad' : ok && 'is-ok', className)}>
      {action ? (
        <div className="fg-af__row">
          {box}
          {action}
        </div>
      ) : (
        box
      )}
      {help}
      {after}
    </div>
  )
}
