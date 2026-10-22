// Lucian UX/UI Prompt #022 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#022
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

const STAR_PATH = 'M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9z'

const DOTS: readonly (readonly [number, string, string])[] = [
  [0, '#FF4D6D', '#FFB26B'],
  [51, '#8B6CFF', '#FF7A93'],
  [103, '#FFB547', '#22C3A6'],
  [154, '#FF4D6D', '#8B6CFF'],
  [206, '#22C3A6', '#FFB547'],
  [257, '#FF7A93', '#3D8BFF'],
  [309, '#3D8BFF', '#FF4D6D'],
]

interface BurstStarProps {
  on: boolean
  pop: boolean
  size?: number
  className?: string
}

export function BurstStar({ on, pop, size = 20, className }: BurstStarProps) {
  return (
    <span
      className={cn('fg-bstar', on && 'is-on', pop && 'is-pop', className)}
      style={{ '--bstar': `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      {pop && (
        <>
          <span className="fg-bstar__ring" />
          {DOTS.map(([angle, c, c2]) => (
            <span
              key={angle}
              className="fg-bstar__dot"
              style={{ '--a': `${angle}deg`, '--c': c, '--c2': c2 } as CSSProperties}
            >
              <i />
              <i />
            </span>
          ))}
        </>
      )}
      <svg viewBox="0 0 24 24" focusable="false">
        <path className="fg-bstar__f" d={STAR_PATH} />
        <path className="fg-bstar__o" d={STAR_PATH} />
      </svg>
    </span>
  )
}
