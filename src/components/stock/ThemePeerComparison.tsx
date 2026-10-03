import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { InfoPopover } from '@/components/ui/info-popover'
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
  /** 도움말에 적는 '상위'의 뜻 */
  hint: string
}

const METRICS: MetricDef[] = [
  {
    key: 'marketCap',
    label: '시가총액',
    lowerIsBetter: false,
    format: formatCompactKrw,
    hint: '테마 안에서 덩치가 큰 편',
  },
  {
    key: 'per',
    label: 'PER',
    lowerIsBetter: true,
    format: (v) => `${v.toFixed(2)}배`,
    hint: '이익에 비해 주가가 싼 편',
  },
  {
    key: 'pbr',
    label: 'PBR',
    lowerIsBetter: true,
    format: (v) => v.toFixed(2),
    hint: '순자산에 비해 주가가 싼 편',
  },
  {
    key: 'roe',
    label: 'ROE',
    lowerIsBetter: false,
    format: (v) => `${v.toFixed(2)}%`,
    hint: '자본으로 이익을 잘 내는 편',
  },
]

/** 색 구간 — rangeZone과 같은 3등분. 대표 위치로 색을 뽑아 막대와 범례가 어긋나지 않게 한다 */
const ZONE_LEGEND = [
  { position: 1, name: '빨강', range: '상위 1/3', meaning: '동료 대부분보다 앞서요' },
  { position: 0.5, name: '파랑', range: '중간 1/3', meaning: '테마 안에서 보통 수준이에요' },
  { position: 0, name: '초록', range: '하위 1/3', meaning: '동료 대부분보다 뒤처져요' },
] as const

/** 테마 내 비교 읽는 법 — 점 위치, 색 구간, 지표마다 다른 '상위' 기준 */
function PeerRankHelp() {
  return (
    <InfoPopover title="테마 내 비교 읽는 법">
      <div className="flex flex-col gap-3 text-caption leading-relaxed text-foreground-secondary break-keep [text-wrap:pretty]">
        <p>
          점은 같은 테마 종목들 사이에서 이 종목의 순위 자리예요. 오른쪽 끝이 1위, 왼쪽 끝이 꼴찌,
          가운데 눈금이 중앙값이에요.
        </p>
        <ul className="flex flex-col gap-1">
          {ZONE_LEGEND.map((zone) => (
            <li key={zone.name} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  'size-2.5 shrink-0 rounded-full border-[1.5px]',
                  rangeZone(zone.position).stroke,
                  rangeZone(zone.position).fill,
                )}
              />
              <span className="w-24 shrink-0 font-medium text-foreground">
                {zone.name} · {zone.range}
              </span>
              <span>{zone.meaning}</span>
            </li>
          ))}
        </ul>
        <p className="text-foreground-tertiary">
          여기서 빨강은 주가 상승이 아니라 순위가 높다는 뜻이에요.
        </p>
        <div>
          <p className="mb-1 font-medium text-foreground">지표마다 '상위'의 기준이 달라요</p>
          <ul className="flex flex-col gap-0.5">
            {METRICS.map((metric) => (
              <li key={metric.key} className="flex gap-2">
                <span className="w-14 shrink-0 font-medium text-foreground">{metric.label}</span>
                <span>
                  {metric.lowerIsBetter ? '낮을수록' : '높을수록'} 상위 — {metric.hint}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-foreground-tertiary">
          노란 배지는 순위 / 비교 종목 수예요. 값이 없는 종목은 빠지므로 지표마다 비교 종목 수가
          다를 수 있어요.
        </p>
      </div>
    </InfoPopover>
  )
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

// 네 지표 행과 맨 아래 눈금이 열을 함께 쓰는 그리드(subgrid) — 배지 칸은 내용 폭(auto)이라
// 100종목 넘는 테마의 "128/150위"도 넘치지 않고, 가장 긴 배지에 맞춰 모든 행의 막대 폭이 같아진다.
// 좁은 화면은 라벨 칸과 간격을 줄여 가운데(값·중앙값) 줄에 자리를 더 준다
const TABLE_GRID =
  'grid grid-cols-[48px_1fr_auto] gap-x-2 sm:grid-cols-[56px_1fr_auto] sm:gap-x-3'
const ROW = 'col-span-3 grid grid-cols-subgrid items-center'

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
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-semibold text-foreground">테마 내 비교 · {themeName}</h2>
          <PeerRankHelp />
        </div>
        <span className="text-xs text-muted-foreground">동료 {peerCount}종목 기준</span>
      </div>
      {/* 옆 투자 지표 카드가 더 길면 남는 높이를 네 행이 똑같이 나눠 갖는다(1fr) — 카드 아래 빈 공간 방지 */}
      <div
        className={cn(TABLE_GRID, 'flex-1')}
        style={{ gridTemplateRows: `repeat(${rows.length}, 1fr) auto` }}
      >
        {rows.map((row) => (
          <div key={row.key} className={cn(ROW, 'border-b border-surface-inset py-2')}>
            <span className="text-xs font-medium text-foreground">{row.label}</span>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xs font-medium whitespace-nowrap text-foreground">
                  {row.myValue === null ? '—' : row.format(row.myValue)}
                </span>
                <span className="text-caption whitespace-nowrap text-muted-foreground">
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
                // 뉴스 "분석" 뱃지와 같은 틀(각진 아웃라인 + 연한 채움) — 막대의 빨강·파랑·초록과 겹치지 않는 노랑.
                // 높이는 왼쪽 값·막대 묶음(약 31px)보다 살짝 낮게
                <Badge
                  variant="outline"
                  className="h-7 w-full min-w-16 rounded-sm border-chart-5/70 bg-chart-5/14 px-1.5 font-mono text-xs font-semibold text-chart-5-ink sm:min-w-[72px] sm:px-2 sm:text-body"
                >
                  {row.rank}/{row.poolCount}위
                </Badge>
              )}
            </div>
          </div>
        ))}
        {/* 눈금 — 네 막대가 같은 축을 쓰므로 맨 아래에 한 번만 적는다 */}
        <div className={cn(ROW, 'pt-2 text-caption text-muted-foreground')}>
          <span />
          <div className="grid grid-cols-3">
            <span>하위</span>
            <span className="text-center">중앙</span>
            <span className="text-right">상위</span>
          </div>
          <span />
        </div>
      </div>
    </section>
  )
}
