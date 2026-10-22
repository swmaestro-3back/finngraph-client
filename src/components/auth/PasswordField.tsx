// Lucian UX/UI Prompt #062 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#062
// Lucian UX/UI Prompt #036 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#036
import { useState, type ComponentProps } from 'react'
import { PASSWORD_RULES } from '@/lib/authValidation'
import { cn } from '@/lib/utils'

type PasswordFieldProps = Omit<ComponentProps<'input'>, 'type'>

export function PasswordField({ className, disabled, placeholder = ' ', ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <>
      <input
        type={visible ? 'text' : 'password'}
        className={cn('fg-af__in', className)}
        disabled={disabled}
        placeholder={placeholder}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((value) => !value)}
        className="fg-af__eye"
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <g className="fg-af__lid">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="3" />
          </g>
          <path className="fg-af__slash" d="M4 4l16 16" />
        </svg>
      </button>
    </>
  )
}

interface PasswordRulesProps {
  value: string
  showErrors: boolean
}

export function PasswordRules({ value, showErrors }: PasswordRulesProps) {
  const level = PASSWORD_RULES.filter((rule) => rule.test(value)).length
  return (
    <div className="fg-pw" data-level={level}>
      <div aria-hidden className="fg-pw__meter">
        {PASSWORD_RULES.map((rule, index) => (
          <i key={rule.key} className={index < level ? 'is-on' : undefined} />
        ))}
      </div>
      <ul aria-label="비밀번호 조건" className="fg-pw__rules">
        {PASSWORD_RULES.map((rule) => {
          const satisfied = rule.test(value)
          return (
            <li
              key={rule.key}
              className={cn('fg-pw__r', satisfied ? 'is-ok' : showErrors && 'is-bad')}
            >
              <i aria-hidden>
                <svg viewBox="0 0 18 18">
                  <path d="M5 9.3l2.6 2.6L13 6.5" />
                </svg>
              </i>
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
