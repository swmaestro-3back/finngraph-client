// 인증 상태의 단일 원본 — Design Ref: §5.1
// access 토큰 자체는 api.ts 모듈 변수에 살고, 여기는 status·user만 소유한다.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { postData, refreshSession, setAccessToken, setOnUnauthorized } from '@/lib/api'
import type { AuthTokenRes, MeRes } from '@/lib/apiTypes'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

interface AuthState {
  status: AuthStatus
  user: MeRes | null
  /** 로그인·가입·카카오 콜백이 받은 세션을 반영한다 */
  login: (session: AuthTokenRes) => void
  logout: () => Promise<void>
  /** 닉네임 수정 등 서버가 돌려준 최신 프로필 반영 */
  updateUser: (user: MeRes) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<MeRes | null>(null)

  const clear = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  // 부트스트랩: refresh 쿠키가 살아 있으면 응답 user로 즉시 로그인 상태 복원.
  // StrictMode 이중 mount는 refreshSession의 single-flight가 흡수한다.
  useEffect(() => {
    let cancelled = false
    refreshSession().then((session) => {
      if (cancelled) return
      if (session) {
        setUser(session.user)
        setStatus('authenticated')
      } else {
        setStatus('anonymous')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // 401 → refresh까지 실패한 경우 api.ts가 이 훅을 부른다 — 세션 종료를 UI에 반영
  useEffect(() => {
    setOnUnauthorized(clear)
    return () => setOnUnauthorized(null)
  }, [clear])

  const login = useCallback((session: AuthTokenRes) => {
    setAccessToken(session.accessToken)
    setUser(session.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    // 서버 폐기가 실패해도 클라 세션은 끝낸다 — 로그아웃은 멱등이고 사용자를 붙잡지 않는다
    try {
      await postData<undefined>('/v1/auth/logout')
    } catch {
      /* noop */
    }
    clear()
  }, [clear])

  const updateUser = useCallback((next: MeRes) => setUser(next), [])

  const value = useMemo(
    () => ({ status, user, login, logout, updateUser }),
    [status, user, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있다')
  return context
}
