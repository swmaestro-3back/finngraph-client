export const MOTION_FAST_MS = 120
export const MOTION_BASE_MS = 200
export const MOTION_SLOW_MS = 320
export const MOTION_EASE = 'cubic-bezier(0.2, 0, 0, 1)'

export const ROUTE_ENTER: Keyframe[] = [
  { opacity: 0, transform: 'translateY(8px)' },
  { opacity: 1, transform: 'none' },
]

export const STAR_POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }]

export interface Span {
  left: number
  width: number
}

export function motionAllowed(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
}

export function spanTransform(span: Span): string {
  return `translateX(${span.left}px)`
}

export function slideFrom(prev: Span, next: Span): string {
  const scale = next.width > 0 ? prev.width / next.width : 1
  return `translateX(${prev.left}px) scaleX(${Number(scale.toFixed(4))})`
}

export function sameSpan(a: Span | null, b: Span): boolean {
  return a !== null && a.left === b.left && a.width === b.width
}

export function closesBelow<T>(order: readonly T[], closing: T, opening: T): boolean {
  const from = order.indexOf(closing)
  const to = order.indexOf(opening)
  return from >= 0 && to >= 0 && from > to
}
