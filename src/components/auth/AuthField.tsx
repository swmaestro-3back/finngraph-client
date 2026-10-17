import type { ReactNode } from 'react'

interface AuthFieldProps {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  trailing?: ReactNode
  children: ReactNode
}

export function AuthField({ id, label, error, hint, trailing, children }: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-caption font-medium text-foreground-secondary">
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-caption text-destructive break-keep">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-caption text-muted-foreground break-keep">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
