import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getMarketCap, getTradingValue } from '@/data/stockMeta'
import type { ThemeItem } from '@/data/themes'
import { changeColorClass, formatAmount, formatChange, formatPrice } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

// 종목명 · 현재가 · 시가총액 · 거래대금 · 등락률
// 수치 열 기준폭 = 최대 자릿수(시가총액·거래대금 9자리 "999,999,999" 80px, 현재가 76px).
// xl 이상은 여기에 여유와 12px 간격을 얹고, 그보다 좁으면 최소폭으로 줄여 종목명 자리를 지킨다.
const GRID =
  'grid gap-2 grid-cols-[minmax(0,1fr)_78px_80px_80px_50px] xl:gap-3 xl:grid-cols-[minmax(0,1fr)_82px_86px_86px_50px]'

interface StockSectionProps {
  /** 카드 제목·등락률·상세 링크와 종목 리스트의 출처가 되는 테마 */
  theme: ThemeItem
  /** 섹션 래퍼 추가 클래스 (여백 등) */
  className?: string
  /** 리스트 영역 추가 클래스 (고정 높이·스크롤 등) */
  listClassName?: string
}

/** 뉴스 리스트와 동일한 한 줄 Row 형태의 테마 종목 리스트 카드 */
export function StockSection({ theme, className, listClassName }: StockSectionProps) {
  const { pathname } = useLocation()

  // 등락률 내림차순 — 상승률이 큰 종목이 위로
  // 시가총액·거래대금은 테마 상세·주식 목록과 같은 결정적 규칙으로 파생
  const stocks = useMemo(
    () =>
      [...theme.stocks]
        .sort((a, b) => b.change - a.change)
        .map((stock) => ({
          ...stock,
          marketCap: getMarketCap(stock.code, stock.price),
          tradingValue: getTradingValue(stock.name, stock.price),
        })),
    [theme],
  )

  return (
    <section className={cn('rounded-3xl border border-border bg-background p-5', className)}>
      <div className="mb-[9px] flex min-h-[30px] items-center justify-between">
        <div className="flex items-baseline gap-[9px]">
          <h2 className="text-lg font-medium tracking-[-0.5px] text-foreground">
            {theme.name}
          </h2>
          <span
            className={cn(
              'font-mono text-base font-medium tracking-[-0.5px]',
              changeColorClass(theme.change),
            )}
          >
            {formatChange(theme.change)}
          </span>
        </div>
        <Link
          to={`/theme/${theme.id}`}
          state={fromState(pathname)}
          className="text-xs font-semibold leading-none text-primary"
        >
          테마 상세 →
        </Link>
      </div>

      <div className={cn(GRID, 'border-b border-border pb-1.5 text-[11px] text-muted-foreground')}>
        <span className="truncate">종목명 · {stocks.length}개 종목</span>
        <span className="text-right">현재가</span>
        <span className="text-right">시가총액 (억)</span>
        <span className="text-right">거래대금 (백만)</span>
        <span className="text-right">등락률</span>
      </div>

      <div className={cn(listClassName)}>
        {stocks.map((stock) => (
          <Link
            key={stock.code}
            to={`/stock/${stock.code}`}
            state={fromState(pathname)}
            className={cn(
              GRID,
              'min-h-[38px] items-center border-b border-surface-inset py-1 hover:bg-muted',
            )}
          >
            <span className="flex items-center gap-[9px] overflow-hidden">
              <span className="truncate text-sm font-semibold text-foreground">
                {stock.name}
              </span>
              {/* 수치 열을 넉넉히 잡은 만큼, 폭이 좁을 땐 코드를 접어 종목명 자리를 지킨다 */}
              <span className="hidden font-mono text-[11px] text-[#a8acb3] xl:inline">
                {stock.code}
              </span>
            </span>
            <span className="text-right font-mono text-sm font-medium text-foreground">
              {formatPrice(stock.price)}
            </span>
            <span className="text-right font-mono text-xs text-[#5b616e]">
              {formatAmount(stock.marketCap)}
            </span>
            <span className="text-right font-mono text-xs text-[#5b616e]">
              {formatAmount(stock.tradingValue)}
            </span>
            <span
              className={cn(
                'text-right font-mono text-xs font-medium',
                changeColorClass(stock.change),
              )}
            >
              {formatChange(stock.change)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
