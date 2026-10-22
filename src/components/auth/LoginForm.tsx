// Lucian UX/UI Prompt #062 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#062
import { useState, type FormEvent } from 'react'
import { AuthField } from '@/components/auth/AuthField'
import { FormNotice } from '@/components/auth/FormNotice'
import { KakaoSignIn } from '@/components/auth/KakaoSignIn'
import { LockNotice } from '@/components/auth/LockNotice'
import { PasswordField } from '@/components/auth/PasswordField'
import { ApiError, postData } from '@/lib/api'
import type { AuthTokenRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import {
  FIELD_MESSAGES,
  describedBy,
  isEmailValid,
  localizeFieldErrors,
  retryAfterSeconds,
} from '@/lib/authValidation'
import { useCountdown } from '@/lib/useCountdown'
import { cn } from '@/lib/utils'

interface LoginFormProps {
  next: string
  initialEmail?: string
  notice?: string | null
}

export function LoginForm({ next, initialEmail = '', notice = null }: LoginFormProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [noticeVisible, setNoticeVisible] = useState(notice !== null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [shaking, setShaking] = useState(false)
  const lockSeconds = useCountdown(lockedUntil)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = email.trim()
    const errors: Record<string, string> = {}
    if (!isEmailValid(trimmed)) errors.email = FIELD_MESSAGES.email
    if (password.length === 0) errors.password = '비밀번호를 입력해 주세요'
    setNoticeVisible(false)
    setFormError(null)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setShaking(true)
      return
    }

    setSubmitting(true)
    try {
      const session = await postData<AuthTokenRes>('/v1/auth/login', { email: trimmed, password })
      login(session)
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError('알 수 없는 오류가 발생했어요')
      } else if (err.code === 'INVALID_CREDENTIALS') {
        setFormError('이메일 또는 비밀번호가 올바르지 않아요')
        setShaking(true)
      } else if (err.code === 'INVALID_PARAMETER') {
        setFieldErrors(localizeFieldErrors(err.details))
        setFormError('입력값을 확인해 주세요')
        setShaking(true)
      } else if (err.code === 'RATE_LIMITED') {
        setLockedUntil(Date.now() + retryAfterSeconds(err.details) * 1000)
      } else {
        setFormError(err.isRetryable ? '일시적인 오류예요. 잠시 후 다시 시도해 주세요' : err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const locked = lockSeconds > 0

  return (
    <>
      <form
        onSubmit={submit}
        noValidate
        className={cn('flex flex-col gap-5', shaking && 'fg-au-shake')}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setShaking(false)
        }}
      >
        <AuthField
          id="login-email"
          label="이메일"
          error={fieldErrors.email}
          ok={isEmailValid(email)}
        >
          <input
            id="login-email"
            type="email"
            className="fg-af__in"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus={initialEmail.length === 0}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={describedBy('login-email', fieldErrors.email)}
            required
          />
        </AuthField>

        <AuthField id="login-password" label="비밀번호" error={fieldErrors.password}>
          <PasswordField
            id="login-password"
            autoComplete="current-password"
            autoFocus={initialEmail.length > 0}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={describedBy('login-password', fieldErrors.password)}
            required
          />
        </AuthField>

        {noticeVisible && notice && <FormNotice tone="info">{notice}</FormNotice>}
        {formError && <FormNotice tone="error">{formError}</FormNotice>}
        {locked && (
          <LockNotice seconds={lockSeconds}>
            요청이 너무 잦아요.{' '}
            <span key={lockSeconds} className="fg-au-lock__n">
              {lockSeconds}
            </span>
            초 후 다시 시도할 수 있어요
          </LockNotice>
        )}

        <button
          type="submit"
          disabled={submitting || locked}
          aria-busy={submitting || undefined}
          className="fg-au-go"
        >
          <span key={submitting ? 'busy' : 'idle'} className="fg-au-go__in">
            {submitting ? (
              <>
                <span aria-hidden className="fg-au-spin" />
                로그인 중…
              </>
            ) : (
              '로그인'
            )}
          </span>
        </button>
      </form>

      <KakaoSignIn next={next} disabled={submitting} />
    </>
  )
}
