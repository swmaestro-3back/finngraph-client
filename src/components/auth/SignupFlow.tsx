// Lucian UX/UI Prompt #093 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#093
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthField } from '@/components/auth/AuthField'
import { CodeInput } from '@/components/auth/CodeInput'
import { ConsentStep } from '@/components/auth/ConsentStep'
import { FormNotice } from '@/components/auth/FormNotice'
import { KakaoSignIn } from '@/components/auth/KakaoSignIn'
import { LockNotice } from '@/components/auth/LockNotice'
import { PasswordField, PasswordRules } from '@/components/auth/PasswordField'
import { StepIndicator } from '@/components/auth/StepIndicator'
import { LucianIcon } from '@/components/fg/LucianIcon'
import { ApiError, postData } from '@/lib/api'
import type { AuthTokenRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import {
  CODE_LENGTH,
  CODE_TTL_SECONDS,
  FIELD_MESSAGES,
  NICKNAME_MAX_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  describedBy,
  formatCountdown,
  isCodeComplete,
  isEmailValid,
  isNicknameValid,
  isPasswordValid,
  localizeFieldErrors,
  remainingAttempts,
  retryAfterSeconds,
  sanitizeCode,
} from '@/lib/authValidation'
import { EMPTY_CONSENT, type ConsentState } from '@/lib/consent'
import { useCountdown } from '@/lib/useCountdown'
import { cn } from '@/lib/utils'

type Step = 'consent' | 'verify' | 'account' | 'done'

const STEP_ORDER: readonly Step[] = ['consent', 'verify', 'account', 'done']
const STEP_LABELS = ['약관 동의', '이메일 인증', '계정 정보', '완료'] as const

const HEADINGS: Record<Exclude<Step, 'done'>, { title: string; body: string }> = {
  consent: { title: '회원가입', body: '서비스 이용을 위해 약관에 동의해 주세요.' },
  verify: { title: '이메일 인증', body: '가입에 사용할 이메일로 인증 코드를 보내드려요.' },
  account: { title: '계정 정보 입력', body: '로그인에 사용할 비밀번호와 닉네임을 정해 주세요.' },
}

const CONFETTI_COLORS = [
  'var(--action-primary)',
  'var(--feedback-success)',
  'var(--feedback-warning)',
  '#ff8fb1',
  '#4f8dff',
]

const CONFETTI = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2 - Math.PI / 2
  const distance = 64 + (index % 3) * 14
  return {
    '--dx': `${Math.round(Math.cos(angle) * distance)}px`,
    '--dy': `${Math.round(Math.sin(angle) * distance * 0.8)}px`,
    '--r': `${(index % 2 ? 1 : -1) * (90 + index * 23)}deg`,
    '--c': CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  } as CSSProperties
})

interface SignupFlowProps {
  next: string
  initialEmail?: string
  onCompleted: () => void
}

