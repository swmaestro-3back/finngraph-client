import type { MouseEvent } from 'react'
import {
  FINN_D,
  GRAPH_D,
  LOGO_ASPECT,
  LOGO_VIEW_BOX,
  SWOOSH_D,
  SWOOSH_NODE,
} from '@/components/brand/logoPaths'
import { cn } from '@/lib/utils'

type LogoTone = 'default' | 'onPrimary'

type LogoProps = {
  height?: number
  tone?: LogoTone
  animated?: boolean
  className?: string
}

type ToneColors = {
  finn: string
  finnOpacity: number
  graph: string
  curve: string
  node: string
}

const TONES: Record<LogoTone, ToneColors> = {
  default: {
    finn: 'currentColor',
    finnOpacity: 1,
    graph: 'var(--primary)',
    curve: 'var(--primary)',
    node: 'var(--stock-up)',
  },
  onPrimary: {
    finn: 'var(--primary-foreground)',
    finnOpacity: 0.7,
    graph: 'var(--primary-foreground)',
    curve: 'var(--primary-foreground)',
    node: 'var(--primary-foreground)',
  },
}

function replay(event: MouseEvent<SVGSVGElement>) {
  for (const animation of event.currentTarget.getAnimations({ subtree: true })) {
    animation.cancel()
    animation.play()
  }
}

export function Logo({ height = 24, tone = 'default', animated = true, className }: LogoProps) {
  const colors = TONES[tone]
  return (
    <svg
      viewBox={LOGO_VIEW_BOX}
      width={Math.round(height * LOGO_ASPECT)}
      height={height}
      role="img"
      aria-label="Finngraph"
      className={cn('block shrink-0', className)}
      onMouseEnter={animated ? replay : undefined}
    >
      <path d={FINN_D} style={{ fill: colors.finn, fillOpacity: colors.finnOpacity }} />
      <path d={GRAPH_D} style={{ fill: colors.graph }} />
      <path
        d={SWOOSH_D}
        fill="none"
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: colors.curve }}
        className={animated ? 'motion-safe:logo-curve' : undefined}
      />
      {animated && (
        <circle
          cx={SWOOSH_NODE.cx}
          cy={SWOOSH_NODE.cy}
          r={9}
          fill="none"
          strokeWidth={3}
          style={{ stroke: colors.node }}
          className="opacity-0 motion-safe:logo-ring"
        />
      )}
      <circle
        cx={SWOOSH_NODE.cx}
        cy={SWOOSH_NODE.cy}
        r={SWOOSH_NODE.r}
        style={{ fill: colors.node }}
        className={animated ? 'motion-safe:logo-node' : undefined}
      />
    </svg>
  )
}
