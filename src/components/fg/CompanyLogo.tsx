import { useState, type CSSProperties, type ReactNode } from 'react'
import { logoSources } from '@/lib/stockLogo'
import { cn } from '@/lib/utils'

/** CSS 에 크기 단계가 있는 변은 클래스로, 그 밖의 변은 인라인 크기로 그린다 */
const STEPPED_SIZES: readonly number[] = [16, 24, 32, 40]

interface CompanyLogoProps {
  name: string
  /** 종목코드 — 있으면 받아둔 로고 → CDN 순으로 찾고, 없거나 전부 실패하면 이니셜 */
  ticker?: string | null
  size?: number
  /** 로고가 없을 때 동그라미 대신 통째로 그릴 것(그래프의 분류 색 점 등) */
  fallback?: ReactNode
  className?: string
}

export function CompanyLogo({ name, ticker = null, size = 32, fallback, className }: CompanyLogoProps) {
  const stepped = STEPPED_SIZES.includes(size)
  const frame = {
    className: cn('fg-clogo', stepped && size !== 32 && `fg-clogo--${size}`, className),
    style: stepped ? undefined : { width: size, height: size, fontSize: Math.round(size * 0.4) },
  }
  if (!ticker) return fallback ?? <Circle {...frame}>{name.slice(0, 1)}</Circle>
  // 티커가 바뀌면 어느 소스까지 가 봤는지도 처음부터 다시 센다
  return <LogoCircle key={ticker} ticker={ticker} initial={name.slice(0, 1)} fallback={fallback} {...frame} />
}

interface FrameProps {
  className: string
  style: CSSProperties | undefined
}

function Circle({ className, style, children }: FrameProps & { children: ReactNode }) {
  return (
    <i className={className} style={style} aria-hidden="true">
      {children}
    </i>
  )
}

/**
 * 티커별로 받아둔 파일이 없다고 확인된 것들 — 같은 종목이 목록 여러 행에 떠도 404 를 한 번만 겪는다.
 * CDN 까지 실패한 건 기억하지 않는다. 일시적인 네트워크 오류를 세션 내내 끌고 가지 않기 위해서다
 */
const noLocalFile = new Set<string>()

function LogoCircle({ ticker, initial, fallback, ...frame }: FrameProps & { ticker: string; initial: string; fallback: ReactNode }) {
  const sources = logoSources(ticker)
  const [stage, setStage] = useState(() => (noLocalFile.has(ticker) ? 1 : 0))
  const [loaded, setLoaded] = useState(false)
  const src = sources[stage]
  if (src === undefined) return fallback ?? <Circle {...frame}>{initial}</Circle>
  return (
    <Circle {...frame}>
      {/* 이미지가 뜨기 전까지는 이니셜이 자리를 지킨다 */}
      {!loaded && initial}
      <img
        src={src}
        alt=""
        // 목록은 한 페이지에 수십 개가 뜬다 — 화면 밖 행은 스크롤될 때 받는다
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (stage === 0) noLocalFile.add(ticker)
          setStage(stage + 1)
        }}
      />
    </Circle>
  )
}
