import { useState } from 'react'
import { List, X } from 'lucide-react'
import { NODE_COLORS, ENTITY_LABELS, ALL_ENTITY_TYPES, type EntityType } from '@/data/graphTypes'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface Props {
  /** 현재 표시 중인 엔티티 종류 */
  visibleTypes: Set<EntityType>
}

const PANEL = 'rounded-xl border border-border bg-background/95 px-3.5 py-2.5 shadow-[var(--shadow-soft)] backdrop-blur'

export function Legend({ visibleTypes }: Props) {
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = useState(false)

  const types = ALL_ENTITY_TYPES.filter((t) => visibleTypes.has(t))
  if (types.length === 0) return null

  const items = types.map((type) => (
    <div key={type} className="flex items-center gap-1.5">
      <span
        className="inline-block size-2.5 shrink-0 rounded-full"
        style={{ background: NODE_COLORS[type] }}
      />
      <span className="text-[11px] font-medium text-[#5b616e]">{ENTITY_LABELS[type]}</span>
    </div>
  ))

  if (!isMobile) {
    return (
      <div className={cn(PANEL, 'absolute bottom-4 left-4 flex max-w-[520px] flex-wrap gap-3.5')}>
        {items}
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-4 z-10">
      {expanded && (
        <div
          className={cn(
            PANEL,
            'mb-2 flex max-w-[calc(100vw-80px)] flex-wrap gap-2.5',
            'animate-in fade-in-0 slide-in-from-bottom-2 duration-200',
          )}
        >
          {items}
        </div>
      )}
      <Button
        variant="outline"
        size="icon-lg"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? '범례 닫기' : '범례 보기'}
        aria-expanded={expanded}
        className="bg-background/95 shadow-[var(--shadow-soft)] backdrop-blur"
      >
        {expanded ? <X strokeWidth={2} /> : <List strokeWidth={2} />}
      </Button>
    </div>
  )
}
