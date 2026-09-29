import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { LockedBlock } from '@/components/briefing/LockedBlock'
import { Button } from '@/components/ui/button'
import type { RiskRes } from '@/lib/apiTypes'
import { groupRisks } from '@/lib/briefing'
import { fromState } from '@/lib/navigation'

interface RiskListProps {
  risks: RiskRes[] | null
  lockedCount: number
}

const VISIBLE_LIMIT = 10

export function RiskList({ risks, lockedCount }: RiskListProps) {
  const { pathname } = useLocation()
  const [expanded, setExpanded] = useState(false)

  if (risks === null) {
    return (
      <div className="card-surface p-5">
        <LockedBlock
          title={lockedCount > 0 ? `리스크 ${lockedCount}건은 로그인 후 볼 수 있어요` : '리스크 목록은 로그인 후 볼 수 있어요'}
          lines={Math.min(4, Math.max(2, lockedCount))}
          size="md"
        />
      </div>
    )
  }

  if (risks.length === 0) {
    return <p className="card-surface p-5 text-body text-muted-foreground">기준일 창에 새로 잡힌 리스크가 없습니다.</p>
  }

  const shown = expanded ? risks : risks.slice(0, VISIBLE_LIMIT)
  const groups = groupRisks(shown)
  const hidden = risks.length - shown.length

  return (
    <div className="card-surface flex flex-col gap-4 p-5">
      {groups.map((g) => (
        <section key={g.kind}>
          <h3 className="mb-1.5 text-caption font-medium text-muted-foreground">
            {g.label} <span className="font-mono tabular-nums">{g.items.length}</span>
          </h3>
          <ul className="flex flex-col divide-y divide-surface-inset">
            {g.items.map((r, i) => (
              <li key={`${r.ticker}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 text-caption">
                <Link
                  to={`/stock/${r.ticker}`}
                  state={fromState(pathname)}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {r.name}
                </Link>
                {r.market && <span className="text-foreground-tertiary">{r.market}</span>}
                <span className="min-w-0 flex-1 truncate text-foreground-secondary">{r.detail}</span>
                {r.source?.url && (
                  <a
                    href={r.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-micro text-muted-foreground hover:text-foreground"
                  >
                    출처
                    <ArrowUpRight className="size-2.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {hidden > 0 && (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setExpanded(true)}>
          {hidden}건 더 보기
        </Button>
      )}
    </div>
  )
}
