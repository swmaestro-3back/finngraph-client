import { useState, type ComponentProps } from 'react'
import { Circle, CircleCheck, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PASSWORD_RULES } from '@/lib/authValidation'
import { cn } from '@/lib/utils'

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, 'type'>

export function PasswordField({ className, disabled, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-9', className)}
        disabled={disabled}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((value) => !value)}
        className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="size-3.5" strokeWidth={2} />
        ) : (
          <Eye className="size-3.5" strokeWidth={2} />
        )}
      </button>
    </div>
  )
}

interface PasswordRulesProps {
  value: string
  showErrors: boolean
}

export function PasswordRules({ value, showErrors }: PasswordRulesProps) {
  return (
    <ul aria-label="비밀번호 조건" className="grid grid-cols-2 gap-x-4 gap-y-1">
      {PASSWORD_RULES.map((rule) => {
        const satisfied = rule.test(value)
        return (
          <li
            key={rule.key}
            className={cn(
              'flex items-center gap-1.5 text-caption transition-colors',
              satisfied
                ? 'text-foreground'
                : showErrors
                  ? 'text-destructive'
                  : 'text-muted-foreground',
            )}
          >
            {satisfied ? (
              <CircleCheck
                key="satisfied"
                className="size-3.5 text-primary motion-safe:auth-pop"
                strokeWidth={2}
              />
            ) : (
              <Circle key="pending" className="size-3.5" strokeWidth={1.5} />
            )}
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
