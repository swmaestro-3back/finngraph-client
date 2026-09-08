import { useMemo, useState } from 'react'
import { FilterChip } from '@/components/ui/filter-chip'
import type { ThemeRes } from '@/lib/apiTypes'
import { changeColorClass, formatChangeOrDash } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ThemeTopMoversProps {
  themes: ThemeRes[]
  onSelectTheme: (name: string) => void
}

type MoverPeriod = 'change' | 'w1' | 'm1'

const PERIODS: MoverPeriod[] = ['change', 'w1', 'm1']

const PERIOD_LABELS: Record<MoverPeriod, string> = {
  change: '당일',
  w1: '1주',
  m1: '1개월',
}

function rankThemes(
  themes: ThemeRes[],
  period: MoverPeriod,
  direction: 'up' | 'down',
  count: number,
): ThemeRes[] {
  const sign = direction === 'up' ? -1 : 1
  return themes
    // 부호까지 걸러야 하락 테마가 급등 컬럼을(또는 그 반대) 채우거나 양쪽에 중복 등장하지 않는다
    .filter((t) => {
      const v = t[period]
      return v !== null && (direction === 'up' ? v > 0 : v < 0)
    })
    .sort((a, b) => sign * ((a[period] ?? 0) - (b[period] ?? 0)))
    .slice(0, count)
}

function MoverColumn({
  title,
  entries,
  period,
  onSelectTheme,
}: {
  title: string
  entries: ThemeRes[]
  period: MoverPeriod
  onSelectTheme: (name: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="px-1 text-micro font-medium text-muted-foreground">{title}</span>
      {entries.length === 0 && (
        <span className="px-1 py-1 text-caption text-muted-foreground">해당 없음</span>
      )}
      {entries.map((t, i) => (
        <button
          key={t.name}
          type="button"
          onClick={() => onSelectTheme(t.name)}
          aria-label={`${t.name} ${formatChangeOrDash(t[period])} 테마 선택`}
          className="flex w-full cursor-pointer flex-col gap-0.5 rounded-md px-1 py-1 text-left hover:bg-muted"
        >
          <span className="flex w-full items-center gap-2">
            <span className="w-4 shrink-0 text-center font-mono text-caption text-foreground-tertiary">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-caption font-medium text-foreground">
              {t.name}
            </span>
            <span
              className={cn(
                'shrink-0 text-right font-mono text-caption font-semibold',
                changeColorClass(t[period] ?? 0),
              )}
            >
              {formatChangeOrDash(t[period])}
            </span>
            <span className="w-[72px] shrink-0 truncate text-caption text-muted-foreground">
              {t.topStocks[0]?.name}
            </span>
          </span>
          {t.description && (
            <span className="line-clamp-1 pl-6 text-caption text-muted-foreground">
              {t.description}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function ThemeTopMovers({ themes, onSelectTheme }: ThemeTopMoversProps) {
  const [period, setPeriod] = useState<MoverPeriod>('change')

  const gainers = useMemo(() => rankThemes(themes, period, 'up', 4), [themes, period])
  const losers = useMemo(() => rankThemes(themes, period, 'down', 4), [themes, period])

  return (
    <section className="card-surface flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-body font-semibold text-foreground">급등·급락 테마</h2>
        <div className="flex items-center gap-1.5">
          {PERIODS.map((p) => (
            <FilterChip key={p} active={period === p} onClick={() => setPeriod(p)}>
              {PERIOD_LABELS[p]}
            </FilterChip>
          ))}
        </div>
      </div>
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <MoverColumn
          title="급등 Top 4"
          entries={gainers}
          period={period}
          onSelectTheme={onSelectTheme}
        />
        <MoverColumn
          title="급락 Top 4"
          entries={losers}
          period={period}
          onSelectTheme={onSelectTheme}
        />
      </div>
    </section>
  )
}
