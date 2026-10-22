// Lucian UX/UI Prompt #269 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#269
import { startTransition, useState, type CSSProperties } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthCheck } from '@/components/auth/AuthCheck'
import { AuthField } from '@/components/auth/AuthField'
import { FormNotice } from '@/components/auth/FormNotice'
import { LockNotice } from '@/components/auth/LockNotice'
import { PasswordField } from '@/components/auth/PasswordField'
import { LucianIcon } from '@/components/fg/LucianIcon'
import {
  WITHDRAW_PHRASE,
  canSubmitWithdrawal,
  describeAccountError,
  lockMessage,
  type AccountErrorView,
} from '@/lib/account'
import { postData } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { describedBy } from '@/lib/authValidation'
import { useFavorites } from '@/lib/favorites'
import { useCountdown } from '@/lib/useCountdown'
import { cn } from '@/lib/utils'
import type { LucianIconName } from '@/vendor/lucian-icons'

interface DeletedItem {
  label: string
  icon: LucianIconName
  tint: CSSProperties
}

const TINT_ACCOUNT = { '--g': 'linear-gradient(140deg, #8b6cff, #4f8dff)' } as CSSProperties
const TINT_FAVORITE = { '--g': 'linear-gradient(140deg, #ffb547, #ff7a45)' } as CSSProperties
const TINT_KAKAO = { '--g': '#fee500', '--g-ink': '#191919' } as CSSProperties

function matchedLength(typed: string): number {
  const value = typed.trimStart()
  let length = 0
  while (length < WITHDRAW_PHRASE.length && value[length] === WITHDRAW_PHRASE[length]) length += 1
  return length
}

export default function WithdrawPage() {
  const { user, logout } = useAuth()
  const { count, ready } = useFavorites()
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<AccountErrorView | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const lockSeconds = useCountdown(lockedUntil)
  const locked = lockSeconds > 0

  if (!user) return null

  const isEmail = user.provider === 'EMAIL'
  const submittable = canSubmitWithdrawal({ provider: user.provider, agreed, password, phrase })
  const fieldError = error?.field === 'password' ? error.message : undefined
  const formError =
    error && !error.field && error.retryAfterSeconds === undefined ? error.message : null
  const matched = matchedLength(phrase)

  const deleted: DeletedItem[] = [
    { label: '계정과 로그인 정보', icon: 'user', tint: TINT_ACCOUNT },
    { label: ready ? `담아둔 관심 ${count}건` : '담아둔 관심', icon: 'star', tint: TINT_FAVORITE },
    ...(isEmail ? [] : [{ label: '카카오 계정 연결', icon: 'link' as const, tint: TINT_KAKAO }]),
  ]

  const submit = async () => {
    if (!submittable || submitting || locked) return
    setSubmitting(true)
    setError(null)
    try {
      await postData<undefined>('/v1/me/withdrawal', isEmail ? { password } : {})
      startTransition(() => {
        navigate('/', { replace: true })
        logout()
      })
      toast.success('탈퇴가 완료됐어요')
    } catch (err) {
      const view = describeAccountError(err, 'withdraw')
      if (view.retryAfterSeconds !== undefined) {
        setLockedUntil(Date.now() + view.retryAfterSeconds * 1000)
      }
      setError(view)
      setSubmitting(false)
    }
  }

  return (
    <div className="fg-wd">
      <div>
        <Link to="/me/account" className="fg-wd__back">
          <ChevronLeft className="size-3.5" />
          계정 설정
        </Link>
        <h2 className="fg-wd__title">회원 탈퇴</h2>
      </div>

      <section aria-labelledby="withdraw-deleted" className="fg-wd-info">
        <h3 id="withdraw-deleted" className="fg-wd-info__h">
          탈퇴하면 삭제되는 정보
        </h3>
        <ul className="fg-wd-list">
          {deleted.map(({ label, icon, tint }, index) => (
            <li key={label} style={{ '--i': index } as CSSProperties}>
              <span aria-hidden className="fg-wd-ic" style={tint}>
                <LucianIcon name={icon} size={14} weight={2.2} />
              </span>
              {label}
            </li>
          ))}
        </ul>
        <p className="fg-wd-warn">삭제된 정보는 복구할 수 없어요.</p>
      </section>

      <form
        noValidate
        className="fg-section fg-wd-form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="fg-wd-ck">
          <AuthCheck tone="ink" checked={agreed} onCheckedChange={setAgreed} disabled={submitting} />
          <span>위 내용을 확인했고 탈퇴에 동의합니다</span>
        </label>

        {isEmail ? (
          <AuthField
            id="withdraw-password"
            label="비밀번호"
            error={fieldError}
            hint="본인 확인을 위해 비밀번호를 입력해 주세요."
            className="fg-wd-field"
          >
            <PasswordField
              id="withdraw-password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error?.field) setError(null)
              }}
              disabled={submitting}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={describedBy('withdraw-password', fieldError, true)}
            />
          </AuthField>
        ) : (
          <AuthField
            id="withdraw-phrase"
            label={`'${WITHDRAW_PHRASE}'를 입력해 주세요`}
            hint="카카오 계정은 확인 문구로 탈퇴 의사를 확인해요."
            variant="plain"
            className="fg-wd-field"
            trailing={
              <span aria-hidden className="fg-wd-nm">
                {Array.from(WITHDRAW_PHRASE, (char, index) => (
                  <span key={index} className={index < matched ? 'is-ok' : undefined}>
                    {char}
                  </span>
                ))}
              </span>
            }
          >
            <input
              id="withdraw-phrase"
              className="fg-wd-ph"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              placeholder={WITHDRAW_PHRASE}
              autoComplete="off"
              disabled={submitting}
              aria-describedby={describedBy('withdraw-phrase', undefined, true)}
            />
          </AuthField>
        )}

        {locked && <LockNotice seconds={lockSeconds}>{lockMessage(lockSeconds)}</LockNotice>}
        {formError && <FormNotice tone="error">{formError}</FormNotice>}

        <div className="fg-wd-acts">
          <Link to="/me/account" className="fg-btn fg-btn--tertiary">
            취소
          </Link>
          <button
            type="submit"
            className={cn('fg-wd-go', submittable && !locked && 'is-armed')}
            disabled={!submittable || submitting || locked}
            aria-busy={submitting || undefined}
          >
            <span>
              {submitting && <span aria-hidden className="fg-au-spin size-3.5" />}
              {submitting ? '처리 중…' : '탈퇴하기'}
            </span>
          </button>
        </div>
      </form>
    </div>
  )
}
