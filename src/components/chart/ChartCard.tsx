import type { ReactNode } from 'react'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

// 시세 차트 카드의 공통 껍데기 — 헤더 한 줄(제목 · 구간 등락률 · 구간 범위)과 본문
// 주식 상세와 테마 상세가 같은 헤더를 쓴다. 기간 전환 칩처럼 카드에 붙는 컨트롤은 actions로 받는다.

interface ChartCardProps {
  /** "주가 일봉" / "테마 지수 주봉" */
  title: string
  /** 구간 등락률(%) */
  change: number
  rangeLow: number
  rangeHigh: number
  /** 헤더 오른쪽 모서리 — 기간 전환 칩 등 */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function ChartCard({
  title,
  change,
  rangeLow,
  rangeHigh,
  actions,
  className,
  children,
}: ChartCardProps) {
  return (
    <section className={cn('card-surface p-5', className)}>
      <div className="mb-[9px] flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-body font-semibold text-foreground">{title}</h2>
          <span className={cn('font-mono text-body font-medium', changeColorClass(change))}>
            {formatChange(change)}
          </span>
          <span className="text-caption text-muted-foreground">
            구간 {formatPrice(rangeLow)} ~ {formatPrice(rangeHigh)}
          </span>
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}
