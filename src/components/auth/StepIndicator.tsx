// Lucian UX/UI Prompt #042 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#042
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  steps: readonly string[]
  current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol aria-label="가입 단계" className="fg-step">
      {steps.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo'
        const last = index === steps.length - 1
        return (
          <li
            key={label}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn('fg-step__it', !last && 'is-grow')}
          >
            <span key={state} className="fg-step__dot">
              {state === 'done' ? (
                <svg viewBox="0 0 14 14" aria-hidden>
                  <path d="M3 7.3l2.7 2.7L11 4.5" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span className={cn('fg-step__lab', state !== 'current' && 'max-sm:sr-only')}>
              {label}
            </span>
            {!last && (
              <span aria-hidden className="fg-step__seg">
                <span />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
