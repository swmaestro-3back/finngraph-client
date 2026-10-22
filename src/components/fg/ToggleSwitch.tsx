// Lucian UX/UI Prompt #013 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#013
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const STRETCH_MS = 170

export type SwitchTone = 'mint' | 'violet' | 'warm'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  children: ReactNode
  tone?: SwitchTone
  disabled?: boolean
  className?: string
}

export function ToggleSwitch({ checked, onChange, children, tone = 'mint', disabled = false, className }: ToggleSwitchProps) {
  const [stretch, setStretch] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const hold = () => {
    window.clearTimeout(timer.current)
    setStretch(true)
  }
  const release = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStretch(false), STRETCH_MS)
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn('fg-sw', tone !== 'mint' && `fg-sw--${tone}`, stretch && 'is-stretch', className)}
      onPointerDown={hold}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onClick={() => {
        if (!stretch) {
          hold()
          release()
        }
        onChange(!checked)
      }}
    >
      <span className="fg-sw__track" aria-hidden="true">
        <span className="fg-sw__knob">
          <svg viewBox="0 0 24 24" focusable="false">
            <path className="fg-sw__x" d="M7.5 7.5l9 9M16.5 7.5l-9 9" />
            <path className="fg-sw__v" d="M5.5 12.5l4.5 4.5 8.5-9" />
          </svg>
        </span>
      </span>
      {children}
    </button>
  )
}
