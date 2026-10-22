// Lucian UX/UI Prompt #025 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#025
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface NotchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string
  srLabel?: string
  icon?: ReactNode
  trailing?: ReactNode
  className?: string
}

export function NotchField({ label, srLabel, icon, trailing, className, placeholder, ...input }: NotchFieldProps) {
  const hint = placeholder !== undefined && placeholder !== label
  return (
    <label
      className={cn('fg-notch', icon !== undefined && 'fg-notch--icon', trailing !== undefined && 'fg-notch--trail', className)}
      data-hint={hint || undefined}
    >
      {icon}
      {srLabel && <span className="fg-sr">{srLabel}</span>}
      <input className="fg-notch__in" placeholder={placeholder ?? ' '} {...input} />
      <span className="fg-notch__lab" aria-hidden={srLabel ? true : undefined}>
        {label}
      </span>
      <fieldset className="fg-notch__line" aria-hidden="true">
        <legend>
          <span>{label}</span>
        </legend>
      </fieldset>
      {trailing}
    </label>
  )
}
