import { Link } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import type { ThemeRes } from '@/lib/apiTypes'
import { changeColorClass, formatChange, formatChangeOrDash, formatCompactKrw } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ThemeFocusProps {
  theme: ThemeRes
  from: string
}

interface FactProps {
  label: string
  value: string
  tone?: string
}

function Fact({ label, value, tone }: FactProps) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className={cn('font-mono text-sm font-medium tabular-nums text-foreground', tone)}>
        {value}
      </dd>
    </div>
  )
}

const PERIODS: readonly { key: 'w1' | 'm1' | 'm3'; label: string }[] = [
  { key: 'w1', label: '1주' },
  { key: 'm1', label: '1개월' },
  { key: 'm3', label: '3개월' },
]

export function ThemeFocus({ theme, from }: ThemeFocusProps) {
  const state = { from }
  const periods = PERIODS.filter((p) => theme[p.key] !== null)

  return (
    <section aria-labelledby="theme-focus-title" className="card-surface p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-x-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              id="theme-focus-title"
              className="text-title font-semibold tracking-[-0.4px] text-foreground"
            >
              {theme.name}
            </h2>
            <span
              className={cn(
                'font-mono text-base font-medium tabular-nums',
                changeColorClass(theme.change ?? 0),
              )}
            >
              {formatChangeOrDash(theme.change)}
            </span>
            <FavoriteStar type="THEME" targetKey={String(theme.id)} label={theme.name} size="sm" />
          </div>
          {theme.description && (
            <p className="mt-1.5 max-w-[72ch] text-body leading-relaxed text-foreground-secondary break-keep [text-wrap:pretty]">
              {theme.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4 text-xs font-semibold text-primary sm:pt-1">
          <Link to={`/theme/${theme.id}`} state={state} className="hover:underline">
            테마 상세 →
          </Link>
          <Link
            to={`/graph/theme/${encodeURIComponent(theme.name)}`}
            state={state}
            className="hover:underline"
          >
            기업 그래프 →
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border pt-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          <Fact label="거래대금" value={formatCompactKrw(theme.tradingValue)} />
          <Fact label="시가총액" value={formatCompactKrw(theme.marketCap)} />
          <Fact label="구성 종목" value={`${theme.stockCount}개`} />
          {periods.map((p) => {
            const value = theme[p.key] as number
            return (
              <Fact
                key={p.key}
                label={p.label}
                value={formatChange(value)}
                tone={changeColorClass(value)}
              />
            )
          })}
        </dl>
        {theme.topStocks.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-caption text-muted-foreground">대표 종목</span>
            {theme.topStocks.slice(0, 3).map((stock) => (
              <Link
                key={stock.ticker}
                to={`/stock/${stock.ticker}`}
                state={state}
                className="rounded-full border border-border px-2.5 py-1 text-caption font-medium text-foreground transition-colors hover:bg-muted"
              >
                {stock.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
