// Lucian UX/UI Prompt #066 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#066
import { useEffect, useState } from 'react'
import { kakaoConfigured, startKakaoLogin } from '@/lib/kakao'

interface KakaoSignInProps {
  next: string
  disabled?: boolean
}

function KakaoSymbol() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3C6.48 3 2 6.53 2 10.9c0 2.8 1.86 5.26 4.66 6.65l-1.03 3.8c-.08.3.26.55.52.38l4.55-3.02c.42.05.86.08 1.3.08 5.52 0 10-3.53 10-7.9S17.52 3 12 3Z" />
    </svg>
  )
}

export function KakaoSignIn({ next, disabled = false }: KakaoSignInProps) {
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setConnecting(false)
    }
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  if (!kakaoConfigured()) return null

  return (
    <>
      <div className="fg-au-or">또는</div>
      <button
        type="button"
        className="fg-au-kakao"
        disabled={disabled}
        aria-busy={connecting || undefined}
        onClick={() => {
          setConnecting(true)
          startKakaoLogin(next)
        }}
      >
        <span className="fg-au-kakao__ic">
          <KakaoSymbol />
        </span>
        카카오로 시작하기
        <span aria-hidden className="fg-au-kakao__st">
          <i />
        </span>
      </button>
    </>
  )
}
