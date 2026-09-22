// 카카오 인가 리다이렉트 — Design Ref: §5.3 LoginPage / KakaoCallbackPage
// state는 콜백 위조(CSRF)의 유일한 방어라 검증 전에는 어떤 code도 서버로 보내지 않는다.

const STATE_KEY = 'kakao:state'
const NEXT_KEY = 'kakao:next'

const AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize'
const CLIENT_ID = (import.meta.env.VITE_KAKAO_CLIENT_ID as string | undefined) ?? ''

export function kakaoConfigured(): boolean {
  return CLIENT_ID.length > 0
}

/** 콜백 후 돌아갈 곳 — 내부 경로만 허용해 open redirect를 차단한다 */
export function safeNext(raw: string | null | undefined): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export function startKakaoLogin(next: string): void {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(NEXT_KEY, safeNext(next))

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${location.origin}/auth/kakao/callback`,
    response_type: 'code',
    state,
  })
  location.href = `${AUTHORIZE_URL}?${params.toString()}`
}

/** 저장된 state·next를 꺼내며 소거한다 — 재사용 방지 일회성 */
export function consumeKakaoState(): { state: string | null; next: string } {
  const state = sessionStorage.getItem(STATE_KEY)
  const next = safeNext(sessionStorage.getItem(NEXT_KEY))
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(NEXT_KEY)
  return { state, next }
}
