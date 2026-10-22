import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { CALM_OUTLINE, CALM_PRIMARY } from '@/components/graph/glass'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface GuideHole {
  rect: DOMRect
  round?: boolean
  pulseAt?: { x: number; y: number }
}

export interface GuideSpot {
  holes: GuideHole[]
  avoid?: DOMRect[]
}

export interface GuideStep {
  title: string
  text: string
  locate: () => GuideSpot | null
  linkId?: () => string | null
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface Layout {
  w: number
  h: number
  holes: (Box & { round: boolean })[]
  pulses: { x: number; y: number }[]
  avoid: Box[]
}

interface Props {
  steps: GuideStep[]
  containerRef: RefObject<HTMLElement | null>
  isMobile: boolean
  onClose: () => void
  onStepChange?: (index: number | null) => void
}

const HOLE_PAD = 6
const EDGE = 12
const GAP = 16
const POP_WIDTH = 300
const REMEASURE_MS = [180, 700]

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function placePopover(layout: Layout, height: number): { left: number; top: number } {
  const anchor = layout.holes[0]
  const width = Math.min(POP_WIDTH, layout.w - EDGE * 2)
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), layout.w - width - EDGE)
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), layout.h - height - EDGE)
  const options = [
    { x: anchor.x + anchor.w + GAP, y: clampY(anchor.y - 8) },
    { x: anchor.x - width - GAP, y: clampY(anchor.y - 8) },
    { x: clampX(anchor.x + anchor.w / 2 - width / 2), y: anchor.y + anchor.h + GAP },
    { x: clampX(anchor.x + anchor.w / 2 - width / 2), y: anchor.y - height - GAP },
  ].map((o) => ({ ...o, w: width, h: height }))
  const inside = (o: Box) => o.x >= EDGE && o.x + o.w <= layout.w - EDGE && o.y >= EDGE && o.y + o.h <= layout.h - EDGE
  const blockers = [...layout.holes, ...layout.avoid]
  const best =
    options.find((o) => inside(o) && !blockers.some((b) => overlaps(o, b))) ??
    options.find((o) => inside(o) && !overlaps(o, anchor)) ??
    { ...options[0], x: clampX(options[0].x) }
  return { left: best.x, top: best.y }
}

export function GraphGuide({ steps, containerRef, isMobile, onClose, onStepChange }: Props) {
  const [index, setIndex] = useState(0)
  const [layout, setLayout] = useState<Layout | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const maskId = `fg-guide-${useId().replace(/[^\w-]/g, '')}`
  const step = steps[Math.min(index, steps.length - 1)]
  const last = index >= steps.length - 1

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container || !step) return
    const base = container.getBoundingClientRect()
    const spot = step.locate()
    if (!spot || spot.holes.length === 0) {
      setLayout(null)
      return
    }
    const local = (r: DOMRect): Box => ({
      x: r.left - base.left - HOLE_PAD,
      y: r.top - base.top - HOLE_PAD,
      w: r.width + HOLE_PAD * 2,
      h: r.height + HOLE_PAD * 2,
    })
    setLayout({
      w: base.width,
      h: base.height,
      holes: spot.holes.map((hole) => ({ ...local(hole.rect), round: hole.round ?? false })),
      pulses: spot.holes.flatMap((hole) =>
        hole.pulseAt ? [{ x: hole.pulseAt.x - base.left, y: hole.pulseAt.y - base.top }] : [],
      ),
      avoid: (spot.avoid ?? []).map(local),
    })
  }, [containerRef, step])

  useLayoutEffect(() => {
    measure()
    const timers = REMEASURE_MS.map((ms) => window.setTimeout(measure, ms))
    const container = containerRef.current
    const observer = container ? new ResizeObserver(measure) : null
    if (container) observer?.observe(container)
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      observer?.disconnect()
    }
  }, [measure, containerRef])

  useLayoutEffect(() => {
    if (isMobile || !layout || !popRef.current) return
    setPosition(placePopover(layout, popRef.current.offsetHeight))
  }, [isMobile, layout])

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true })
    onStepChange?.(index)
  }, [index, onStepChange])

  useEffect(() => () => onStepChange?.(null), [onStepChange])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!step) return null

  const body = (
    <>
      <p className="m-0 text-micro font-semibold tracking-[0.5px] text-primary">
        {index + 1} / {steps.length}
      </p>
      <p id={titleId} className="m-0 mt-1 text-[15px] leading-[22px] font-semibold text-foreground">
        {step.title}
      </p>
      <p className="m-0 mt-1 text-body leading-5 text-muted-foreground">{step.text}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div aria-hidden className="flex gap-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn('fg-gdot h-1.5 rounded-full', i === index ? 'w-4 bg-foreground' : 'w-1.5 bg-border')}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          {!last && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 rounded-full px-3 text-muted-foreground">
              건너뛰기
            </Button>
          )}
          {index > 0 && (
            <Button variant="outline" size="sm" className={CALM_OUTLINE} onClick={() => setIndex(index - 1)}>
              이전
            </Button>
          )}
          <Button ref={nextRef} size="sm" className={CALM_PRIMARY} onClick={() => (last ? onClose() : setIndex(index + 1))}>
            {last ? '시작하기' : '다음'}
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {layout && (
        <svg
          aria-hidden
          className="absolute inset-0 z-40 size-full animate-in fade-in-0 duration-200 motion-reduce:animate-none"
          viewBox={`0 0 ${layout.w} ${layout.h}`}
        >
          <defs>
            <mask id={maskId}>
              <rect width={layout.w} height={layout.h} fill="#fff" />
              {layout.holes.map((hole, i) => (
                <rect key={i} x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={hole.round ? hole.h / 2 : 12} fill="#000" />
              ))}
            </mask>
          </defs>
          <rect width={layout.w} height={layout.h} fill="rgb(15 18 24 / 0.5)" mask={`url(#${maskId})`} />
          {layout.holes.map((hole, i) => (
            <rect
              key={i}
              x={hole.x}
              y={hole.y}
              width={hole.w}
              height={hole.h}
              rx={hole.round ? hole.h / 2 : 12}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </svg>
      )}
      {layout?.pulses.map((point, i) => (
        <span
          key={i}
          aria-hidden
          className="fg-gping pointer-events-none absolute z-40 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{ left: point.x, top: point.y }}
        />
      ))}
      {isMobile ? (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="absolute inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-background px-4 pt-3 pb-4 shadow-[0_-12px_28px_-8px_rgb(0_0_0/0.25)] animate-in fade-in-0 slide-in-from-bottom-4 duration-200 motion-reduce:animate-none"
        >
          <span aria-hidden className="mx-auto mb-2.5 block h-1 w-9 rounded-full bg-border" />
          {body}
        </div>
      ) : (
        <div
          ref={popRef}
          role="dialog"
          aria-labelledby={titleId}
          className={cn(
            'fg-gcard absolute z-50 w-[min(300px,calc(100%-24px))] rounded-[22px] bg-background px-4.5 pt-4 pb-3.5 shadow-[0_0_0_1px_var(--border-divider),0_30px_60px_-30px_var(--shadow-strong-color)]',
            !layout && 'bottom-6 left-1/2 -translate-x-1/2',
            layout && !position && 'invisible',
          )}
          style={layout ? (position ?? { left: EDGE, top: EDGE }) : undefined}
        >
          {body}
        </div>
      )}
    </>
  )
}
