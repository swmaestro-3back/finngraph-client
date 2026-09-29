import { ArrowUpRight } from 'lucide-react'
import type { CitationRes } from '@/lib/apiTypes'
import { citationLabel } from '@/lib/briefing'
import { cn } from '@/lib/utils'

interface CitationBadgesProps {
  citations: CitationRes[]
  className?: string
}

const BADGE =
  'inline-flex max-w-[28ch] items-center gap-0.5 rounded-sm border border-border bg-surface-inset px-1.5 py-0.5 text-micro font-medium leading-none text-foreground-secondary'

export function CitationBadges({ citations, className }: CitationBadgesProps) {
  if (citations.length === 0) return null
  return (
    <span className={cn('inline-flex flex-wrap gap-1 align-middle', className)}>
      {citations.map((c) =>
        c.url ? (
          <a
            key={`${c.type}:${c.id}`}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            title={citationLabel(c)}
            className={cn(BADGE, 'hover:border-foreground hover:text-foreground')}
          >
            <span className="truncate">{citationLabel(c)}</span>
            <ArrowUpRight className="size-2.5 shrink-0" />
          </a>
        ) : (
          <span key={`${c.type}:${c.id}`} title={citationLabel(c)} className={BADGE}>
            <span className="truncate">{citationLabel(c)}</span>
          </span>
        ),
      )}
    </span>
  )
}
