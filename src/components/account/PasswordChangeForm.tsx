import { useState } from 'react'
import { toast } from 'sonner'
import { AuthField } from '@/components/auth/AuthField'
import { FormNotice } from '@/components/auth/FormNotice'
import { PasswordField, PasswordRules } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/button'
import {
  describeAccountError,
  lockMessage,
  passwordChangeIssues,
  type AccountErrorView,
  type PasswordChangeField,
  type PasswordChangeInput,
} from '@/lib/account'
import { patchData } from '@/lib/api'
import type { AuthTokenRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { describedBy } from '@/lib/authValidation'
import { useCountdown } from '@/lib/useCountdown'

interface PasswordChangeFormProps {
  onClose: () => void
}

const FIELDS: { field: PasswordChangeField; id: string; label: string; autoComplete: string }[] = [
  { field: 'current', id: 'password-current', label: '현재 비밀번호', autoComplete: 'current-password' },
  { field: 'next', id: 'password-next', label: '새 비밀번호', autoComplete: 'new-password' },
  { field: 'confirm', id: 'password-confirm', label: '새 비밀번호 확인', autoComplete: 'new-password' },
]

export function PasswordChangeForm({ onClose }: PasswordChangeFormProps) {
  const { login } = useAuth()
  const [values, setValues] = useState<PasswordChangeInput>({ current: '', next: '', confirm: '' })
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<AccountErrorView | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const lockSeconds = useCountdown(lockedUntil)
  const locked = lockSeconds > 0

  const issues = passwordChangeIssues(values)
  const errorFor = (field: PasswordChangeField): string | undefined => {
    if (serverError?.field === field) return serverError.message
    return attempted ? issues[field] : undefined
  }
  const formError =
    serverError && !serverError.field && serverError.retryAfterSeconds === undefined
      ? serverError.message
      : null

  const update = (field: PasswordChangeField, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (serverError?.field === field) setServerError(null)
  }

  const submit = async () => {
    setAttempted(true)
    if (Object.keys(issues).length > 0 || locked) return
    setSubmitting(true)
    setServerError(null)
    try {
      const session = await patchData<AuthTokenRes>('/v1/me/password', {
        currentPassword: values.current,
        newPassword: values.next,
      })
      login(session)
      toast.success('비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요')
      onClose()
    } catch (err) {
      const view = describeAccountError(err, 'change')
      if (view.retryAfterSeconds !== undefined) {
        setLockedUntil(Date.now() + view.retryAfterSeconds * 1000)
      }
      setServerError(view)
      setSubmitting(false)
    }
  }

  return (
    <form
      noValidate
      className="flex max-w-sm flex-col gap-4 pt-1"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {FIELDS.map(({ field, id, label, autoComplete }) => (
        <AuthField key={field} id={id} label={label} error={errorFor(field)}>
          <PasswordField
            id={id}
            autoComplete={autoComplete}
            autoFocus={field === 'current'}
            value={values[field]}
            onChange={(event) => update(field, event.target.value)}
            disabled={submitting}
            aria-invalid={errorFor(field) ? true : undefined}
            aria-describedby={describedBy(id, errorFor(field))}
          />
          {field === 'next' && <PasswordRules value={values.next} showErrors={attempted} />}
        </AuthField>
      ))}
      {locked && <FormNotice tone="error">{lockMessage(lockSeconds)}</FormNotice>}
      {formError && <FormNotice tone="error">{formError}</FormNotice>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
          취소
        </Button>
        <Button type="submit" size="sm" disabled={submitting || locked}>
          {submitting ? '변경 중…' : '변경하기'}
        </Button>
      </div>
    </form>
  )
}
