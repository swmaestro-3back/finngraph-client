import { ThemeMetricHelp } from '@/components/theme/ThemeMetricHelp'
import { TreemapLegend } from '@/components/theme/TreemapLegend'
import { FilterChip } from '@/components/ui/filter-chip'
import type { ThemeMarketRes } from '@/lib/apiTypes'
import { formatLocalDate, formatLocalTime, useNow } from '@/lib/marketClock'
import { HOT_THEME_COUNTS } from '@/lib/queries/useHotThemes'
import { formatTradingDate, priceBasisSuffix } from '@/lib/referenceDate'

interface TreemapToolbarProps {
  shownCount: number
  market: ThemeMarketRes | null
  referenceDate: string | null
  themeCount: number
  onThemeCountChange: (count: number) => void
  onlyFavorites: boolean
  onToggleFavorites: () => void
  maxUp: number | null
  maxDown: number | null
}

function Divider() {
  return (
    <span className="mx-2 text-foreground-tertiary" aria-hidden>
      ·
    </span>
  )
}

export function TreemapToolbar({
  shownCount,
  market,
  referenceDate,
  themeCount,
  onThemeCountChange,
  onlyFavorites,
  onToggleFavorites,
  maxUp,
  maxDown,
}: TreemapToolbarProps) {
  const now = useNow()
  const baseDate = market?.baseDate ?? referenceDate
  const suffix = priceBasisSuffix(market)

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 className="text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">
          테마 트리맵
        </h1>
        <div className="mt-2 flex flex-col gap-1">
          <time
            dateTime={now.toISOString()}
            className="font-mono text-sm font-medium tabular-nums text-foreground"
          >
            {formatLocalDate(now)} {formatLocalTime(now)}
          </time>
          <p className="flex flex-wrap items-center gap-y-1 text-body text-muted-foreground">
            {baseDate ? (
              <span>
                <span className="font-mono tabular-nums text-foreground-secondary">
                  {formatTradingDate(baseDate)}
                </span>{' '}
                {suffix}
              </span>
            ) : (
              <span>장마감 종가 기준</span>
            )}
            <ThemeMetricHelp baseDate={baseDate} suffix={suffix} className="ml-1">
              <TreemapLegend maxUp={maxUp} maxDown={maxDown} />
            </ThemeMetricHelp>
            <Divider />
            <span>
              핫 테마 <span className="font-mono tabular-nums">{shownCount}</span>개
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-caption whitespace-nowrap text-muted-foreground">최대 표시 테마수</span>
        {HOT_THEME_COUNTS.map((count) => (
          <FilterChip
            key={count}
            active={themeCount === count}
            onClick={() => onThemeCountChange(count)}
            className="min-h-11 md:min-h-0"
          >
            {count}개
          </FilterChip>
        ))}
        <span aria-hidden className="mx-1.5 hidden h-4 w-px bg-border md:block" />
        <FilterChip active={onlyFavorites} onClick={onToggleFavorites} className="min-h-11 md:min-h-0">
          관심 테마
        </FilterChip>
      </div>
    </div>
  )
}
