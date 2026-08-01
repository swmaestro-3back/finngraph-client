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
import { cn } from '@/lib/utils'

// 투자자별 수급 4카드 (design-specs/stock-detail.md §1-6)
const UP = '#cf202f'
const DOWN = '#0052ff'
const PRIMARY = '#0052ff'

const axisTick = { fontSize: 9, fill: '#7c828a', fontFamily: 'JetBrains Mono Variable, monospace' }

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
