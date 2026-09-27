export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const NICKNAME_MIN_LENGTH = 2
export const NICKNAME_MAX_LENGTH = 20
export const CODE_LENGTH = 6
export const CODE_TTL_SECONDS = 5 * 60
export const RESEND_COOLDOWN_SECONDS = 60
export const RATE_LIMIT_FALLBACK_SECONDS = 60

export type PasswordRuleKey = 'length' | 'letter' | 'digit' | 'space'

export interface PasswordRule {
  key: PasswordRuleKey
  label: string
  test: (value: string) => boolean
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    key: 'length',
    label: `${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자`,
    test: (value) => value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
  },
  { key: 'letter', label: '영문 포함', test: (value) => /[A-Za-z]/.test(value) },
  { key: 'digit', label: '숫자 포함', test: (value) => /\d/.test(value) },
  { key: 'space', label: '공백 없음', test: (value) => value.length > 0 && !/\s/.test(value) },
]

export const FIELD_MESSAGES: Record<string, string> = {
  email: '올바른 이메일 주소를 입력해 주세요',
  password: `비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자, 영문과 숫자를 포함하고 공백이 없어야 해요`,
  nickname: `닉네임은 공백을 제외하고 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해 주세요`,
  code: `인증 코드 ${CODE_LENGTH}자리 숫자를 입력해 주세요`,
}

export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value))
}

export function isNicknameValid(value: string): boolean {
  const length = value.trim().length
  return length >= NICKNAME_MIN_LENGTH && length <= NICKNAME_MAX_LENGTH
}

export function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function sanitizeCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH)
}

export function isCodeComplete(value: string): boolean {
  return value.length === CODE_LENGTH && /^\d+$/.test(value)
}

export function localizeFieldErrors(details?: Record<string, unknown>): Record<string, string> {
  const raw = details?.fieldErrors
  if (!raw || typeof raw !== 'object') return {}
  const localized: Record<string, string> = {}
  for (const [field, message] of Object.entries(raw as Record<string, unknown>)) {
    localized[field] =
      FIELD_MESSAGES[field] ?? (typeof message === 'string' ? message : '입력값을 확인해 주세요')
  }
  return localized
}

export function retryAfterSeconds(details?: Record<string, unknown>): number {
  const raw = details?.retryAfterSeconds
  const seconds = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : RATE_LIMIT_FALLBACK_SECONDS
}

export function remainingAttempts(details?: Record<string, unknown>): number | null {
  const raw = details?.remainingAttempts
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : null
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export function describedBy(id: string, error?: string, hasHint = false): string | undefined {
  if (error) return `${id}-error`
  if (hasHint) return `${id}-hint`
  return undefined
}
