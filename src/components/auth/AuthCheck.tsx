// Lucian UX/UI Prompt #068 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#068
import { cn } from '@/lib/utils'

interface AuthCheckProps {
  id?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  tone?: 'accent' | 'ink'
  size?: 'md' | 'lg'
}

export function AuthCheck({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  tone = 'accent',
  size = 'md',
}: AuthCheckProps) {
  return (
    <span className={cn('fg-ck', tone === 'ink' && 'fg-ck--ink', size === 'lg' && 'fg-ck--lg')}>
      <input
        id={id}
        type="checkbox"
        className="fg-ck__in"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <span aria-hidden className="fg-ck__box">
        <svg viewBox="0 0 24 24">
          <path d="M6 12.5l4 4L18 8" />
        </svg>
      </span>
    </span>
  )
}
