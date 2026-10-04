import { useState, type ReactNode } from 'react'
import { stockLogoUrl } from '@/lib/stockLogo'
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
      src={stockLogoUrl(ticker)}
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
