import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { SupplyPoint } from '@/data/stockDetail'
import { cn } from '@/lib/utils'

// 투자자별 수급 4카드 (design-specs/stock-detail.md §1-6)
const UP = '#cf202f'
const DOWN = '#0052ff'
const PRIMARY = '#0052ff'

const axisTick = { fontSize: 9, fill: '#7c828a', fontFamily: 'JetBrains Mono Variable, monospace' }

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
    <div className="pointer-events-none rounded-xl border border-border bg-background px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <div className="mb-0.5 font-mono text-[10px] text-muted-foreground">{label}</div>
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
    <div className="rounded-3xl border border-border bg-background p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
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

function netBarChart(points: SupplyPoint[], key: keyof SupplyPoint) {
  return (
    <ComposedChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="#eaeef4" strokeDasharray="3 3" />
      <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: '#dee5ee' }} interval={8} />
      <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}만`} width={38} />
      <Tooltip
        isAnimationActive={false}
        cursor={{ fill: 'rgba(10,11,13,0.04)' }}
        content={<SupplyTooltip kind="net" />}
      />
      <Bar isAnimationActive={false} dataKey={key} barSize={5}>
        {points.map((p, i) => (
          <Cell key={i} fill={(p[key] as number) >= 0 ? UP : DOWN} fillOpacity={0.85} />
        ))}
      </Bar>
    </ComposedChart>
  )
}

function cumulative(points: SupplyPoint[], key: keyof SupplyPoint): number {
  return points.reduce((sum, p) => sum + (p[key] as number), 0)
}

export function SupplyDemandCharts({ points }: { points: SupplyPoint[] }) {
  const latestRatio = points[points.length - 1].foreignRatio
  const nets: { title: string; key: keyof SupplyPoint }[] = [
    { title: '외국인 순매수량', key: 'foreignNet' },
    { title: '기관 순매수량', key: 'institutionNet' },
    { title: '연기금 순매수량', key: 'pensionNet' },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SupplyCard title="외국인 보유율" meta={`${latestRatio.toFixed(2)}%`}>
        <ComposedChart data={points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eaeef4" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: '#dee5ee' }} interval={8} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}%`} domain={['dataMin - 0.5', 'dataMax + 0.5']} width={44} />
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: '#a8acb3', strokeWidth: 1 }}
            content={<SupplyTooltip kind="ratio" />}
          />
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
            {netBarChart(points, key)}
          </SupplyCard>
        )
      })}
    </div>
  )
}
