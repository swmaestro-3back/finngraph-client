import { startTransition, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AuthField } from '@/components/auth/AuthField'
import { FormNotice } from '@/components/auth/FormNotice'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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

  const deleted = [
    '계정과 로그인 정보',
    ready ? `담아둔 관심 ${count}건` : '담아둔 관심',
    ...(isEmail ? [] : ['카카오 계정 연결']),
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
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/me/account"
          className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          계정 설정
        </Link>
        <h2 className="mt-2 text-lg font-medium tracking-[-0.4px] text-foreground">회원 탈퇴</h2>
      </div>

      <section aria-labelledby="withdraw-deleted" className="card-surface p-5">
        <h3 id="withdraw-deleted" className="text-body font-semibold text-foreground">
          탈퇴하면 삭제되는 정보
        </h3>
        <ul className="mt-3 flex flex-col gap-1.5">
          {deleted.map((item) => (
            <li key={item} className="flex items-center gap-2 text-body text-foreground-secondary">
              <span aria-hidden className="size-1 shrink-0 rounded-full bg-foreground-tertiary" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-caption font-medium text-destructive">삭제된 정보는 복구할 수 없어요.</p>
      </section>

      <form
        noValidate
        className="card-surface flex flex-col gap-5 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            disabled={submitting}
            className="mt-0.5"
          />
          <span className="text-body text-foreground">위 내용을 확인했고 탈퇴에 동의합니다</span>
        </label>

        {isEmail ? (
          <AuthField
            id="withdraw-password"
            label="비밀번호"
            error={fieldError}
            hint="본인 확인을 위해 비밀번호를 입력해 주세요."
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
          >
            <Input
              id="withdraw-phrase"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              placeholder={WITHDRAW_PHRASE}
              autoComplete="off"
              disabled={submitting}
              aria-describedby={describedBy('withdraw-phrase', undefined, true)}
            />
          </AuthField>
        )}

        {locked && <FormNotice tone="error">{lockMessage(lockSeconds)}</FormNotice>}
        {formError && <FormNotice tone="error">{formError}</FormNotice>}

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link to="/me/account">취소</Link>
          </Button>
          <Button type="submit" variant="destructive" disabled={!submittable || submitting || locked}>
            {submitting ? '처리 중…' : '탈퇴하기'}
          </Button>
        </div>
      </form>
    </div>
  )
}
