import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  steps: readonly string[]
  current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol aria-label="가입 단계" className="flex items-center gap-2">
      {steps.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo'
        const last = index === steps.length - 1
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            className={cn('flex items-center gap-2', !last && 'flex-1')}
          >
            <span
              key={state}
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-micro font-semibold tabular-nums transition-colors duration-300',
                state === 'done' &&
                  'border-primary bg-primary text-primary-foreground motion-safe:auth-pop',
                state === 'current' && 'border-primary text-primary',
                state === 'todo' && 'border-border text-muted-foreground',
              )}
            >
              {state === 'done' ? <Check className="size-3" strokeWidth={2.5} /> : index + 1}
            </span>
            <span
              className={cn(
                'text-caption font-medium whitespace-nowrap transition-colors duration-300',
                state === 'current' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {!last && (
              <span aria-hidden className="relative h-px min-w-3 flex-1 overflow-hidden bg-border">
                <span
                  className={cn(
                    'absolute inset-0 origin-left bg-primary transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
                    index < current ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
