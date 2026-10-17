import type { ReactNode } from 'react'
import { CATEGORY_COLORS, type NodeCategory } from '@/data/graphTypes'
import { useIsMobile } from '@/hooks/use-mobile'
import { T } from '@/lib/graphTheme'
import { cn } from '@/lib/utils'

const CENTER = { x: 500, y: 330 }
const NODES: readonly [number, number, NodeCategory][] = [
  [400, 190, 'kospi'], [580, 180, 'kosdaq'], [700, 250, 'kospi'], [780, 350, 'kosdaq'],
  [700, 455, 'kospi'], [600, 525, 'kosdaq'], [500, 540, 'kosdaq'], [310, 440, 'kospi'],
  [840, 240, 'nasdaq'], [200, 350, 'kosdaq'], [270, 260, 'kospi'], [250, 170, 'kosdaq'],
  [100, 260, 'kosdaq'], [860, 440, 'kospi'], [640, 375, 'kosdaq'], [140, 440, 'kosdaq'],
]

interface Props {
  dim?: boolean
  children?: ReactNode
}

export function GraphBackdrop({ dim = false, children }: Props) {
  const compact = useIsMobile()
  return (
    <div className="relative size-full overflow-hidden" style={{ background: T.canvas }}>
      <svg
        aria-hidden
        viewBox={compact ? '200 110 600 560' : '0 0 1000 660'}
        preserveAspectRatio={compact ? 'xMidYMin slice' : 'xMidYMid slice'}
        className="absolute inset-0 size-full scale-105 blur-[2px] saturate-50"
      >
        {NODES.map(([x, y]) => (
          <line key={`l${x}-${y}`} x1={CENTER.x} y1={CENTER.y} x2={x} y2={y} stroke={T.edge} strokeWidth={1.5} />
        ))}
        {NODES.map(([x, y, category]) => (
          <circle key={`n${x}-${y}`} cx={x} cy={y} r={11} fill={CATEGORY_COLORS[category]} />
        ))}
        <circle cx={CENTER.x} cy={CENTER.y} r={36} fill={T.primary} opacity={0.14} />
        <circle cx={CENTER.x} cy={CENTER.y} r={27} fill={T.primary} />
      </svg>
      <div aria-hidden className={cn('absolute inset-0', dim ? 'bg-foreground/15' : 'bg-background/30')} />
      {children}
    </div>
  )
}
