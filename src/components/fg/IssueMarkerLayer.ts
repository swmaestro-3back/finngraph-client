import type {
  IChartApiBase,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  PrimitiveHoveredItem,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts'

type DrawTarget = Parameters<IPrimitivePaneRenderer['draw']>[0]

export interface MarkerSpot {
  key: string
  time: string
  high: number
  stack: number
}

interface Point {
  key: string
  x: number
  y: number
}

interface MarkerColors {
  event: string
  surface: string
}

const HIT_RADIUS = 11
const LIFT = 12
const STACK_GAP = 16

export class IssueMarkerLayer implements ISeriesPrimitive<Time> {
  spots: readonly MarkerSpot[] = []
  selected: string | null = null
  hovered: string | null = null
  visible = true
  private chart: IChartApiBase<Time> | null = null
  private series: ISeriesApi<SeriesType, Time> | null = null
  private request: (() => void) | null = null
  private points: Point[] = []
  private readonly colors: MarkerColors
  private readonly views: readonly IPrimitivePaneView[]

  constructor(colors: MarkerColors) {
    this.colors = colors
    const renderer: IPrimitivePaneRenderer = {
      draw: (target) => this.paint(target, false),
      drawBackground: (target) => this.paint(target, true),
    }
    this.views = [{ zOrder: () => 'top', renderer: () => renderer }]
  }

  attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time, SeriesType>): void {
    this.chart = chart
    this.series = series
    this.request = requestUpdate
  }

  detached(): void {
    this.chart = null
    this.series = null
    this.request = null
  }

  set(patch: Partial<Pick<IssueMarkerLayer, 'spots' | 'selected' | 'hovered' | 'visible'>>): void {
    Object.assign(this, patch)
    this.request?.()
  }

  updateAllViews(): void {
    this.points = []
    const chart = this.chart
    const series = this.series
    if (!this.visible || !chart || !series) return
    const timeScale = chart.timeScale()
    for (const spot of this.spots) {
      const x = timeScale.timeToCoordinate(spot.time)
      const y = series.priceToCoordinate(spot.high)
      if (x === null || y === null) continue
      this.points.push({ key: spot.key, x, y: y - LIFT - spot.stack * STACK_GAP })
    }
    this.points.sort((a, b) => Number(a.key === this.selected) - Number(b.key === this.selected))
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return this.views
  }

  find(x: number, y: number): string | null {
    const hit = [...this.points].reverse().find((p) => Math.abs(x - p.x) + Math.abs(y - p.y) <= HIT_RADIUS)
    return hit?.key ?? null
  }

  hitTest(x: number, y: number): PrimitiveHoveredItem | null {
    const key = this.find(x, y)
    return key === null ? null : { cursorStyle: 'pointer', externalId: key, zOrder: 'top', itemType: 'marker' }
  }

  private paint(target: DrawTarget, background: boolean): void {
    const { event, surface } = this.colors
    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      for (const p of this.points) {
        const on = p.key === this.selected
        if (background) {
          if (!on) continue
          const x = Math.round(p.x) + 0.5
          context.save()
          context.strokeStyle = event
          context.lineWidth = 1
          context.setLineDash([2, 3])
          context.beginPath()
          context.moveTo(x, p.y + 10)
          context.lineTo(x, mediaSize.height)
          context.stroke()
          context.restore()
          continue
        }
        const r = on ? 7 : p.key === this.hovered ? 6 : 5
        context.beginPath()
        context.moveTo(p.x, p.y - r)
        context.lineTo(p.x + r, p.y)
        context.lineTo(p.x, p.y + r)
        context.lineTo(p.x - r, p.y)
        context.closePath()
        context.fillStyle = event
        context.fill()
        context.lineWidth = on ? 2 : 1.5
        context.strokeStyle = surface
        context.stroke()
      }
    })
  }
}
