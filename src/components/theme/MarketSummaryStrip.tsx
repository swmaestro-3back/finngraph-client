import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StockRowRes } from '@/lib/apiTypes'
// 상승 종목 비율의 분모 정의는 lib/briefing.ts가 정본 — 브리핑 문장과 수치가 갈리지 않도록 재사용한다
import { computeBreadth } from '@/lib/briefing'
import { changeColorClass, formatChangeOrDash } from '@/lib/format'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { cn } from '@/lib/utils'

function pickTopMovers(stocks: StockRowRes[], capCount: number, count: number): StockRowRes[] {
  return stocks
    .filter((s) => s.marketCap !== null && s.change !== null)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, capCount)
    .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))
    .slice(0, count)
}

export function MarketSummaryStrip() {
  const navigate = useNavigate()
  const { data: stocks, loading, error } = useStocksCached()

  const breadth = useMemo(() => (stocks ? computeBreadth(stocks) : null), [stocks])
  const movers = useMemo(() => (stocks ? pickTopMovers(stocks, 50, 3) : []), [stocks])

  if (loading) {
    return (
      <section className="card-surface flex flex-col gap-3 p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-1.5 animate-pulse rounded bg-muted" />
        <div className="h-7 animate-pulse rounded bg-muted" />
      </section>
    )
  }
  if (error || !breadth) return null

  return (
    <section className="card-surface flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-body font-semibold text-foreground">시장 요약</h2>
        <p className="text-caption text-muted-foreground">
          상승 <span className="font-mono font-semibold text-stock-up">{breadth.up}</span>
          {' · '}보합{' '}
          <span className="font-mono font-semibold text-foreground">{breadth.flat}</span>
          {' · '}하락{' '}
          <span className="font-mono font-semibold text-stock-down">{breadth.down}</span>
        </p>
      </div>
      <div
        role="img"
        aria-label={`상승 종목 비율 ${Math.round(breadth.upRatio)}%`}
        className="flex h-1.5 overflow-hidden rounded-full"
      >
        <span className="bg-stock-up" style={{ width: `${breadth.upRatio}%` }} />
        <span className="flex-1 bg-stock-down" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-caption text-muted-foreground">주요 변동</span>
        {movers.map((s) => (
          <button
            key={s.ticker}
            type="button"
            onClick={() => navigate(`/stock/${s.ticker}`)}
            aria-label={`${s.name} ${formatChangeOrDash(s.change)} 종목 상세 보기`}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 hover:brightness-[0.97]',
              // changeColorClass와 같은 3분기 — 보합·null이 상승색 배경을 받으면 텍스트 색과 의미가 어긋난다
              (s.change ?? 0) > 0
                ? 'bg-stock-up/10'
                : (s.change ?? 0) < 0
                  ? 'bg-stock-down/10'
                  : 'bg-muted',
            )}
          >
            <span className="text-caption font-medium text-foreground">{s.name}</span>
            <span
              className={cn(
                'font-mono text-caption font-semibold',
                changeColorClass(s.change ?? 0),
              )}
            >
              {formatChangeOrDash(s.change)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
