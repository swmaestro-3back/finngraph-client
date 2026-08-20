import { memo } from 'react'
import {
  Area,
  Bar,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { annualFinancials } from '@/data/financials'
import {
  syncMarks as sharedSyncMarks,
  SyncPinHeader,
  useSyncedIndex,
  type SyncedIndex,
} from '@/lib/chartSync'
import { formatMultiple, formatPercent, formatTrillion, formatWon } from '@/lib/format'

// 차트 계열색 — index.css의 --chart-* 토큰을 그대로 소비한다 (SVG 속성에서 var() 해석됨)
const TEAL = 'var(--chart-1)'
const GRAY = 'var(--chart-2)'
const PURPLE = 'var(--chart-3)'
const LIGHT_PURPLE = 'var(--chart-3-soft)'
const PINK = 'var(--chart-4)'
const GRID = 'var(--chart-grid)'
const GRID_EDGE = 'var(--border)'

const data = annualFinancials.map((f) => ({
  ...f,
  yearLabel: f.estimated ? `${f.year}E` : String(f.year),
}))

const axisTick = { fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono Variable, monospace' }

// 6개 카드가 같은 연도 축을 쓴다 — 한 곳을 짚으면 나머지도 같은 해를 가리킨다
const SYNC_ID = 'annual-financials'

/** 툴팁 한 줄의 이름과 단위 — dataKey가 곧 지표다 */
const METRICS: Record<string, { label: string; format: (v: number) => string }> = {
  revenue: { label: '매출액', format: formatTrillion },
  operatingProfit: { label: '영업이익', format: formatTrillion },
  operatingMargin: { label: '영업이익률', format: formatPercent },
  roe: { label: 'ROE', format: formatPercent },
  eps: { label: 'EPS', format: formatWon },
  dps: { label: '배당금', format: formatWon },
  payoutRatio: { label: '배당성향', format: formatPercent },
  pbr: { label: 'PBR', format: formatMultiple },
  per: { label: 'PER', format: formatMultiple },
  totalEquity: { label: '자본총계', format: formatTrillion },
  totalDebt: { label: '부채총계', format: formatTrillion },
  debtRatio: { label: '부채비율', format: formatPercent },
}

interface TooltipEntry {
  dataKey?: string | number
  value?: number | string | null
  color?: string
  fill?: string
  stroke?: string
}

/** 카드마다 자기 지표만 띄운다 — 여섯 카드가 같은 해를 가리키므로 한눈에 그 해 전체가 읽힌다 */
function AnnualTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
}) {
  const rows = (payload ?? []).filter(
    (p) => typeof p.value === 'number' && METRICS[String(p.dataKey)],
  )
  if (!active || rows.length === 0) return null

  return (
    <div className="pointer-events-none min-w-[148px] rounded-xl border border-border bg-background px-3 py-2 shadow-soft">
      <div className="mb-1 font-mono text-micro text-muted-foreground">{label}</div>
      {rows.map((p) => {
        const metric = METRICS[String(p.dataKey)]
        return (
          <div
            key={String(p.dataKey)}
            className="flex items-center justify-between gap-3 text-caption leading-[1.7]"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block size-1.5 rounded-[2px]"
                style={{ backgroundColor: p.fill ?? p.stroke ?? p.color }}
              />
              {metric.label}
            </span>
            <span className="font-mono font-medium text-foreground">
              {metric.format(p.value as number)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** 모든 카드가 공유하는 차트 props — 축이 같아야 동기화가 의미를 갖는다 */
function chartProps(sync: SyncedIndex) {
  return {
    data,
    margin: { top: 8, right: 8, left: 4, bottom: 0 },
    syncId: SYNC_ID,
    onClick: sync.onChartClick,
  }
}

/** 연간 축 전용 syncMarks — 툴팁 내용과 x 라벨만 이 파일 것으로 채운다 */
function syncMarks(sync: SyncedIndex, kind: 'bar' | 'line') {
  return sharedSyncMarks(sync, {
    kind,
    xForIndex: (i) => data[i].yearLabel,
    content: <AnnualTooltip />,
  })
}

function MetricCard({
  title,
  legend,
  axisCaptionLeft,
  axisCaptionRight,
  children,
}: {
  title: string
  legend: { label: string; color: string }[]
  axisCaptionLeft?: { text: string; color?: string }
  axisCaptionRight?: { text: string; color?: string }
  children: React.ReactElement
}) {
  return (
    <div className="card-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-body font-semibold leading-[1.3] text-foreground">{title}</h3>
        <div className="flex items-center gap-[9px]">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-1 text-caption text-foreground-secondary">
              <span
                className="inline-block size-2 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      {(axisCaptionLeft || axisCaptionRight) && (
        <div className="mb-1 flex items-center justify-between text-micro leading-none">
          <span style={{ color: axisCaptionLeft?.color ?? 'var(--muted-foreground)' }}>
            {axisCaptionLeft?.text}
          </span>
          <span style={{ color: axisCaptionRight?.color ?? 'var(--muted-foreground)' }}>
            {axisCaptionRight?.text}
          </span>
        </div>
      )}
      <div className="h-[max(170px,15.972vw)]">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const trillionTick = (v: number) => (v === 0 ? '0억' : `${v.toFixed(1)}조`)
const pctTick = (digits = 1) => (v: number) => `${v.toFixed(digits)}%`

/** 매출액 / 영업이익 — grouped bar */
function RevenueChart({ sync }: { sync: SyncedIndex }) {
  return (
    <MetricCard
      title="매출액 / 영업이익"
      legend={[
        { label: '매출액', color: TEAL },
        { label: '영업이익', color: GRAY },
      ]}
    >
      <ComposedChart {...chartProps(sync)}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="yearLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID_EDGE }} interval={0} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={trillionTick} domain={[0, 600]} ticks={[0, 100, 200, 300, 400, 500, 600]} width={48} />
        <Bar isAnimationActive={false} dataKey="revenue" barSize={9} radius={[2, 2, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.year} fill={TEAL} fillOpacity={d.estimated ? 0.45 : 1} />
          ))}
        </Bar>
        <Bar isAnimationActive={false} dataKey="operatingProfit" barSize={9} radius={[2, 2, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.year} fill={GRAY} fillOpacity={d.estimated ? 0.45 : 1} />
          ))}
        </Bar>
        {syncMarks(sync, 'bar')}
      </ComposedChart>
    </MetricCard>
  )
}

/** 영업이익률 / ROE — dual line */
function MarginRoeChart({ sync }: { sync: SyncedIndex }) {
  return (
    <MetricCard
      title="영업이익률 / ROE"
      legend={[
        { label: '영업이익률', color: TEAL },
        { label: 'ROE', color: GRAY },
      ]}
    >
      <ComposedChart {...chartProps(sync)}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="yearLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID_EDGE }} interval={0} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={pctTick()} domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} width={44} />
        <Line isAnimationActive={false} type="monotone" dataKey="operatingMargin" stroke={TEAL} strokeWidth={2} dot={{ r: 3, fill: TEAL, strokeWidth: 0 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="roe" stroke={GRAY} strokeWidth={2} dot={{ r: 3, fill: GRAY, strokeWidth: 0 }} />
        {syncMarks(sync, 'line')}
      </ComposedChart>
    </MetricCard>
  )
}

/** EPS / 배당금 / 배당성향 — 혼합 이중축 */
function EpsDividendChart({ sync }: { sync: SyncedIndex }) {
  return (
    <MetricCard
      title="EPS / 배당금 / 배당성향"
      legend={[
        { label: 'EPS', color: TEAL },
        { label: '배당금', color: PURPLE },
        { label: '배당성향', color: LIGHT_PURPLE },
      ]}
      axisCaptionLeft={{ text: '원' }}
    >
      <ComposedChart {...chartProps(sync)}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="yearLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID_EDGE }} interval={0} />
        <YAxis yAxisId="won" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString('ko-KR')} domain={[0, 50000]} ticks={[0, 10000, 20000, 30000, 40000, 50000]} width={52}/>
        <YAxis yAxisId="pct" orientation="right" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={pctTick(0)} domain={[0, 70]} ticks={[0, 10, 20, 30, 40, 50, 60, 70]} width={40} />
        <Bar isAnimationActive={false} yAxisId="won" dataKey="eps" barSize={7} radius={[2, 2, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.year} fill={TEAL} fillOpacity={d.estimated ? 0.45 : 1} />
          ))}
        </Bar>
        <Bar isAnimationActive={false} yAxisId="won" dataKey="dps" barSize={7} radius={[2, 2, 0, 0]} fill={PURPLE} />
        <Line isAnimationActive={false} yAxisId="pct" type="monotone" dataKey="payoutRatio" stroke={LIGHT_PURPLE} strokeWidth={2} dot={{ r: 3, fill: LIGHT_PURPLE, strokeWidth: 0 }} connectNulls={false} />
        {syncMarks(sync, 'bar')}
      </ComposedChart>
    </MetricCard>
  )
}

/** PBR / PER — 이중축 + 기준선 */
function PbrPerChart({ sync }: { sync: SyncedIndex }) {
  return (
    <MetricCard
      title="PBR / PER"
      legend={[
        { label: 'PBR', color: TEAL },
        { label: 'PER', color: GRAY },
      ]}
      axisCaptionLeft={{ text: 'PBR', color: TEAL }}
      axisCaptionRight={{ text: 'PER', color: GRAY }}
    >
      <ComposedChart {...chartProps(sync)}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="yearLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID_EDGE }} interval={0} />
        <YAxis yAxisId="pbr" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(2)} domain={[0, 2.5]} ticks={[0, 0.5, 1, 1.5, 2, 2.5]} width={40}/>
        <YAxis yAxisId="per" orientation="right" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} width={40}/>
        <ReferenceLine yAxisId="pbr" y={1} stroke={TEAL} strokeDasharray="4 4" label={{ value: 'PBR=1', position: 'insideRight', fontSize: 9, fill: TEAL, dy: -8 }} />
        <ReferenceLine yAxisId="per" y={10} stroke={GRAY} strokeDasharray="4 4" label={{ value: 'PER=10', position: 'insideRight', fontSize: 9, fill: GRAY, dy: 10 }} />
        <Line isAnimationActive={false} yAxisId="pbr" type="monotone" dataKey="pbr" stroke={TEAL} strokeWidth={2} dot={{ r: 3, fill: TEAL, strokeWidth: 0 }} connectNulls={false} />
        <Line isAnimationActive={false} yAxisId="per" type="monotone" dataKey="per" stroke={GRAY} strokeWidth={2} dot={{ r: 3, fill: GRAY, strokeWidth: 0 }} connectNulls={false} />
        {syncMarks(sync, 'line')}
      </ComposedChart>
    </MetricCard>
  )
}

