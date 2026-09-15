import { useMemo } from 'react'
import type { ThemeRes } from '@/lib/apiTypes'
import { changeColorClass, formatChange } from '@/lib/format'
import {
  rankMomentum,
  rankSignals,
  type MomentumBadge,
  type MomentumEntry,
} from '@/lib/momentum'
import { cn } from '@/lib/utils'

interface InsightStripProps {
  themes: ThemeRes[]
  onSelectTheme: (name: string) => void
}

const BADGE_LABEL: Record<Exclude<MomentumBadge, null>, string> = {
  trend: '추세',
  spike: '단기',
}

function MomentumBadgeChip({ badge }: { badge: MomentumBadge }) {
  if (!badge) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-micro font-semibold',
        badge === 'trend'
          ? 'bg-trend-positive/12 text-trend-positive'
          : 'bg-accent-warm-bg text-accent-warm',
      )}
    >
      {BADGE_LABEL[badge]}
    </span>
  )
}

function SignalCard({ themes, onSelectTheme }: InsightStripProps) {
  const signals = useMemo(() => rankSignals(themes, 3), [themes])

  return (
    <section className="card-surface flex flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-body font-semibold text-foreground">오늘의 시그널</h2>
        <span className="text-micro text-muted-foreground">등락폭 · 거래대금 상위</span>
      </div>
      {signals.length === 0 ? (
        <p className="text-caption text-muted-foreground">오늘 집계된 테마 시그널이 없습니다.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {signals.map((theme) => (
            <button
              key={theme.name}
              type="button"
              onClick={() => onSelectTheme(theme.name)}
              aria-label={`${theme.name} ${formatChange(theme.change ?? 0)} 테마 선택`}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 hover:brightness-[0.97]',
                (theme.change ?? 0) >= 0 ? 'bg-stock-up/10' : 'bg-stock-down/10',
              )}
            >
              <span className="text-caption font-medium text-foreground">{theme.name}</span>
              <span
                className={cn(
                  'font-mono text-caption font-semibold',
                  changeColorClass(theme.change ?? 0),
                )}
              >
                {formatChange(theme.change ?? 0)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function PeriodBars({ entry, max }: { entry: MomentumEntry; max: number }) {
  const values = [entry.w1, entry.m1, entry.m3]
  return (
    <span
      aria-label={`1주 ${formatChange(entry.w1)}, 1개월 ${formatChange(entry.m1)}, 3개월 ${formatChange(entry.m3)}`}
      className="flex h-4 shrink-0 items-end gap-[2px]"
    >
      {values.map((v, i) => (
        <span
          key={i}
          className={cn(
            'w-[5px] rounded-[1px]',
            v >= 0 ? 'bg-stock-up/70' : 'bg-stock-down/70',
          )}
          style={{ height: `${Math.max(15, (Math.abs(v) / max) * 100)}%` }}
        />
      ))}
    </span>
  )
}

function MomentumBoard({ themes, onSelectTheme }: Pick<InsightStripProps, 'themes' | 'onSelectTheme'>) {
  const entries = useMemo(() => rankMomentum(themes, 4), [themes])
  const maxAbs = Math.max(
    ...entries.flatMap((e) => [Math.abs(e.w1), Math.abs(e.m1), Math.abs(e.m3)]),
    0.01,
  )

  return (
    <section className="card-surface flex flex-col gap-1 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-body font-semibold text-foreground">모멘텀 리더보드</h2>
        <span className="text-micro text-muted-foreground">1개월 수익률 상위</span>
      </div>
      {entries.map((entry, i) => (
        <button
          key={entry.name}
          type="button"
          onClick={() => onSelectTheme(entry.name)}
          aria-label={`${entry.name} 1개월 ${formatChange(entry.m1)} 테마 선택`}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted"
        >
          <span
            className={cn(
              'w-4 shrink-0 text-center font-mono text-caption',
              i === 0 ? 'font-semibold text-foreground' : 'text-foreground-tertiary',
            )}
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-caption font-medium text-foreground">
            {entry.name}
          </span>
          <MomentumBadgeChip badge={entry.badge} />
          <PeriodBars entry={entry} max={maxAbs} />
          <span
            className={cn(
              'w-[64px] shrink-0 text-right font-mono text-caption font-semibold',
              changeColorClass(entry.m1),
            )}
          >
            {formatChange(entry.m1)}
          </span>
        </button>
      ))}
      <p className="mt-auto pt-1 text-micro text-muted-foreground">
        막대 = 1주 · 1개월 · 3개월 수익률
      </p>
    </section>
  )
}

export function InsightStrip({ themes, onSelectTheme }: InsightStripProps) {
  return (
    <div className="mb-3 grid items-stretch gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 [&>section]:h-full">
        <SignalCard themes={themes} onSelectTheme={onSelectTheme} />
      </div>
      <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:delay-75 motion-safe:[animation-fill-mode:backwards] [&>section]:h-full">
        <MomentumBoard themes={themes} onSelectTheme={onSelectTheme} />
      </div>
    </div>
  )
}
