import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupFlow } from '@/components/auth/SignupFlow'
import { useAuth } from '@/lib/auth'
import { safeNext } from '@/lib/kakao'

type Mode = 'login' | 'signup'

interface LocationState {
  next?: string
  email?: string
  notice?: string
}

interface LoginPageProps {
  mode?: Mode
}

export default function LoginPage({ mode = 'login' }: LoginPageProps) {
  const { status } = useAuth()
  const location = useLocation()
  const [completed, setCompleted] = useState(false)
  const state = (location.state as LocationState | null) ?? {}
  const next = safeNext(state.next)

  if (status === 'authenticated' && !completed) return <Navigate to={next} replace />

  if (mode === 'signup') {
    return (
      <SignupFlow next={next} initialEmail={state.email} onCompleted={() => setCompleted(true)} />
    )
  }

  const continuing = next !== '/'

  return (
    <>
      <h1 className="text-display font-semibold tracking-[-0.8px] text-foreground">로그인</h1>
      <p className="mt-2 text-body text-foreground-secondary break-keep">
        {continuing ? '로그인하면 보던 화면으로 돌아가요.' : '이메일 또는 카카오 계정으로 로그인하세요.'}
      </p>

      <div className="mt-8">
        <LoginForm next={next} initialEmail={state.email} notice={state.notice} />
      </div>

      <p className="mt-8 text-center text-body text-muted-foreground">
        아직 계정이 없으신가요?{' '}
        <Link to="/signup" state={{ next }} className="font-medium text-primary hover:underline">
          회원가입
        </Link>
      </p>
    </>
  )
}
