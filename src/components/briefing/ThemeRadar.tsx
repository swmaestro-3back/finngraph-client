import { Link, useLocation } from 'react-router-dom'
import { Breadth } from '@/components/theme/ThemeMetricSummary'
import type { BriefingThemeRes } from '@/lib/apiTypes'
import { themeRadarSplit } from '@/lib/briefing'
import { changeColorClass, formatChange, formatChangeOrDash } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface ThemeRadarProps {
  themes: BriefingThemeRes[]
}

function ThemeCard({ theme }: { theme: BriefingThemeRes }) {
  const { pathname } = useLocation()
  return (
    <li className="card-surface flex flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          to={`/theme/${theme.id}`}
          state={fromState(pathname)}
          className="truncate text-body font-semibold text-foreground hover:text-primary"
        >
          {theme.name}
        </Link>
        <span className={cn('shrink-0 font-mono text-body font-semibold', changeColorClass(theme.change ?? 0))}>
          {formatChangeOrDash(theme.change)}
        </span>
      </div>
      <p className="flex items-center gap-2 text-caption text-muted-foreground">
        <span>등락 현황</span>
        <Breadth up={theme.upCount} flat={theme.flatCount} down={theme.downCount} />
        <span>
          / <span className="font-mono tabular-nums">{theme.stockCount}</span>종목
        </span>
      </p>
      {theme.leaders.length > 0 && (
        <p className="text-caption text-muted-foreground">
          주도주{' '}
          {theme.leaders.map((l, i) => (
            <span key={l.ticker}>
              {i > 0 && ', '}
              <Link to={`/stock/${l.ticker}`} state={fromState(pathname)} className="font-medium text-foreground hover:text-primary">
                {l.name}
              </Link>
              <span className={cn('ml-1 font-mono tabular-nums', changeColorClass(l.change))}>{formatChange(l.change)}</span>
            </span>
          ))}
        </p>
      )}
    </li>
  )
}

function Column({ title, themes }: { title: string; themes: BriefingThemeRes[] }) {
  return (
    <div>
      <h3 className="mb-2 text-caption font-medium text-muted-foreground">{title}</h3>
      {themes.length === 0 ? (
        <p className="card-surface p-4 text-caption text-muted-foreground">해당 방향으로 핫 테마 조건을 통과한 테마가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {themes.map((t) => (
            <ThemeCard key={t.id} theme={t} />
          ))}
        </ul>
      )}
    </div>
  )
}

export function ThemeRadar({ themes }: ThemeRadarProps) {
  const { up, down } = themeRadarSplit(themes)
  if (themes.length === 0) {
    return (
      <p className="card-surface p-5 text-body text-muted-foreground">핫 테마 조건을 통과한 테마가 없습니다.</p>
    )
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Column title="상승" themes={up} />
      <Column title="하락" themes={down} />
    </div>
  )
}
