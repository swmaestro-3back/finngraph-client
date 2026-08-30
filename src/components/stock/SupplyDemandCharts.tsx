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
import type { SupplyPoint } from '@/data/stockDetail'
import { DOWN, UP } from '@/lib/chartAxis'
import { syncMarks, SyncPinHeader, useSyncedIndex, type SyncedIndex } from '@/lib/chartSync'
import { cn } from '@/lib/utils'

// 투자자별 수급 4카드 (design-specs/stock-detail.md §1-6)
const PRIMARY = 'var(--primary)'

const axisTick = { fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono Variable, monospace' }

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
  const text =
    kind === 'ratio'
      ? `${value.toFixed(2)}%`
      : `${value >= 0 ? '+' : '−'}${Math.abs(value).toLocaleString('ko-KR')}만주`
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
  meta: string
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

function netBarChart(points: SupplyPoint[], key: keyof SupplyPoint, sync: SyncedIndex) {
  return (
    <ComposedChart
      data={points}
      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
      syncId={SYNC_ID}
      onClick={sync.onChartClick}
    >
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
      <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={8} />
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
  const pinnedDay = sync.pinnedIndex === null ? null : points[sync.pinnedIndex].label
  const latestRatio = [...points].reverse().find((p) => p.foreignRatio !== null)?.foreignRatio ?? null
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
        <SupplyCard title="외국인 보유율" meta={latestRatio === null ? '—' : `${latestRatio.toFixed(2)}%`}>
          <ComposedChart
            data={points}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            syncId={SYNC_ID}
            onClick={sync.onChartClick}
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={8} />
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
              meta={`누적 ${cum >= 0 ? '+' : '−'}${Math.abs(cum).toLocaleString('ko-KR')}만주`}
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
