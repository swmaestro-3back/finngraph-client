// 로그인·가입 — Design Ref: §5.2·§5.3 LoginPage
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ApiError, postData } from '@/lib/api'
import type { AuthTokenRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { kakaoConfigured, safeNext, startKakaoLogin } from '@/lib/kakao'

type Mode = 'login' | 'signup'

interface LocationState {
  next?: string
}

export default function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const next = safeNext((location.state as LocationState | null)?.next)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // authenticated면 폼을 그릴 이유가 없다 — 로그인 직후에도 이 가드가 next로 내보낸다
  if (status === 'authenticated') return <Navigate to={next} replace />

  const switchMode = (value: string) => {
    if (value !== 'login' && value !== 'signup') return
    setMode(value)
    setFormError(null)
    setFieldErrors({})
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const session =
        mode === 'login'
          ? await postData<AuthTokenRes>('/v1/auth/login', { email, password })
          : await postData<AuthTokenRes>('/v1/auth/signup', { email, password, nickname })
      login(session)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          // 이메일·비밀번호 어느 쪽이 틀렸는지 구분하지 않는다 — 계정 존재 유추 차단
          setFormError('이메일 또는 비밀번호가 올바르지 않습니다')
        } else if (err.code === 'EMAIL_DUPLICATE') {
          setMode('login')
          setFormError('이미 가입된 이메일입니다 — 로그인해 주세요')
        } else if (err.code === 'INVALID_PARAMETER') {
          setFieldErrors((err.details?.fieldErrors as Record<string, string>) ?? {})
          setFormError('입력값을 확인해 주세요')
        } else {
          setFormError(err.isRetryable ? '일시적인 오류입니다. 다시 시도해 주세요' : err.message)
        }
      } else {
        setFormError('알 수 없는 오류가 발생했습니다')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const FIELD_LABEL = 'text-caption font-medium text-foreground-secondary'

  return (
    <div className="page-container flex justify-center pt-14 pb-24">
      <div className="w-full max-w-sm">
        {/* 다른 화면과 같은 card-surface에 담는다 — 맨 배경 위 폼은 이 앱에서 이 페이지만 이질적이었다 */}
        <div className="card-surface p-7">
          <h1 className="text-title font-semibold tracking-[-0.4px] text-foreground">
            {mode === 'login' ? '다시 만나서 반가워요' : '계정 만들기'}
          </h1>
          <p className="mt-1 mb-6 text-caption text-muted-foreground">
            {mode === 'login'
              ? '테마와 종목, 기업 관계 그래프를 이어서 탐색하세요.'
              : '이메일 하나로 바로 시작할 수 있습니다.'}
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              {/* placeholder만으론 라벨이 아니다 — 입력을 시작하면 어떤 칸인지 알 수 없게 된다 */}
              <label htmlFor="login-email" className={FIELD_LABEL}>
                이메일
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={fieldErrors.email ? true : undefined}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
              {fieldErrors.email && (
                <p className="text-caption text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className={FIELD_LABEL}>
                비밀번호
              </label>
              <Input
                id="login-password"
                type="password"
                aria-invalid={fieldErrors.password ? true : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
              {fieldErrors.password && (
                <p className="text-caption text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-nickname" className={FIELD_LABEL}>
                  닉네임
                </label>
                <Input
                  id="login-nickname"
                  placeholder="다른 사용자에게 보이는 이름"
                  aria-invalid={fieldErrors.nickname ? true : undefined}
                  autoComplete="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={submitting}
                  required
                />
                {fieldErrors.nickname && (
                  <p className="text-caption text-destructive">{fieldErrors.nickname}</p>
                )}
              </div>
            )}

            {/* role="alert" — 비밀번호 필드에서 Enter로 제출한 SR 사용자에게도 실패가 즉시 낭독되게 */}
            {formError && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/8 px-3 py-2.5 text-caption text-destructive"
              >
                {formError}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="mt-1 w-full">
              {submitting ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'}
            </Button>
          </form>

          {kakaoConfigured() && (
            <>
              <div className="my-5 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-caption text-muted-foreground">또는</span>
                <Separator className="flex-1" />
              </div>
              {/* 카카오 버튼 규정색 — outline variant의 회색 테두리가 노란 면 위에 떠 보여 자체 스타일로 */}
              <Button
                type="button"
                className="w-full border-0 bg-[#FEE500] font-semibold text-[#191919] hover:bg-[#FEE500]/90 active:bg-[#FEE500]/80"
                disabled={submitting}
                onClick={() => startKakaoLogin(next)}
              >
                카카오로 시작하기
              </Button>
            </>
          )}
        </div>

        {/* 모드 전환 — 제목과 중복되던 상단 토글 대신 관례적인 하단 링크 한 줄 */}
        <p className="mt-4 text-center text-caption text-muted-foreground">
          {mode === 'login' ? '아직 계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="cursor-pointer font-medium text-primary hover:underline"
          >
            {mode === 'login' ? '가입하기' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  )
}
