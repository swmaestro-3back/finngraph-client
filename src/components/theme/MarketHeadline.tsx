import { Link, useLocation } from 'react-router-dom'
import type { ThemeRes } from '@/lib/apiTypes'
import { buildMarketHeadline } from '@/lib/briefing'
import { changeColorClass, formatChangeOrDash } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { cn } from '@/lib/utils'

interface MarketHeadlineProps {
  themes: ThemeRes[]
}

export function MarketHeadline({ themes }: MarketHeadlineProps) {
  const { pathname } = useLocation()
  const { data: stocks, loading, error } = useStocksCached()

  if (error) return null
  if (loading || !stocks)
    return <div className="mb-3 h-7 w-2/3 animate-pulse rounded bg-muted" />

  const headline = buildMarketHeadline(stocks, themes)

  return (
    <p className="mb-3 text-title font-medium leading-snug text-foreground">
      상승 <span className="font-mono">{headline.up}</span> · 하락{' '}
      <span className="font-mono">{headline.down}</span>
      {headline.topTheme && (
        <>
          {' — '}오늘 가장 뜨거운 테마는{' '}
          <Link
            to={`/theme/${headline.topTheme.id}`}
            state={fromState(pathname)}
            className="font-semibold hover:text-primary"
          >
            {headline.topTheme.name}
          </Link>{' '}
          <span
            className={cn('font-mono', changeColorClass(headline.topTheme.change))}
          >
            {formatChangeOrDash(headline.topTheme.change)}
          </span>
          {headline.topTheme.leader && <>, 주도주는 {headline.topTheme.leader}</>}
        </>
      )}
    </p>
  )
}
