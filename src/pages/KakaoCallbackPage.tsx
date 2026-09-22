// 카카오 인가 콜백 — Design Ref: §5.3 KakaoCallbackPage
// 시퀀스 순서 고정: ① error 파라미터 ② state 대조 ③ 대조 성공 후에만 code POST.
// state 검증이 유일한 콜백 위조 방어라 검증 전 POST는 금지다.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { postData } from '@/lib/api'
import type { AuthTokenRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { consumeKakaoState } from '@/lib/kakao'

export default function KakaoCallbackPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [failed, setFailed] = useState(false)
  // StrictMode 이중 mount가 같은 code로 2회 POST하면 후행이 무효 code로 실패한다
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const run = async () => {
      if (params.get('error')) {
        navigate('/login', { replace: true })
        return
      }

      const { state, next } = consumeKakaoState()
      const returnedState = params.get('state')
      const code = params.get('code')

      if (!state || !returnedState || state !== returnedState || !code) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const session = await postData<AuthTokenRes>('/v1/auth/kakao', { code })
        login(session)
        navigate(next, { replace: true })
      } catch {
        setFailed(true)
      }
    }
    void run()
  }, [params, login, navigate])

  return (
    <div className="page-container flex flex-col items-center gap-3 pt-24 text-center">
      {failed ? (
        <>
          <p className="text-body text-foreground">카카오 로그인에 실패했습니다.</p>
          <Link to="/login" className="text-body text-primary hover:underline">
            다시 시도하기
          </Link>
        </>
      ) : (
        <p className="text-body text-muted-foreground">카카오 로그인 처리 중…</p>
      )}
    </div>
  )
}
