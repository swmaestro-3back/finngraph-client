import { ApiError } from '@/lib/api'
import type { AuthProviderKind } from '@/lib/apiTypes'
import {
  FIELD_MESSAGES,
  formatCountdown,
  isPasswordValid,
  remainingAttempts,
  retryAfterSeconds,
} from '@/lib/authValidation'

export const WITHDRAW_PHRASE = '탈퇴합니다'

const SAME_PASSWORD_MESSAGE = '현재 비밀번호와 다른 비밀번호를 입력해 주세요'
const FALLBACK_MESSAGE = '처리하지 못했어요. 잠시 후 다시 시도해 주세요'

export interface WithdrawalInput {
  provider: AuthProviderKind
  agreed: boolean
  password: string
  phrase: string
}

export function canSubmitWithdrawal({ provider, agreed, password, phrase }: WithdrawalInput): boolean {
  if (!agreed) return false
  if (provider === 'EMAIL') return password.length > 0
  return phrase.trim() === WITHDRAW_PHRASE
}

export interface PasswordChangeInput {
  current: string
  next: string
  confirm: string
}

export type PasswordChangeField = keyof PasswordChangeInput
export type PasswordChangeIssues = Partial<Record<PasswordChangeField, string>>

export function passwordChangeIssues({ current, next, confirm }: PasswordChangeInput): PasswordChangeIssues {
  const issues: PasswordChangeIssues = {}
  if (current.length === 0) issues.current = '현재 비밀번호를 입력해 주세요'
  if (!isPasswordValid(next)) issues.next = FIELD_MESSAGES.password
  else if (next === current) issues.next = SAME_PASSWORD_MESSAGE
  if (confirm !== next) issues.confirm = '새 비밀번호가 일치하지 않아요'
  return issues
}

export function lockMessage(seconds: number): string {
  return `시도가 너무 많아요. ${formatCountdown(seconds)} 후 다시 시도해 주세요`
}

export type AccountErrorContext = 'change' | 'withdraw'

export interface AccountErrorView {
  field?: 'current' | 'next' | 'password'
  message: string
  retryAfterSeconds?: number
}

function mismatchMessage(remaining: number | null): string {
  if (remaining === null) return '비밀번호가 맞지 않아요'
  if (remaining === 0) return '비밀번호가 맞지 않아요. 잠시 후 다시 시도해 주세요'
  return `비밀번호가 맞지 않아요 (남은 시도 ${remaining}회)`
}

function invalidParameterView(details?: Record<string, unknown>): AccountErrorView {
  const fields = (details?.fieldErrors ?? {}) as Record<string, unknown>
  if (fields.newPassword === 'must differ from current password') {
    return { field: 'next', message: SAME_PASSWORD_MESSAGE }
  }
  if (fields.newPassword) return { field: 'next', message: FIELD_MESSAGES.password }
  if (fields.currentPassword) return { field: 'current', message: '현재 비밀번호를 입력해 주세요' }
  if (fields.password) return { field: 'password', message: '비밀번호를 입력해 주세요' }
  return { message: FALLBACK_MESSAGE }
}

export function describeAccountError(error: unknown, context: AccountErrorContext): AccountErrorView {
  if (!(error instanceof ApiError)) return { message: FALLBACK_MESSAGE }
  switch (error.code) {
    case 'PASSWORD_MISMATCH':
      return {
        field: context === 'change' ? 'current' : 'password',
        message: mismatchMessage(remainingAttempts(error.details)),
      }
    case 'RATE_LIMITED': {
      const seconds = retryAfterSeconds(error.details)
      return { message: lockMessage(seconds), retryAfterSeconds: seconds }
    }
    case 'INVALID_PARAMETER':
      return invalidParameterView(error.details)
    case 'PASSWORD_NOT_SET':
      return { message: '카카오 계정은 비밀번호가 없어요' }
    default:
      return { message: FALLBACK_MESSAGE }
  }
}
