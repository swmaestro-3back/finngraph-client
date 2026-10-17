import { describe, expect, it } from 'vitest'
import {
  WITHDRAW_PHRASE,
  canSubmitWithdrawal,
  describeAccountError,
  lockMessage,
  passwordChangeIssues,
} from '@/lib/account'
import { ApiError } from '@/lib/api'
import { FIELD_MESSAGES } from '@/lib/authValidation'

const apiError = (code: string, details?: Record<string, unknown>, status = 400) =>
  new ApiError(code, status, code, details)

const FALLBACK = '처리하지 못했어요. 잠시 후 다시 시도해 주세요'

describe('canSubmitWithdrawal', () => {
  it('동의하지 않으면 입력과 무관하게 막는다', () => {
    expect(canSubmitWithdrawal({ provider: 'EMAIL', agreed: false, password: 'pw', phrase: '' })).toBe(false)
    expect(
      canSubmitWithdrawal({ provider: 'KAKAO', agreed: false, password: '', phrase: WITHDRAW_PHRASE }),
    ).toBe(false)
  })

  it('이메일 계정은 비밀번호가 있어야 한다', () => {
    expect(
      canSubmitWithdrawal({ provider: 'EMAIL', agreed: true, password: '', phrase: WITHDRAW_PHRASE }),
    ).toBe(false)
    expect(canSubmitWithdrawal({ provider: 'EMAIL', agreed: true, password: 'x', phrase: '' })).toBe(true)
  })

  it('카카오 계정은 앞뒤 공백을 뺀 확인 문구가 정확히 같아야 한다', () => {
    expect(
      canSubmitWithdrawal({ provider: 'KAKAO', agreed: true, password: '', phrase: ` ${WITHDRAW_PHRASE} ` }),
    ).toBe(true)
    expect(canSubmitWithdrawal({ provider: 'KAKAO', agreed: true, password: 'pw', phrase: '탈퇴' })).toBe(false)
    expect(
      canSubmitWithdrawal({ provider: 'KAKAO', agreed: true, password: '', phrase: '탈퇴 합니다' }),
    ).toBe(false)
  })
})

describe('passwordChangeIssues', () => {
  it('모두 올바르면 빈 객체', () => {
    expect(passwordChangeIssues({ current: 'oldpass12', next: 'newpass34', confirm: 'newpass34' })).toEqual({})
  })

  it('현재 비밀번호가 비면 current', () => {
    expect(passwordChangeIssues({ current: '', next: 'newpass34', confirm: 'newpass34' })).toEqual({
      current: '현재 비밀번호를 입력해 주세요',
    })
  })

  it('규칙 위반은 같은 값 검사보다 먼저', () => {
    expect(passwordChangeIssues({ current: 'short', next: 'short', confirm: 'short' }).next).toBe(
      FIELD_MESSAGES.password,
    )
  })

  it('현재와 같으면 next', () => {
    expect(passwordChangeIssues({ current: 'samepass1', next: 'samepass1', confirm: 'samepass1' })).toEqual({
      next: '현재 비밀번호와 다른 비밀번호를 입력해 주세요',
    })
  })

  it('확인이 다르면 confirm', () => {
    expect(passwordChangeIssues({ current: 'oldpass12', next: 'newpass34', confirm: 'newpass35' })).toEqual({
      confirm: '새 비밀번호가 일치하지 않아요',
    })
  })
})

describe('lockMessage', () => {
  it('남은 시간을 m:ss로', () => {
    expect(lockMessage(754)).toBe('시도가 너무 많아요. 12:34 후 다시 시도해 주세요')
  })
})

describe('describeAccountError', () => {
  it('불일치는 문맥에 맞는 필드와 남은 횟수', () => {
    expect(describeAccountError(apiError('PASSWORD_MISMATCH', { remainingAttempts: 3 }), 'change')).toEqual({
      field: 'current',
      message: '비밀번호가 맞지 않아요 (남은 시도 3회)',
    })
    expect(describeAccountError(apiError('PASSWORD_MISMATCH', { remainingAttempts: 3 }), 'withdraw').field).toBe(
      'password',
    )
  })

  it('남은 횟수 0은 잠시 후 안내, 없으면 기본 문구', () => {
    expect(describeAccountError(apiError('PASSWORD_MISMATCH', { remainingAttempts: 0 }), 'change').message).toBe(
      '비밀번호가 맞지 않아요. 잠시 후 다시 시도해 주세요',
    )
    expect(describeAccountError(apiError('PASSWORD_MISMATCH'), 'change').message).toBe('비밀번호가 맞지 않아요')
  })

  it('잠금은 남은 초와 m:ss 문구', () => {
    expect(describeAccountError(apiError('RATE_LIMITED', { retryAfterSeconds: 754 }, 429), 'change')).toEqual({
      message: '시도가 너무 많아요. 12:34 후 다시 시도해 주세요',
      retryAfterSeconds: 754,
    })
  })

  it('서버 검증 실패는 필드로 매핑', () => {
    const invalid = (fieldErrors: Record<string, string>) => apiError('INVALID_PARAMETER', { fieldErrors })
    expect(describeAccountError(invalid({ newPassword: 'must contain a digit' }), 'change')).toEqual({
      field: 'next',
      message: FIELD_MESSAGES.password,
    })
    expect(
      describeAccountError(invalid({ newPassword: 'must differ from current password' }), 'change'),
    ).toEqual({ field: 'next', message: '현재 비밀번호와 다른 비밀번호를 입력해 주세요' })
    expect(describeAccountError(invalid({ currentPassword: 'must not be blank' }), 'change')).toEqual({
      field: 'current',
      message: '현재 비밀번호를 입력해 주세요',
    })
    expect(describeAccountError(invalid({ password: 'must not be blank' }), 'withdraw')).toEqual({
      field: 'password',
      message: '비밀번호를 입력해 주세요',
    })
    expect(describeAccountError(invalid({ body: 'must be a valid JSON body' }), 'change')).toEqual({
      message: FALLBACK,
    })
  })

  it('비밀번호 없는 계정', () => {
    expect(describeAccountError(apiError('PASSWORD_NOT_SET', undefined, 409), 'change')).toEqual({
      message: '카카오 계정은 비밀번호가 없어요',
    })
  })

  it('ApiError가 아니거나 모르는 코드는 일반 문구', () => {
    expect(describeAccountError(new Error('boom'), 'change')).toEqual({ message: FALLBACK })
    expect(describeAccountError(apiError('NETWORK_ERROR', undefined, 0), 'withdraw')).toEqual({ message: FALLBACK })
  })
})
