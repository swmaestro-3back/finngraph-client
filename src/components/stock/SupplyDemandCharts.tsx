import { memo } from 'react'
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { SupplyPoint } from '@/lib/apiTypes'
import { DOWN, UP } from '@/lib/chartAxis'
import { SYNC_BY_INDEX, syncMarks, SyncPinHeader, useSyncedIndex, type SyncedIndex } from '@/lib/chartSync'
import { changeColorClass, formatChange } from '@/lib/format'
import { cn } from '@/lib/utils'

// 투자자별 수급 4카드 (design-specs/stock-detail.md §1-6)
const PRIMARY = 'var(--primary)'

const axisTick = { fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' }

// 4카드가 같은 거래일 축을 쓴다 — 한 곳을 짚으면 나머지도 같은 날을 가리킨다
const SYNC_ID = 'supply-demand'

/** 호버한 지점의 값을 앱 톤(둥근 테두리·mono 숫자·등락 색)으로 띄우는 recharts 커스텀 툴팁 */
interface SupplyTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string | number
  /** ratio = 보유율(%) / net = 순매수량(만주, 부호+색) */
  kind: 'ratio' | 'net'
}

function SupplyTooltip({ active, payload, label, kind }: SupplyTooltipProps) {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  const text = kind === 'ratio' ? `${value.toFixed(2)}%` : signedManju(value)
  return (
    <div className="pointer-events-none rounded-xl border border-border bg-background px-3 py-2 shadow-soft">
      <div className="mb-0.5 font-mono text-micro text-muted-foreground">{label}</div>
      <div
        className={cn(
          'font-mono text-xs font-medium',
          kind === 'ratio' ? 'text-foreground' : value >= 0 ? 'text-stock-up' : 'text-stock-down',
        )}
      >
        {text}
      </div>
    </div>
  )
}

function SupplyCard({
  title,
  meta,
  metaColorClass,
  children,
}: {
  title: string
  meta: React.ReactNode
  metaColorClass?: string
  children: React.ReactElement
}) {
  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-body font-semibold text-foreground">{title}</h3>
        <span className={cn('font-mono text-xs font-medium text-foreground', metaColorClass)}>
          {meta}
        </span>
      </div>
      <div className="h-[max(120px,10.417vw)]">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** 기간(20~250거래일)에 상관없이 X축 라벨을 8개 안팎만 찍는다 */
function xTickInterval(count: number): number {
  return Math.max(1, Math.round(count / 8))
}

/** 순매수량(만주) — 0도 '+'로 적는다 */
function signedManju(value: number): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toLocaleString('ko-KR')}만주`
}

/** 4카드가 공유하는 차트 props — 같은 거래일 축과 syncId를 써야 커서가 같은 칸을 가리킨다 */
function chartProps(sync: SyncedIndex, points: SupplyPoint[]) {
  return {
    data: points,
    margin: { top: 4, right: 4, left: 0, bottom: 0 },
    syncId: SYNC_ID,
    syncMethod: SYNC_BY_INDEX,
    onClick: sync.onChartClick,
  }
}

function netBarChart(points: SupplyPoint[], key: keyof SupplyPoint, sync: SyncedIndex) {
  const tickInterval = xTickInterval(points.length)
  return (
    <ComposedChart {...chartProps(sync, points)}>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
      <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={tickInterval} />
      <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}만`} width={38} />
      {syncMarks(sync, {
        kind: 'bar',
        xForIndex: (i) => points[i].label,
        content: <SupplyTooltip kind="net" />,
      })}
      <Bar isAnimationActive={false} dataKey={key} barSize={5}>
        {points.map((p, i) => (
          <Cell key={i} fill={((p[key] as number | null) ?? 0) >= 0 ? UP : DOWN} fillOpacity={0.85} />
        ))}
      </Bar>
    </ComposedChart>
  )
}

function cumulative(points: SupplyPoint[], key: keyof SupplyPoint): number {
  return points.reduce((sum, p) => sum + ((p[key] as number | null) ?? 0), 0)
}

// recharts 4카드는 페이지에서 가장 무거운 트리다 — points가 같으면 다시 그리지 않는다
export const SupplyDemandCharts = memo(function SupplyDemandCharts({
  points,
}: {
  points: SupplyPoint[]
}) {
  // 4카드가 하나의 거래일 축을 공유한다 — 한 곳을 짚으면 나머지도 같은 날을 가리킨다
  const sync = useSyncedIndex()
  const tickInterval = xTickInterval(points.length)
  const pinnedDay = sync.pinnedIndex === null ? null : points[sync.pinnedIndex].label
  // 보유율이 비어 있는 날(당일 미집계 등)은 건너뛰고 기간의 첫 값과 최신 값을 고른다
  const firstRatio = points.find((p) => p.foreignRatio !== null)?.foreignRatio ?? null
  const latestRatio = points.findLast((p) => p.foreignRatio !== null)?.foreignRatio ?? null
  // 기간 첫날 대비 증감 — 보유율끼리의 차이라 %가 아니라 %p
  const ratioChange = firstRatio === null || latestRatio === null ? null : latestRatio - firstRatio
  const nets: { title: string; key: keyof SupplyPoint }[] = [
    { title: '외국인 순매수량', key: 'foreignNet' },
    { title: '기관 순매수량', key: 'institutionNet' },
    { title: '개인 순매수량', key: 'individualNet' },
  ]

  return (
    <div>
      <SyncPinHeader
        hint="한 차트를 짚으면 네 지표가 같은 날을 가리킵니다. 누르면 그 날이 고정됩니다."
        pinnedLabel={pinnedDay}
        onClear={sync.clear}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SupplyCard
          title="외국인 보유율"
          meta={
            latestRatio === null ? (
              '—'
            ) : (
              <>
                {latestRatio.toFixed(2)}%
                {ratioChange !== null && (
                  <span className={cn('ml-1', changeColorClass(ratioChange))}>
                    ({formatChange(ratioChange)}p)
                  </span>
                )}
              </>
            )
          }
        >
          <ComposedChart {...chartProps(sync, points)}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
            {/* 순매수 막대 차트와 같은 band 스케일 — 네 차트의 커서가 같은 칸 중앙에 놓인다 */}
            <XAxis dataKey="label" scale="band" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={tickInterval} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}%`} domain={['dataMin - 0.5', 'dataMax + 0.5']} width={44} />
            {syncMarks(sync, {
              kind: 'line',
              xForIndex: (i) => points[i].label,
              content: <SupplyTooltip kind="ratio" />,
            })}
            <Line isAnimationActive={false} type="monotone" dataKey="foreignRatio" stroke={PRIMARY} strokeWidth={2} dot={false} />
          </ComposedChart>
        </SupplyCard>

        {nets.map(({ title, key }) => {
          const cum = cumulative(points, key)
          return (
            <SupplyCard
              key={key}
              title={title}
              meta={`누적 ${signedManju(cum)}`}
              metaColorClass={cum >= 0 ? 'text-stock-up' : 'text-stock-down'}
            >
              {netBarChart(points, key, sync)}
            </SupplyCard>
          )
        })}
      </div>
    </div>
  )
})
