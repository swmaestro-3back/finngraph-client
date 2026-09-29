import { Link, useLocation } from 'react-router-dom'
import { CitationBadges } from '@/components/briefing/CitationBadges'
import { LockedBlock } from '@/components/briefing/LockedBlock'
import type { WatchPointRes } from '@/lib/apiTypes'
import { WATCH_LABELS } from '@/lib/briefing'
import { fromState } from '@/lib/navigation'

interface WatchPointListProps {
  points: WatchPointRes[] | null
  lockedCount: number
}

export function WatchPointList({ points, lockedCount }: WatchPointListProps) {
  const { pathname } = useLocation()

  if (points === null) {
    return (
      <div className="card-surface p-5">
        <LockedBlock
          title={lockedCount > 0 ? `지켜볼 점 ${lockedCount}건은 로그인 후 볼 수 있어요` : '지켜볼 점은 로그인 후 볼 수 있어요'}
          lines={Math.min(4, Math.max(2, lockedCount))}
          size="md"
        />
      </div>
    )
  }

  if (points.length === 0) {
    return <p className="card-surface p-5 text-body text-muted-foreground">오늘은 지켜볼 후보가 없습니다.</p>
  }

  return (
    <ul className="card-surface flex flex-col divide-y divide-surface-inset px-5">
      {points.map((p, i) => (
        <li key={i} className="flex flex-col gap-1.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-border px-1.5 py-0.5 text-micro font-medium text-foreground-secondary">
              {WATCH_LABELS[p.kind]}
            </span>
            {p.stocks.map((s) => (
              <Link
                key={s.ticker}
                to={`/stock/${s.ticker}`}
                state={fromState(pathname)}
                className="text-caption font-medium text-foreground hover:text-primary"
              >
                {s.name}
              </Link>
            ))}
          </div>
          <p className="text-body leading-[1.7] text-foreground">
            {p.text}
            <CitationBadges citations={p.citations} className="ml-1.5" />
          </p>
        </li>
      ))}
    </ul>
  )
}