/** 자본구조 (자본 + 부채) — stacked bar */
function CapitalStructureChart({ sync }: { sync: SyncedIndex }) {
  return (
    <MetricCard
      title="자본구조 (자본 + 부채)"
      legend={[
        { label: '자본총계', color: TEAL },
        { label: '부채총계', color: PINK },
      ]}
    >
      <ComposedChart {...chartProps(sync)}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="yearLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID_EDGE }} interval={0} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={trillionTick} domain={[0, 600]} ticks={[0, 100, 200, 300, 400, 500, 600]} width={48} />
        <Bar isAnimationActive={false} dataKey="totalEquity" stackId="capital" barSize={14} fill={TEAL} />
        <Bar isAnimationActive={false} dataKey="totalDebt" stackId="capital" barSize={14} radius={[2, 2, 0, 0]} fill={PINK} />
        {syncMarks(sync, 'bar')}
      </ComposedChart>
    </MetricCard>
  )
}

/** 부채비율 — area + line */
function DebtRatioChart({ sync }: { sync: SyncedIndex }) {
  return (
    <MetricCard title="부채비율" legend={[{ label: '부채비율', color: PINK }]}>
      <ComposedChart {...chartProps(sync)}>
        <defs>
          <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PINK} stopOpacity={0.18} />
            <stop offset="100%" stopColor={PINK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="yearLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID_EDGE }} interval={0} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={pctTick(0)} domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} width={40} />
        <Area isAnimationActive={false} type="monotone" dataKey="debtRatio" stroke="none" fill="url(#debtGradient)" connectNulls={false} />
        <Line isAnimationActive={false} type="monotone" dataKey="debtRatio" stroke={PINK} strokeWidth={2} dot={{ r: 3, fill: PINK, strokeWidth: 0 }} connectNulls={false} />
        {syncMarks(sync, 'line')}
      </ComposedChart>
    </MetricCard>
  )
}

/**
 * 연간 실적 6종 — 여섯 카드가 하나의 연도 축을 공유한다.
 * 한 카드를 짚으면 나머지도 같은 해를 가리키고, 누르면 그 해가 고정된다.
 */
export const AnnualCharts = memo(function AnnualCharts() {
  const sync = useSyncedIndex()
  const pinnedYear = sync.pinnedIndex === null ? null : data[sync.pinnedIndex].yearLabel

  return (
    <div>
      <SyncPinHeader
        hint="한 차트를 짚으면 여섯 지표가 같은 해를 가리킵니다. 누르면 그 해가 고정됩니다."
        pinnedLabel={pinnedYear}
        onClear={sync.clear}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart sync={sync} />
        <MarginRoeChart sync={sync} />
        <EpsDividendChart sync={sync} />
        <PbrPerChart sync={sync} />
        <CapitalStructureChart sync={sync} />
        <DebtRatioChart sync={sync} />
      </div>
    </div>
  )
})
