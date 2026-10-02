import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StockLogoProps {
  ticker: string
  /** 한 변 길이(px) */
  size?: number
  /** 아이콘이 없을 때도 같은 크기의 빈 원을 남긴다 — 표처럼 행마다 정렬이 맞아야 하는 곳에서 쓴다 */
  reserveSpace?: boolean
  /** 아이콘이 없을 때 대신 그릴 것 — 주면 reserveSpace보다 먼저다 */
  fallback?: ReactNode
  className?: string
}

/** 종목 로고 — 백엔드가 주지 않으므로 ticker로 토스증권 정적 아이콘 주소를 만든다. 국내 종목코드와 미국 티커(NVDA 등) 모두 있다 */
function logoUrl(ticker: string): string {
  return `https://static.toss.im/png-icons/securities/icn-sec-fill-${ticker}.png`
}

export function StockLogo({
  ticker,
  size = 32,
  reserveSpace = false,
  fallback,
  className,
}: StockLogoProps) {
  // 아이콘이 없는 종목은 깨진 이미지 대신 자리를 비운다. ticker가 바뀌면 실패 기록도 버린다
  const [failedTicker, setFailedTicker] = useState<string | null>(null)
  const shape = cn('shrink-0 rounded-full bg-muted', className)
  if (failedTicker === ticker) {
    if (fallback !== undefined) return fallback
    if (!reserveSpace) return null
    return <span aria-hidden className={cn('inline-block', shape)} style={{ width: size, height: size }} />
  }

  return (
    <img
      src={logoUrl(ticker)}
      alt=""
      width={size}
      height={size}
      // 목록은 한 페이지에 수십 개가 뜬다 — 화면 밖 행은 스크롤될 때 받는다
      loading="lazy"
      className={cn('object-cover', shape)}
      onError={() => setFailedTicker(ticker)}
    />
  )
}
