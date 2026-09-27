import { describe, expect, it } from 'vitest'
import {
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

describe('isPasswordValid — 서버 validateSignup과 같은 4규칙', () => {
  it('8~128자 · 영문 · 숫자 · 공백 없음을 모두 만족해야 통과', () => {
    expect(isPasswordValid('abcdefg1')).toBe(true)
    expect(isPasswordValid('abcdef1')).toBe(false)
    expect(isPasswordValid('12345678')).toBe(false)
    expect(isPasswordValid('abcdefgh')).toBe(false)
    expect(isPasswordValid('abcd efg1')).toBe(false)
    expect(isPasswordValid(`${'a'.repeat(128)}1`)).toBe(false)
  })
})

describe('isNicknameValid — 앞뒤 공백을 뺀 2~20자', () => {
  it('trim 후 길이로 판정', () => {
    expect(isNicknameValid(' 가 ')).toBe(false)
    expect(isNicknameValid(' 가나 ')).toBe(true)
    expect(isNicknameValid('가'.repeat(21))).toBe(false)
  })
})

describe('isEmailValid', () => {
  it('로컬@도메인.TLD 형태만 허용', () => {
    expect(isEmailValid('you@example.com')).toBe(true)
    expect(isEmailValid(' you@example.com ')).toBe(true)
    expect(isEmailValid('you@example')).toBe(false)
    expect(isEmailValid('you example.com')).toBe(false)
  })
})

describe('인증 코드 입력 정제', () => {
  it('숫자만 남기고 6자리에서 자른다', () => {
    expect(sanitizeCode('12a3-45 678')).toBe('123456')
    expect(isCodeComplete('123456')).toBe(true)
    expect(isCodeComplete('12345')).toBe(false)
  })
})

describe('서버 details 해석', () => {
  it('필드 오류는 필드명 기준으로 한국어 문구로 바꾼다', () => {
    const errors = localizeFieldErrors({
      fieldErrors: { password: 'must be 8-128 characters', unknown: 'raw message' },
    })
    expect(errors.password).toContain('8~128자')
    expect(errors.unknown).toBe('raw message')
    expect(localizeFieldErrors(undefined)).toEqual({})
  })

  it('retryAfterSeconds가 없으면(게이트웨이 429) 60초 폴백', () => {
    expect(retryAfterSeconds({ retryAfterSeconds: 37 })).toBe(37)
    expect(retryAfterSeconds({ retryAfterSeconds: '12' })).toBe(12)
    expect(retryAfterSeconds(undefined)).toBe(60)
  })

  it('remainingAttempts는 0을 살리고 부재는 null', () => {
    expect(remainingAttempts({ remainingAttempts: 0 })).toBe(0)
    expect(remainingAttempts({ remainingAttempts: 3 })).toBe(3)
    expect(remainingAttempts({})).toBeNull()
  })
})

describe('formatCountdown', () => {
  it('m:ss', () => {
    expect(formatCountdown(300)).toBe('5:00')
    expect(formatCountdown(59)).toBe('0:59')
    expect(formatCountdown(-3)).toBe('0:00')
  })
})