export function SignupFlow({ next, initialEmail = '', onCompleted }: SignupFlowProps) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('consent')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT)
  const [email, setEmail] = useState(initialEmail)
  const [sent, setSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [busy, setBusy] = useState<'send' | 'confirm' | 'signup' | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [codeExpired, setCodeExpired] = useState(false)
  const [codeDeadline, setCodeDeadline] = useState<number | null>(null)
  const [resendDeadline, setResendDeadline] = useState<number | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [codeShake, setCodeShake] = useState(0)

  const codeSeconds = useCountdown(codeDeadline)
  const resendSeconds = useCountdown(resendDeadline)
  const lockSeconds = useCountdown(lockedUntil)
  const submitting = busy !== null
  const locked = lockSeconds > 0
  const expired = codeExpired || (sent && codeDeadline !== null && codeSeconds === 0)

  const resetMessages = () => {
    setFormError(null)
    setInfo(null)
    setDuplicate(false)
    setFieldErrors({})
  }

  const go = (target: Step) => {
    setDirection(STEP_ORDER.indexOf(target) >= STEP_ORDER.indexOf(step) ? 'forward' : 'back')
    setStep(target)
  }

  const fail = (err: unknown) => {
    if (!(err instanceof ApiError)) {
      setFormError('알 수 없는 오류가 발생했어요')
      return
    }
    switch (err.code) {
      case 'EMAIL_DUPLICATE':
        setDuplicate(true)
        return
      case 'RATE_LIMITED':
        setLockedUntil(Date.now() + retryAfterSeconds(err.details) * 1000)
        return
      case 'INVALID_PARAMETER':
        setFieldErrors(localizeFieldErrors(err.details))
        setFormError('입력값을 확인해 주세요')
        return
      case 'MAIL_DELIVERY_FAILED':
        setFormError('인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요')
        return
      case 'VERIFICATION_CODE_MISMATCH': {
        const remaining = remainingAttempts(err.details)
        setCode('')
        setCodeShake((value) => value + 1)
        if (remaining === 0) {
          setCodeExpired(true)
          setFormError('시도 횟수를 모두 사용했어요. 코드를 다시 받아 주세요')
        } else {
          setFormError(
            remaining === null
              ? '인증 코드가 일치하지 않아요'
              : `인증 코드가 일치하지 않아요 · 남은 시도 ${remaining}회`,
          )
        }
        return
      }
      case 'VERIFICATION_EXPIRED':
        setCode('')
        setCodeExpired(true)
        setFormError('인증 코드가 만료됐어요. 코드를 다시 받아 주세요')
        return
      case 'EMAIL_NOT_VERIFIED':
        setVerified(false)
        setSent(false)
        go('verify')
        setFormError('이메일 인증 유효 시간이 지났어요. 인증을 다시 진행해 주세요')
        return
      default:
        setFormError(err.isRetryable ? '일시적인 오류예요. 잠시 후 다시 시도해 주세요' : err.message)
    }
  }

  const sendCode = async () => {
    const trimmed = email.trim()
    resetMessages()
    if (!isEmailValid(trimmed)) {
      setFieldErrors({ email: FIELD_MESSAGES.email })
      return
    }
    setBusy('send')
    try {
      await postData<undefined>('/v1/auth/email/verification', { email: trimmed })
      const now = Date.now()
      setEmail(trimmed)
      setCode('')
      setCodeExpired(false)
      setCodeDeadline(now + CODE_TTL_SECONDS * 1000)
      setResendDeadline(now + RESEND_COOLDOWN_SECONDS * 1000)
      setInfo(
        sent
          ? '새 인증 코드를 보냈어요. 이전 코드는 더 이상 쓸 수 없어요'
          : '인증 코드를 보냈어요. 메일이 안 보이면 스팸함도 확인해 주세요',
      )
      setSent(true)
    } catch (err) {
      fail(err)
    } finally {
      setBusy(null)
    }
  }

  const confirmCode = async (value: string) => {
    resetMessages()
    if (!isCodeComplete(value)) {
      setFieldErrors({ code: FIELD_MESSAGES.code })
      return
    }
    setBusy('confirm')
    try {
      await postData<undefined>('/v1/auth/email/verification/confirm', { email, code: value })
      setVerified(true)
      setCodeDeadline(null)
      setResendDeadline(null)
    } catch (err) {
      fail(err)
    } finally {
      setBusy(null)
    }
  }

  const handleCodeChange = (raw: string) => {
    const value = sanitizeCode(raw)
    setCode(value)
    if (fieldErrors.code) setFieldErrors({})
    if (isCodeComplete(value) && !submitting && !expired && !locked) void confirmCode(value)
  }

  const signup = async (event: FormEvent) => {
    event.preventDefault()
    setAttempted(true)
    resetMessages()
    const errors: Record<string, string> = {}
    if (!isPasswordValid(password)) errors.password = FIELD_MESSAGES.password
    if (passwordConfirm !== password) errors.passwordConfirm = '비밀번호가 일치하지 않아요'
    if (!isNicknameValid(nickname)) errors.nickname = FIELD_MESSAGES.nickname
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setBusy('signup')
    try {
      const session = await postData<AuthTokenRes>('/v1/auth/signup', {
        email,
        password,
        nickname: nickname.trim(),
      })
      onCompleted()
      login(session)
      go('done')
    } catch (err) {
      fail(err)
    } finally {
      setBusy(null)
    }
  }

  if (step === 'done') {
    return (
      <div className="fg-done">
        <div className="fg-done__stage">
          {CONFETTI.map((style, index) => (
            <span key={index} aria-hidden className="fg-done__p" style={style} />
          ))}
          <span className="fg-done__bdg">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12.5 10 17.5 19 7" />
            </svg>
          </span>
        </div>
        <h1 className="fg-au-title mt-4 motion-safe:auth-rise" style={{ animationDelay: '280ms' }}>
          가입을 완료했어요
        </h1>
        <p
          className="fg-au-sub mt-3 max-w-[340px] [text-wrap:pretty] motion-safe:auth-rise"
          style={{ animationDelay: '360ms' }}
        >
          {nickname.trim()}님, 환영해요. 관심 종목을 등록하고 오늘 시장이 움직인 이유를 확인해
          보세요.
        </p>
        <div className="mt-8 w-full motion-safe:auth-rise" style={{ animationDelay: '440ms' }}>
          <button
            type="button"
            className="fg-au-go"
            onClick={() => navigate(next, { replace: true })}
          >
            finngraph 시작하기
          </button>
          <Link to="/stocks" className="fg-done__more">
            관심 종목 찾아보기
          </Link>
        </div>
      </div>
    )
  }

  const heading = HEADINGS[step]
  const notices = (
    <>
      {duplicate && (
        <FormNotice tone="info">
          이미 가입된 이메일이에요.{' '}
          <Link
            to="/login"
            state={{ next, email: email.trim() }}
            className="font-medium text-primary hover:underline"
          >
            로그인하기
          </Link>
        </FormNotice>
      )}
      {info && <FormNotice tone="info">{info}</FormNotice>}
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
    </>
  )
  const confirmMismatch = passwordConfirm.length > 0 && passwordConfirm !== password

  return (
    <div>
      <StepIndicator steps={STEP_LABELS} current={STEP_ORDER.indexOf(step)} />
      <h1 className="fg-au-title mt-8">{heading.title}</h1>
      <p className="fg-au-sub">{heading.body}</p>

      <div
        key={step}
        className={cn(
          'mt-8 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]',
          direction === 'forward'
            ? 'motion-safe:slide-in-from-right-4'
            : 'motion-safe:slide-in-from-left-4',
        )}
      >
        {step === 'consent' && (
          <>
            <ConsentStep value={consent} onChange={setConsent} onNext={() => go('verify')} />
            <p className="fg-au-alt">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" state={{ next }}>
                로그인
              </Link>
            </p>
          </>
        )}

        {step === 'verify' && (
          <>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                if (verified) go('account')
              }}
              className="flex flex-col gap-5"
            >
              <AuthField
                id="signup-email"
                label="이메일"
                error={fieldErrors.email}
                hint={!sent ? '이 주소로 인증 코드가 발송돼요.' : undefined}
                ok={verified || (sent && isEmailValid(email))}
                action={
                  !verified && (
                    <button
                      type="button"
                      className={cn('fg-au-btn2', !sent && 'is-ink')}
                      disabled={submitting || locked || (sent && resendSeconds > 0)}
                      aria-busy={busy === 'send' || undefined}
                      onClick={() => void sendCode()}
                    >
                      {busy === 'send' ? (
                        <>
                          <span aria-hidden className="fg-au-spin" />
                          보내는 중
                        </>
                      ) : sent ? (
                        resendSeconds > 0 ? (
                          <span>
                            다시 받기 <span className="tabular-nums">{resendSeconds}</span>초
                          </span>
                        ) : (
                          '다시 받기'
                        )
                      ) : (
                        '인증 코드 받기'
                      )}
                    </button>
                  )
                }
              >
                <input
                  id="signup-email"
                  type="email"
                  className="fg-af__in"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus={!sent}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (sent) {
                      setSent(false)
                      setCode('')
                      setCodeExpired(false)
                      setCodeDeadline(null)
                      setResendDeadline(null)
                      resetMessages()
                    }
                  }}
                  disabled={submitting || verified}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={describedBy('signup-email', fieldErrors.email, !sent)}
                  required
                />
              </AuthField>

              {sent && !verified && (
                <AuthField
                  id="signup-code"
                  label="인증 코드"
                  variant="plain"
                  error={fieldErrors.code}
                  hint={`메일로 받은 ${CODE_LENGTH}자리 숫자를 입력하면 자동으로 확인돼요.`}
                  trailing={
                    <span aria-live="polite" className={cn('fg-code__timer', expired && 'is-exp')}>
                      {expired ? '만료' : formatCountdown(codeSeconds)}
                    </span>
                  }
                >
                  <div className="fg-af__row">
                    <CodeInput
                      id="signup-code"
                      length={CODE_LENGTH}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      placeholder="000000"
                      autoFocus
                      value={code}
                      onChange={(event) => handleCodeChange(event.target.value)}
                      disabled={submitting || expired || locked}
                      invalid={fieldErrors.code !== undefined}
                      checking={busy === 'confirm'}
                      shake={codeShake}
                      aria-invalid={fieldErrors.code ? true : undefined}
                      aria-describedby={describedBy('signup-code', fieldErrors.code, true)}
                    />
                    <button
                      type="button"
                      className="fg-au-btn2"
                      disabled={submitting || expired || locked || !isCodeComplete(code)}
                      aria-busy={busy === 'confirm' || undefined}
                      onClick={() => void confirmCode(code)}
                    >
                      {busy === 'confirm' ? <span aria-hidden className="fg-au-spin" /> : '확인'}
                    </button>
                  </div>
                </AuthField>
              )}

              {verified && (
                <div className="fg-au-verified">
                  <i aria-hidden>
                    <LucianIcon name="verified" size={14} weight={2.4} />
                  </i>
                  <p>이메일 인증을 완료했어요</p>
                </div>
              )}

              {notices}

              <button type="submit" disabled={!verified} className="fg-au-go">
                다음
              </button>
              <button
                type="button"
                className="fg-au-ghost"
                disabled={submitting}
                onClick={() => {
                  resetMessages()
                  go('consent')
                }}
              >
                이전
              </button>
            </form>

            {!sent && <KakaoSignIn next={next} disabled={submitting} />}
          </>
        )}

        {step === 'account' && (
          <form noValidate onSubmit={signup} className="flex flex-col gap-5">
            <div className="fg-au-mail">
              <LucianIcon name="verified" size={18} weight={2} />
              <p>{email}</p>
              <span>인증 완료</span>
            </div>

            <AuthField
              id="signup-password"
              label="비밀번호"
              error={fieldErrors.password}
              after={<PasswordRules value={password} showErrors={attempted} />}
            >
              <PasswordField
                id="signup-password"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby={describedBy('signup-password', fieldErrors.password)}
                required
              />
            </AuthField>

            <AuthField
              id="signup-password-confirm"
              label="비밀번호 확인"
              error={
                fieldErrors.passwordConfirm ??
                (confirmMismatch ? '비밀번호가 일치하지 않아요' : undefined)
              }
              ok={passwordConfirm.length > 0 && !confirmMismatch}
            >
              <PasswordField
                id="signup-password-confirm"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                disabled={submitting}
                aria-invalid={fieldErrors.passwordConfirm || confirmMismatch ? true : undefined}
                aria-describedby={describedBy(
                  'signup-password-confirm',
                  fieldErrors.passwordConfirm ?? (confirmMismatch ? 'mismatch' : undefined),
                )}
                required
              />
            </AuthField>

            <AuthField
              id="signup-nickname"
              label="닉네임"
              error={fieldErrors.nickname}
              hint="다른 사용자에게 보이는 이름이에요."
              trailing={`${nickname.trim().length}/${NICKNAME_MAX_LENGTH}`}
            >
              <input
                id="signup-nickname"
                className="fg-af__in"
                placeholder=" "
                autoComplete="nickname"
                maxLength={NICKNAME_MAX_LENGTH}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                disabled={submitting}
                aria-invalid={fieldErrors.nickname ? true : undefined}
                aria-describedby={describedBy('signup-nickname', fieldErrors.nickname, true)}
                required
              />
            </AuthField>

            {notices}

            <button
              type="submit"
              disabled={submitting || locked}
              aria-busy={busy === 'signup' || undefined}
              className="fg-au-go"
            >
              <span key={busy === 'signup' ? 'busy' : 'idle'} className="fg-au-go__in">
                {busy === 'signup' ? (
                  <>
                    <span aria-hidden className="fg-au-spin" />
                    가입하는 중…
                  </>
                ) : (
                  '가입하기'
                )}
              </span>
            </button>
            <button
              type="button"
              className="fg-au-ghost"
              disabled={submitting}
              onClick={() => {
                resetMessages()
                go('verify')
              }}
            >
              이전
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
