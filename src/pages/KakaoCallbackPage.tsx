// 카카오 인가 콜백 — Design Ref: §5.3 KakaoCallbackPage
// 시퀀스 순서 고정: ① error 파라미터 ② state 대조 ③ 대조 성공 후에만 code POST.
// state 검증이 유일한 콜백 위조 방어라 검증 전 POST는 금지다.
import { useEffect, useRef, useState } from 'react'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
    <div role="status" aria-live="polite" className="flex flex-col items-center py-6 text-center">
      {failed ? (
        <>
          <span className="flex size-14 items-center justify-center rounded-full bg-destructive/8 text-destructive">
            <CircleAlert className="size-6" strokeWidth={2} />
          </span>
          <h1 className="mt-6 text-title font-semibold tracking-[-0.4px] text-foreground">
            카카오 로그인에 실패했어요
          </h1>
          <p className="mt-2 text-body leading-relaxed text-foreground-secondary break-keep">
            카카오에서 받은 인가 정보를 확인하지 못했어요. 다시 시도해 주세요.
          </p>
          <Button asChild size="lg" className="mt-8 h-10 w-full">
            <Link to="/login">다시 시도하기</Link>
          </Button>
        </>
      ) : (
        <>
          <LoaderCircle className="size-6 animate-spin text-primary" strokeWidth={2} />
          <p className="mt-4 text-body text-foreground-secondary">카카오 로그인 처리 중…</p>
        </>
      )}
    </div>
  )
}
