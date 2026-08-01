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

// 스크린샷 실측 팔레트 (design-specs/stock-detail.md §0-4)
const TEAL = '#1F897D'
const GRAY = '#8B99AF'
const PURPLE = '#874EF5'
const LIGHT_PURPLE = '#A27EF9'
const PINK = '#F6657A'
const GRID = '#EAEEF4'
const GRID_EDGE = '#DEE5EE'

const data = annualFinancials.map((f) => ({
  ...f,
  yearLabel: f.estimated ? `${f.year}E` : String(f.year),
}))

const axisTick = { fontSize: 10, fill: '#7c828a', fontFamily: 'JetBrains Mono Variable, monospace' }

function ChartCard({
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
    <div className="rounded-3xl border border-[#dee5ee] bg-background p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold leading-[1.3] text-foreground">{title}</h3>
        <div className="flex items-center gap-[9px]">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-1 text-[11px] text-[#5b616e]">
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
        <div className="mb-1 flex items-center justify-between text-[10px] leading-none">
          <span style={{ color: axisCaptionLeft?.color ?? '#7c828a' }}>
            {axisCaptionLeft?.text}
          </span>
          <span style={{ color: axisCaptionRight?.color ?? '#7c828a' }}>
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
export function RevenueChart() {
  return (
    <ChartCard
      title="매출액 / 영업이익"
      legend={[
        { label: '매출액', color: TEAL },
        { label: '영업이익', color: GRAY },
      ]}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
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
      </ComposedChart>
    </ChartCard>
  )
}

/** 영업이익률 / ROE — dual line */
export function MarginRoeChart() {
  return (
    <ChartCard
      title="영업이익률 / ROE"
      legend={[
        { label: '영업이익률', color: TEAL },
        { label: 'ROE', color: GRAY },
      ]}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="yearLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID_EDGE }} interval={0} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={pctTick()} domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} width={44} />
        <Line isAnimationActive={false} type="monotone" dataKey="operatingMargin" stroke={TEAL} strokeWidth={2} dot={{ r: 3, fill: TEAL, strokeWidth: 0 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="roe" stroke={GRAY} strokeWidth={2} dot={{ r: 3, fill: GRAY, strokeWidth: 0 }} />
      </ComposedChart>
    </ChartCard>
  )
}

/** EPS / 배당금 / 배당성향 — 혼합 이중축 */
export function EpsDividendChart() {
  return (
    <ChartCard
      title="EPS / 배당금 / 배당성향"
      legend={[
        { label: 'EPS', color: TEAL },
        { label: '배당금', color: PURPLE },
        { label: '배당성향', color: LIGHT_PURPLE },
      ]}
      axisCaptionLeft={{ text: '원' }}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
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
      </ComposedChart>
    </ChartCard>
  )
}

/** PBR / PER — 이중축 + 기준선 */
export function PbrPerChart() {
  return (
    <ChartCard
      title="PBR / PER"
      legend={[
        { label: 'PBR', color: TEAL },
        { label: 'PER', color: GRAY },
      ]}
      axisCaptionLeft={{ text: 'PBR', color: TEAL }}
      axisCaptionRight={{ text: 'PER', color: GRAY }}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="yearLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID_EDGE }} interval={0} />
        <YAxis yAxisId="pbr" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(2)} domain={[0, 2.5]} ticks={[0, 0.5, 1, 1.5, 2, 2.5]} width={40}/>
        <YAxis yAxisId="per" orientation="right" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} domain={[0, 40]} ticks={[0, 10, 20, 30, 40]} width={40}/>
        <ReferenceLine yAxisId="pbr" y={1} stroke={TEAL} strokeDasharray="4 4" label={{ value: 'PBR=1', position: 'insideRight', fontSize: 9, fill: TEAL, dy: -8 }} />
        <ReferenceLine yAxisId="per" y={10} stroke={GRAY} strokeDasharray="4 4" label={{ value: 'PER=10', position: 'insideRight', fontSize: 9, fill: GRAY, dy: 10 }} />
        <Line isAnimationActive={false} yAxisId="pbr" type="monotone" dataKey="pbr" stroke={TEAL} strokeWidth={2} dot={{ r: 3, fill: TEAL, strokeWidth: 0 }} connectNulls={false} />
        <Line isAnimationActive={false} yAxisId="per" type="monotone" dataKey="per" stroke={GRAY} strokeWidth={2} dot={{ r: 3, fill: GRAY, strokeWidth: 0 }} connectNulls={false} />
      </ComposedChart>
    </ChartCard>
  )
}

/** 자본구조 (자본 + 부채) — stacked bar */
export function CapitalStructureChart() {
  return (
    <ChartCard
      title="자본구조 (자본 + 부채)"
      legend={[
        { label: '자본총계', color: TEAL },
        { label: '부채총계', color: PINK },
      ]}
    >
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="yearLabel" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID_EDGE }} interval={0} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={trillionTick} domain={[0, 600]} ticks={[0, 100, 200, 300, 400, 500, 600]} width={48} />
        <Bar isAnimationActive={false} dataKey="totalEquity" stackId="capital" barSize={14} fill={TEAL} />
        <Bar isAnimationActive={false} dataKey="totalDebt" stackId="capital" barSize={14} radius={[2, 2, 0, 0]} fill={PINK} />
      </ComposedChart>
    </ChartCard>
  )
}

/** 부채비율 — area + line */
export function DebtRatioChart() {
  return (
    <ChartCard title="부채비율" legend={[{ label: '부채비율', color: PINK }]}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
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
      </ComposedChart>
    </ChartCard>
  )
}
