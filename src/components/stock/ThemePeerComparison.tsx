import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import type { StockDetailRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import { rangeZone, rankPosition } from '@/lib/rangeZone'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { cn } from '@/lib/utils'

type MetricKey = 'marketCap' | 'per' | 'pbr' | 'roe'

interface MetricDef {
  key: MetricKey
  label: string
  lowerIsBetter: boolean
  format: (v: number) => string
}

const METRICS: MetricDef[] = [
  { key: 'marketCap', label: '시가총액', lowerIsBetter: false, format: formatCompactKrw },
  { key: 'per', label: 'PER', lowerIsBetter: true, format: (v) => `${v.toFixed(2)}배` },
  { key: 'pbr', label: 'PBR', lowerIsBetter: true, format: (v) => v.toFixed(2) },
  { key: 'roe', label: 'ROE', lowerIsBetter: false, format: (v) => `${v.toFixed(2)}%` },
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

const ROW_GRID = 'grid grid-cols-[56px_1fr_64px] items-center gap-3'

/**
 * 꼴찌 ──┼──●── 1위 — 값 크기가 아니라 순위로 점을 놓는다.
 * 값 비례 막대는 동료 중 극단값 하나에 나머지가 전부 바닥에 붙고, 음수는 그릴 수도 없다.
 * 가운데 눈금이 중앙값 자리다(순위 축에서는 중앙값이 항상 한가운데).
 */
function RankTrack({ label, rank, total }: { label: string; rank: number | null; total: number }) {
  const position = rank === null ? null : rankPosition(rank, total)
  const zone = rangeZone(position ?? 0)
  const pct = (position ?? 0) * 100
  return (
    <div
      role="img"
      aria-label={rank === null ? `${label} 순위 없음` : `${label} ${total}종목 중 ${rank}위`}
      className="relative h-1.5 rounded-full bg-surface-inset"
    >
      {position !== null && (
        <div className={cn('h-full rounded-full', zone.fill)} style={{ width: `${pct}%` }} />
      )}
      <div className="absolute top-1/2 left-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/50" />
      {position !== null && (
        <div
          className={cn(
            'absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background',
            zone.dot,
          )}
          style={{ left: `${pct}%` }}
        />
      )}
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
  if (loading) return <div className="min-h-44 animate-pulse rounded bg-muted" />
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
      poolCount: pool.length,
      rank: myValue === null ? null : rankOf(myValue, pool, metric.lowerIsBetter),
    }
  })

  return (
    <section className="card-surface flex flex-col p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">테마 내 비교 · {themeName}</h2>
        <span className="text-xs text-muted-foreground">동료 {peerCount}종목 기준</span>
      </div>
      {/* 옆 투자 지표 카드가 더 길면 남는 높이를 네 행이 똑같이 나눠 갖는다 — 카드 아래 빈 공간 방지 */}
      <div className="flex flex-1 flex-col">
        {rows.map((row) => (
          <div key={row.key} className={cn(ROW_GRID, 'flex-1 border-b border-surface-inset py-2')}>
            <span className="text-xs font-medium text-foreground">{row.label}</span>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xs font-medium text-foreground">
                  {row.myValue === null ? '—' : row.format(row.myValue)}
                </span>
                <span className="text-caption text-muted-foreground">
                  중앙값{' '}
                  <span className="font-mono">
                    {row.medianValue === null ? '—' : row.format(row.medianValue)}
                  </span>
                </span>
              </div>
              {/* 52주 막대와 같은 3구간 색 — 순위 상위 1/3 빨강, 중간 파랑, 하위 1/3 초록 */}
              <RankTrack label={row.label} rank={row.rank} total={row.poolCount} />
            </div>
            <div className="text-right">
              {row.rank === null ? (
                <span className="font-mono text-xs text-muted-foreground">—</span>
              ) : (
                <Badge variant="secondary" className="font-mono text-body">
                  {row.rank}/{row.poolCount}위
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* 눈금 — 네 막대가 같은 축을 쓰므로 맨 아래에 한 번만 적는다 */}
      <div className={cn(ROW_GRID, 'pt-2 text-caption text-muted-foreground')}>
        <span />
        <div className="grid grid-cols-3">
          <span>하위</span>
          <span className="text-center">중앙</span>
          <span className="text-right">상위</span>
        </div>
        <span />
      </div>
      <p className="mt-1 text-caption text-foreground-tertiary">
        순위 기준 위치 · PER·PBR은 낮을수록 상위
      </p>
    </section>
  )
}
