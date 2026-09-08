import { useMemo } from 'react'
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
        <div
          className={cn('h-full rounded-full', fillClass)}
          style={{ width: `${barWidth(value, max)}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-micro text-foreground">
        {value === null ? '—' : format(value)}
      </span>
    </div>
  )
}

export function ThemePeerComparison({ stock }: { stock: StockDetailRes }) {
  const { data, loading } = useStocksCached()
  const themeName = stock.themeName

  const themeStocks = useMemo(
    () => (data && themeName ? data.filter((s) => s.themeName === themeName) : []),
    [data, themeName],
  )

  if (!themeName) return null
  if (loading) return <div className="mb-4 h-44 animate-pulse rounded bg-muted" />
  if (!data) return null

  const peerCount = themeStocks.filter((s) => s.ticker !== stock.ticker).length
  if (peerCount < 2) return null

  const rows = METRICS.map((metric) => {
    const myValue = stock[metric.key]
    // 목록 API의 내 종목 값은 상세 API와 어긋날 수 있으므로 빼고 상세 값(myValue)을 넣는다 — "6/5위" 모순 방지
    const peerValues = themeStocks
      .filter((s) => s.ticker !== stock.ticker)
      .map((s) => s[metric.key])
      .filter((v): v is number => v !== null)
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

  return (
    <section className="card-surface mb-4 p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-body font-semibold text-foreground">테마 내 비교 · {themeName}</h2>
        <span className="text-caption text-muted-foreground">동료 {peerCount}종목 기준</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[44px_1fr_64px] items-center gap-3 border-b border-surface-inset py-2 last:border-b-0 last:pb-0"
        >
          <span className="text-caption font-medium text-foreground">{row.label}</span>
          <div className="flex flex-col gap-1">
            <MetricBar
              label="내 값"
              value={row.myValue}
              max={row.max}
              format={row.format}
              fillClass="bg-primary/80"
            />
            <MetricBar
              label="중앙값"
              value={row.medianValue}
              max={row.max}
              format={row.format}
              fillClass="bg-muted-foreground/40"
            />
          </div>
          <div className="text-right">
            {row.rank === null ? (
              <span className="font-mono text-caption text-muted-foreground">—</span>
            ) : (
              <Badge variant="secondary" className="font-mono">
                {row.rank}/{row.poolCount}위
              </Badge>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
