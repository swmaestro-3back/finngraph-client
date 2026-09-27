import { FilterChip } from '@/components/ui/filter-chip'
import { formatLocalDate, formatLocalTime, useNow } from '@/lib/marketClock'
import { HOT_THEME_COUNTS } from '@/lib/queries/useHotThemes'
import { formatTradingDate } from '@/lib/referenceDate'

interface TreemapToolbarProps {
  shownCount: number
  referenceDate: string | null
  themeCount: number
  onThemeCountChange: (count: number) => void
  onlyFavorites: boolean
  onToggleFavorites: () => void
}

export function TreemapToolbar({
  shownCount,
  referenceDate,
  themeCount,
  onThemeCountChange,
  onlyFavorites,
  onToggleFavorites,
}: TreemapToolbarProps) {
  const now = useNow()

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
          <p className="text-body text-muted-foreground">
            데이터 기준{' '}
            {referenceDate ? (
              <>
                <span className="font-mono tabular-nums text-foreground-secondary">
                  {formatTradingDate(referenceDate)}
                </span>{' '}
                장마감
              </>
            ) : (
              '장마감'
            )}
            <span className="mx-2 text-foreground-tertiary" aria-hidden>
              |
            </span>
            상승·하락 상위 <span className="font-mono tabular-nums">{shownCount}</span>개 테마
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-caption whitespace-nowrap text-muted-foreground">표시 테마 수</span>
        {HOT_THEME_COUNTS.map((count) => (
          <FilterChip
            key={count}
            active={themeCount === count}
            onClick={() => onThemeCountChange(count)}
          >
            {count}개
          </FilterChip>
        ))}
        <span aria-hidden className="mx-1.5 h-4 w-px bg-border" />
        <FilterChip active={onlyFavorites} onClick={onToggleFavorites}>
          내 관심만
        </FilterChip>
      </div>
    </div>
  )
}
