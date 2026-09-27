import { useState, type FormEvent } from 'react'
import { LoaderCircle, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthField } from '@/components/auth/AuthField'
import { ConsentStep } from '@/components/auth/ConsentStep'
import { FormNotice } from '@/components/auth/FormNotice'
import { KakaoSignIn } from '@/components/auth/KakaoSignIn'
import { PasswordField, PasswordRules } from '@/components/auth/PasswordField'
import { StepIndicator } from '@/components/auth/StepIndicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      <div className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground motion-safe:auth-pop">
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="size-8"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5 10 17.5 19 7" className="motion-safe:auth-draw" />
          </svg>
        </span>
        <h1
          className="mt-6 text-display font-semibold tracking-[-0.8px] text-foreground motion-safe:auth-rise"
          style={{ animationDelay: '280ms' }}
        >
          가입을 완료했어요
        </h1>
        <p
          className="mt-3 text-body leading-relaxed text-foreground-secondary break-keep [text-wrap:pretty] motion-safe:auth-rise"
          style={{ animationDelay: '360ms' }}
        >
          {nickname.trim()}님, 환영해요. 관심 종목을 등록하고 오늘 시장이 움직인 이유를 확인해
          보세요.
        </p>
        <div className="mt-8 w-full motion-safe:auth-rise" style={{ animationDelay: '440ms' }}>
          <Button
            size="lg"
            className="h-10 w-full"
            onClick={() => navigate(next, { replace: true })}
          >
            finngraph 시작하기
          </Button>
          <Button variant="ghost" className="mt-2 w-full" asChild>
            <Link to="/stocks">관심 종목 찾아보기</Link>
          </Button>
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
        <FormNotice tone="error">
          요청이 너무 잦아요. <span className="font-mono tabular-nums">{lockSeconds}</span>초 후
          다시 시도할 수 있어요
        </FormNotice>
      )}
    </>
  )
  const confirmMismatch = passwordConfirm.length > 0 && passwordConfirm !== password

  return (
    <div>
      <StepIndicator steps={STEP_LABELS} current={STEP_ORDER.indexOf(step)} />
      <h1 className="mt-7 text-display font-semibold tracking-[-0.8px] text-foreground">
        {heading.title}
      </h1>
      <p className="mt-2 text-body text-foreground-secondary break-keep">{heading.body}</p>

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
            <p className="mt-8 text-center text-body text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" state={{ next }} className="font-medium text-primary hover:underline">
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
              >
                <div className="flex gap-2">
                  <Input
                    id="signup-email"
                    type="email"
                    className="h-10 flex-1"
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
                  {!verified && (
                    <Button
                      type="button"
                      variant={sent ? 'outline' : 'default'}
                      className="h-10 shrink-0 px-3.5"
                      disabled={submitting || locked || (sent && resendSeconds > 0)}
                      onClick={() => void sendCode()}
                    >
                      {busy === 'send' ? (
                        <>
                          <LoaderCircle className="animate-spin" />
                          보내는 중
                        </>
                      ) : sent ? (
                        resendSeconds > 0 ? (
                          <span>
                            다시 받기 <span className="font-mono tabular-nums">{resendSeconds}</span>초
                          </span>
                        ) : (
                          '다시 받기'
                        )
                      ) : (
                        '인증 코드 받기'
                      )}
                    </Button>
                  )}
                </div>
              </AuthField>

              {sent && !verified && (
                <AuthField
                  id="signup-code"
                  label="인증 코드"
                  error={fieldErrors.code}
                  hint={`메일로 받은 ${CODE_LENGTH}자리 숫자를 입력하면 자동으로 확인돼요.`}
                >
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="signup-code"
                        className="h-10 pr-16 font-mono tracking-widest tabular-nums"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={CODE_LENGTH}
                        placeholder="000000"
                        autoFocus
                        value={code}
                        onChange={(event) => handleCodeChange(event.target.value)}
                        disabled={submitting || expired || locked}
                        aria-invalid={fieldErrors.code ? true : undefined}
                        aria-describedby={describedBy('signup-code', fieldErrors.code, true)}
                      />
                      <span
                        aria-live="polite"
                        className={cn(
                          'pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-caption tabular-nums',
                          expired ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {expired ? '만료' : formatCountdown(codeSeconds)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      className="h-10 shrink-0 px-3.5"
                      disabled={submitting || expired || locked || !isCodeComplete(code)}
                      onClick={() => void confirmCode(code)}
                    >
                      {busy === 'confirm' ? <LoaderCircle className="animate-spin" /> : '확인'}
                    </Button>
                  </div>
                </AuthField>
              )}

              {verified && (
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 motion-safe:auth-rise">
                  <ShieldCheck
                    className="size-4 shrink-0 text-primary motion-safe:auth-pop"
                    strokeWidth={2}
                  />
                  <p className="text-body font-medium text-foreground">이메일 인증을 완료했어요</p>
                </div>
              )}

              {notices}

              <Button type="submit" size="lg" disabled={!verified} className="mt-1 h-10 w-full">
                다음
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start text-muted-foreground"
                disabled={submitting}
                onClick={() => {
                  resetMessages()
                  go('consent')
                }}
              >
                이전
              </Button>
            </form>

            {!sent && <KakaoSignIn next={next} disabled={submitting} />}
          </>
        )}

        {step === 'account' && (
          <form noValidate onSubmit={signup} className="flex flex-col gap-5">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5">
              <ShieldCheck className="size-4 shrink-0 text-primary" strokeWidth={2} />
              <p className="min-w-0 flex-1 truncate text-body font-medium text-foreground">{email}</p>
              <span className="shrink-0 text-caption font-medium text-primary">인증 완료</span>
            </div>

            <AuthField id="signup-password" label="비밀번호" error={fieldErrors.password}>
              <PasswordField
                id="signup-password"
                className="h-10"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby={describedBy('signup-password', fieldErrors.password)}
                required
              />
              <PasswordRules value={password} showErrors={attempted} />
            </AuthField>

            <AuthField
              id="signup-password-confirm"
              label="비밀번호 확인"
              error={
                fieldErrors.passwordConfirm ??
                (confirmMismatch ? '비밀번호가 일치하지 않아요' : undefined)
              }
            >
              <PasswordField
                id="signup-password-confirm"
                className="h-10"
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
              trailing={
                <span className="font-mono text-caption tabular-nums text-muted-foreground">
                  {nickname.trim().length}/{NICKNAME_MAX_LENGTH}
                </span>
              }
            >
              <Input
                id="signup-nickname"
                className="h-10"
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

            <Button type="submit" size="lg" disabled={submitting || locked} className="mt-1 h-10 w-full">
              {busy === 'signup' ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  가입하는 중…
                </>
              ) : (
                '가입하기'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground"
              disabled={submitting}
              onClick={() => {
                resetMessages()
                go('verify')
              }}
            >
              이전
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
