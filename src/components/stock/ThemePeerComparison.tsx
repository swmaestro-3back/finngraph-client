import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RailCard } from '@/components/stock/StockOverviewLayout'
import { Badge } from '@/components/ui/badge'
import type { StockDetailRes } from '@/lib/apiTypes'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { cn } from '@/lib/utils'

type MetricKey = 'per' | 'pbr' | 'roe' | 'dividendYield'

interface MetricDef {
  key: MetricKey
  label: string
  lowerIsBetter: boolean
  format: (v: number) => string
}

const METRICS: MetricDef[] = [
  { key: 'per', label: 'PER', lowerIsBetter: true, format: (v) => `${v.toFixed(2)}배` },
  { key: 'pbr', label: 'PBR', lowerIsBetter: true, format: (v) => v.toFixed(2) },
  { key: 'roe', label: 'ROE', lowerIsBetter: false, format: (v) => `${v.toFixed(2)}%` },
  { key: 'dividendYield', label: '배당률', lowerIsBetter: false, format: (v) => `${v.toFixed(2)}%` },
]

interface PeerRow extends MetricDef {
  myValue: number | null
  medianValue: number | null
  max: number
  poolCount: number
  rank: number | null
}

interface ThemePeers {
  loading: boolean
  themeName: string | null
  peerCount: number
  rows: PeerRow[]
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function rankOf(myValue: number, pool: number[], lowerIsBetter: boolean): number {
  return pool.filter((v) => (lowerIsBetter ? v < myValue : v > myValue)).length + 1
}

function barWidth(value: number | null, max: number): number {
  if (value === null || max <= 0) return 0
  return Math.max(0, Math.min(100, (value / max) * 100))
}

function useThemePeers(stock: StockDetailRes): ThemePeers {
  const { data, loading } = useStocksCached()
  const themeName = stock.themeName

  return useMemo(() => {
    if (!themeName || !data) return { loading, themeName, peerCount: 0, rows: [] }
    const themeStocks = data.filter((s) => s.themeName === themeName)
    const peers = themeStocks.filter((s) => s.ticker !== stock.ticker)
    const rows = METRICS.map((metric) => {
      const myValue = stock[metric.key]
      const peerValues = peers.map((s) => s[metric.key]).filter((v): v is number => v !== null)
      const pool = myValue === null ? peerValues : [...peerValues, myValue]
      return {
        ...metric,
        myValue,
        medianValue: median(pool),
        max: pool.length > 0 ? Math.max(...pool) : 0,
        poolCount: pool.length,
        rank: myValue === null ? null : rankOf(myValue, pool, metric.lowerIsBetter),
      }
    })
    return { loading, themeName, peerCount: peers.length, rows }
  }, [data, loading, stock, themeName])
}

function MetricBar({
  label,
  value,
  max,
  format,
  fillClass,
}: {
  label: string
  value: number | null
  max: number
  format: (v: number) => string
  fillClass: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-micro text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-inset">
        <div className={cn('h-full rounded-full', fillClass)} style={{ width: `${barWidth(value, max)}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-micro text-foreground">
        {value === null ? '—' : format(value)}
      </span>
    </div>
  )
}

function RankBadge({ rank, poolCount }: { rank: number | null; poolCount: number }) {
  if (rank === null) return <span className="font-mono text-caption text-muted-foreground">—</span>
  return (
    <Badge variant="secondary" className="font-mono">
      {rank}/{poolCount}위
    </Badge>
  )
}

export function ThemePeerComparison({ stock }: { stock: StockDetailRes }) {
  const { loading, themeName, peerCount, rows } = useThemePeers(stock)

  if (!themeName) return null
  if (loading && rows.length === 0) return <div className="h-44 animate-pulse rounded bg-muted" />
  if (peerCount < 2) return null

  return (
    <section className="card-surface p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-body font-semibold text-foreground">테마 내 비교 · {themeName}</h3>
        <span className="text-caption text-muted-foreground">동료 {peerCount}종목 기준</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[44px_1fr_64px] items-center gap-3 border-b border-surface-inset py-2 last:border-b-0 last:pb-0"
        >
          <span className="text-caption font-medium text-foreground">{row.label}</span>
          <div className="flex flex-col gap-1">
            <MetricBar label="내 값" value={row.myValue} max={row.max} format={row.format} fillClass="bg-primary/80" />
            <MetricBar
              label="중앙값"
              value={row.medianValue}
              max={row.max}
              format={row.format}
              fillClass="bg-muted-foreground/40"
            />
          </div>
          <div className="text-right">
            <RankBadge rank={row.rank} poolCount={row.poolCount} />
          </div>
        </div>
      ))}
    </section>
  )
}

export function ThemePeerRanks({ stock }: { stock: StockDetailRes }) {
  const { loading, themeName, peerCount, rows } = useThemePeers(stock)

  if (!themeName) return null
  if (loading && rows.length === 0) return <div className="h-36 animate-pulse rounded-xl bg-muted" />
  if (peerCount < 2) return null

  return (
    <RailCard
      title="테마 내 위치"
      aside={
        stock.themeId != null ? (
          <Link to={`/theme/${stock.themeId}`} className="hover:text-primary hover:underline">
            {themeName} · {peerCount + 1}종목
          </Link>
        ) : (
          `${themeName} · ${peerCount + 1}종목`
        )
      }
    >
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3 border-b border-surface-inset py-1.5 first:pt-0 last:border-b-0 last:pb-0"
          >
            <dt className="text-caption text-foreground">{row.label}</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-caption tabular-nums text-muted-foreground">
                {row.myValue === null ? '—' : row.format(row.myValue)}
              </span>
              <RankBadge rank={row.rank} poolCount={row.poolCount} />
            </dd>
          </div>
        ))}
      </dl>
    </RailCard>
  )
}
