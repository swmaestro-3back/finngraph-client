// Lucian UX/UI Prompt #026 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#026
import type { ComponentProps, CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type CodeInputProps = Omit<ComponentProps<'input'>, 'value' | 'maxLength'> & {
  value: string
  length: number
  invalid?: boolean
  checking?: boolean
  shake?: number
}

export function CodeInput({
  value,
  length,
  invalid = false,
  checking = false,
  shake = 0,
  className,
  ...props
}: CodeInputProps) {
  const next = Math.min(value.length, length - 1)
  return (
    <div className={cn('fg-code', invalid && 'is-bad', checking && 'is-check', className)}>
      <div aria-hidden className="fg-code__row" data-shake={shake === 0 ? undefined : shake % 2 ? 'a' : 'b'}>
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            className={cn(
              'fg-code__c',
              index < value.length && 'is-fill',
              index === next && 'is-next',
              index === value.length && 'is-caret',
            )}
            style={{ '--i': index } as CSSProperties}
          >
            {value[index] ? <span key={value[index]}>{value[index]}</span> : null}
          </span>
        ))}
      </div>
      <input className="fg-code__real" value={value} maxLength={length} {...props} />
    </div>
  )
}
