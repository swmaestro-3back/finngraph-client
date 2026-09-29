import { Link } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { ThemeMetricHelp } from '@/components/theme/ThemeMetricHelp'
import {
  CloseDate,
  ThemeCountFacts,
  ThemeMetricCaption,
} from '@/components/theme/ThemeMetricSummary'
import type { ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { changeColorClass, formatChange, formatChangeOrDash, formatCompactKrw } from '@/lib/format'
import {
  hasBreadth,
  TRIMMED_TITLE,
  trimmedTickers,
  turnoverFact,
} from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

interface ThemeFocusProps {
  theme: ThemeRes
  from: string
  stocks?: ThemeStockRes[]
}

interface FactProps {
  label: string
  value: string
  tone?: string
  note?: { text: string; tone: string }
}

function Fact({ label, value, tone, note }: FactProps) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className={cn('font-mono text-sm font-medium tabular-nums text-foreground', tone)}>
        {value}
        {note && (
          <>
            <span className="mx-1.5 text-foreground-tertiary" aria-hidden>
              ·
            </span>
            <span className={cn('font-normal', note.tone)}>{note.text}</span>
          </>
        )}
      </dd>
    </div>
  )
}

const PERIODS: readonly { key: 'w1' | 'm1' | 'm3'; label: string }[] = [
  { key: 'w1', label: '1주' },
  { key: 'm1', label: '1개월' },
  { key: 'm3', label: '3개월' },
]

const CHIP =
  'inline-flex min-h-11 items-center rounded-full border border-border px-2.5 py-1 text-caption font-medium text-foreground transition-colors hover:bg-muted md:min-h-0'
const TEXT_LINK = 'flex min-h-11 items-center hover:underline md:min-h-0'

export function ThemeFocus({ theme, from, stocks = [] }: ThemeFocusProps) {
  const state = { from }
  const periods = PERIODS.filter((p) => theme[p.key] !== null)
  const leaders = (theme.leaders ?? []).slice(0, 2)
  const trimmed = trimmedTickers(stocks)
  const changeTone = theme.change === null ? 'text-muted-foreground' : changeColorClass(theme.change)
  const turnover = turnoverFact(theme.tradingValueRatio)

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
            <span className="inline-flex items-baseline gap-1.5">
              <span className={cn('font-mono text-base font-medium tabular-nums', changeTone)}>
                {formatChangeOrDash(theme.change)}
              </span>
              <CloseDate baseDate={theme.baseDate} />
            </span>
            <ThemeMetricHelp baseDate={theme.baseDate} className="-ml-1.5" />
            <FavoriteStar type="THEME" targetKey={String(theme.id)} label={theme.name} size="sm" />
          </div>
          <ThemeMetricCaption theme={theme} className="mt-1" />
          {theme.description && (
            <p className="mt-1.5 max-w-[72ch] text-body leading-relaxed text-foreground-secondary break-keep [text-wrap:pretty]">
              {theme.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4 text-xs font-semibold text-primary sm:pt-1">
          <Link to={`/theme/${theme.id}`} state={state} className={TEXT_LINK}>
            테마 상세 →
          </Link>
          <Link
            to={`/graph/theme/${encodeURIComponent(theme.name)}`}
            state={state}
            className={TEXT_LINK}
          >
            기업 그래프 →
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border pt-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          {hasBreadth(theme) ? (
            <ThemeCountFacts theme={theme} className="contents" />
          ) : (
            <Fact label="구성 종목" value={`${theme.stockCount}개`} />
          )}
          <Fact
            label="거래대금"
            value={formatCompactKrw(theme.tradingValue)}
            note={
              turnover
                ? {
                    text: turnover.multiple,
                    tone: turnover.emphasized ? 'text-foreground' : 'text-muted-foreground',
                  }
                : undefined
            }
          />
          <Fact label="시가총액" value={formatCompactKrw(theme.marketCap)} />
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {leaders.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-caption text-muted-foreground">주도주</span>
              {leaders.map((stock) => (
                <Link key={stock.ticker} to={`/stock/${stock.ticker}`} state={state} className={CHIP}>
                  {stock.name}
                  {stock.change !== null && (
                    <span
                      className={cn(
                        'ml-1.5 font-mono tabular-nums',
                        changeColorClass(stock.change),
                      )}
                    >
                      {formatChange(stock.change)}
                    </span>
                  )}
                  {trimmed.has(stock.ticker) && (
                    <span title={TRIMMED_TITLE} className="ml-1.5 font-normal text-muted-foreground">
                      평균 제외
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
          {theme.topStocks.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-caption text-muted-foreground">
                {leaders.length > 0 ? '시총 상위' : '대표 종목'}
              </span>
              {theme.topStocks.slice(0, 3).map((stock) => (
                <Link key={stock.ticker} to={`/stock/${stock.ticker}`} state={state} className={CHIP}>
                  {stock.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
