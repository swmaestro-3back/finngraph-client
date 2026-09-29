import { Link, useLocation } from 'react-router-dom'
import type { RelationLineRes, RelationPartyRes } from '@/lib/apiTypes'
import { edgeIdOf, relationLineLabel } from '@/lib/briefing'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface RelationLineRowProps {
  line: RelationLineRes
  onHover: (edgeId: string | null) => void
}

function Party({ party, pathname }: { party: RelationPartyRes; pathname: string }) {
  if (!party.ticker) return <span className="font-medium text-foreground">{party.name}</span>
  return (
    <Link to={`/stock/${party.ticker}`} state={fromState(pathname)} className="font-medium text-foreground hover:text-primary">
      {party.name}
    </Link>
  )
}

export function RelationLineRow({ line, onHover }: RelationLineRowProps) {
  const { pathname } = useLocation()
  const { predicate, badges } = relationLineLabel(line)
  const sourceKind = line.source.type === 'DISCLOSURE' ? '공시' : '뉴스'

  return (
    <li
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md px-1.5 py-1 text-caption hover:bg-surface-inset"
      onMouseEnter={() => onHover(edgeIdOf(line))}
      onMouseLeave={() => onHover(null)}
    >
      <Party party={line.subject} pathname={pathname} />
      <span aria-hidden className="text-foreground-tertiary">→</span>
      <Party party={line.object} pathname={pathname} />
      <span className="rounded-sm bg-foreground px-1.5 py-0.5 text-micro font-medium text-background">{predicate}</span>
      {line.item && <span className="text-foreground-secondary">({line.item})</span>}
      {badges.map((b) => (
        <span
          key={b}
          className={cn(
            'rounded-sm border px-1.5 py-0.5 text-micro font-medium',
            b === '부인' || b === '종료'
              ? 'border-trend-negative/30 bg-trend-negative/8 text-trend-negative'
              : 'border-accent-warm/30 bg-accent-warm-bg text-accent-warm',
          )}
        >
          {b}
        </span>
      ))}
      {line.source.url ? (
        <a
          href={line.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto rounded-sm border border-border px-1.5 py-0.5 text-micro text-foreground-secondary hover:text-foreground"
        >
          {sourceKind}
        </a>
      ) : (
        <span className="ml-auto rounded-sm border border-border px-1.5 py-0.5 text-micro text-foreground-secondary">{sourceKind}</span>
      )}
    </li>
  )
}
