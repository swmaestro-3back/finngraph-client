import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChipGroup } from '@/components/layout/ChipGroup'
import { StockLogo } from '@/components/stock/StockLogo'
import { ChangeStatusTag } from '@/components/theme/ChangeStatusTag'
import { LeaderReturnChart } from '@/components/theme/LeaderReturnChart'
import type { ThemeStockRes } from '@/lib/apiTypes'
import {
  changeColorClass,
  formatChangeOrDash,
  formatCompactKrw,
  formatPriceOrDash,
} from '@/lib/format'
import { DEFAULT_BAND, buildReturnChart } from '@/lib/leaderChart'
import { fromState } from '@/lib/navigation'
import { useCandles } from '@/lib/queries/useCandles'
import { changeStatusTag, marketCapLeaders } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

// 일봉을 한 번 받아 두고 칩에 따라 잘라 쓴다 — 1개월 ≈ 20거래일
const RANGES = [
  { key: '3M', label: '3개월', limit: 60 },
  { key: '6M', label: '6개월', limit: 120 },
  // 쌓인 일봉이 1년에 못 미치는 동안은 있는 만큼만 그린다
  { key: '1Y', label: '1년', limit: 245 },
] as const
type RangeKey = (typeof RANGES)[number]['key']

// 가장 긴 구간의 첫날에도 밴드가 나오도록 이동평균 창만큼 더 받는다
const CANDLE_LIMIT = Math.max(...RANGES.map((r) => r.limit)) + DEFAULT_BAND.window - 1

/** 비중 막대 — 선과 같은 색을 연한 채움 + 또렷한 테두리로 쓴다 (뉴스 "분석" 뱃지와 같은 틀) */
const BAR_CLASSES = [
  'border-series-1/60 bg-series-1/15',
  'border-series-2/60 bg-series-2/15',
  'border-series-3/60 bg-series-3/15',
]

interface LeaderStockCardProps {
  themeName: string
  stocks: ThemeStockRes[]
  /** 다른 카드 안에 넣을 때 — 카드 면을 빼고 윗선으로만 구분하며, 제목에서 테마명을 뺀다 */
  embedded?: boolean
}

export function LeaderStockCard({ themeName, stocks, embedded = false }: LeaderStockCardProps) {
  const { pathname, search } = useLocation()
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null)
  const [rangeKey, setRangeKey] = useState<RangeKey>('6M')

  const leaders = useMemo(() => marketCapLeaders(stocks), [stocks])
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1]

  const first = useCandles(leaders[0]?.stock.ticker ?? null, 'D', CANDLE_LIMIT)
  const second = useCandles(leaders[1]?.stock.ticker ?? null, 'D', CANDLE_LIMIT)
  const third = useCandles(leaders[2]?.stock.ticker ?? null, 'D', CANDLE_LIMIT)

  // 세 종목을 같은 세로축에 올려야 누가 더 올랐는지 선 높이로 비교된다
  const chart = useMemo(
    () => buildReturnChart([first.data, second.data, third.data], range.limit),
    [first.data, second.data, third.data, range.limit],
  )

  if (leaders.length === 0) return null

  const tickers = leaders.map((l) => l.stock.ticker)
  const groupLabel = leaders.length === 3 ? '3대장' : '대장주'
  // 행에 올려 둔 동안만 그 종목을 도드라지게 하고 나머지 선을 흐린다
  const emphasizedIndex = hoveredTicker === null ? -1 : tickers.indexOf(hoveredTicker)
  const candlesLoading = [first, second, third].some((c) => c.loading)

  return (
    <section className={embedded ? 'mt-4 border-t border-border pt-4' : 'mt-4 card-surface p-5'}>
      <div className="mb-[9px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-[9px]">
          <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
            {/* 종목이 셋이 안 되는 테마에서 "3대장"이라 부르지 않는다 */}
            {embedded ? groupLabel : `${themeName} ${groupLabel}`}
          </h2>
          <span className="text-caption text-muted-foreground">
            시가총액 상위 <span className="font-mono tabular-nums">{leaders.length}</span>종목
          </span>
        </div>
        <ChipGroup options={RANGES} value={rangeKey} onChange={setRangeKey} />
      </div>

      <div className="grid gap-x-5 gap-y-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ol className="flex flex-col gap-1" onMouseLeave={() => setHoveredTicker(null)}>
          {leaders.map(({ stock, share }, i) => {
            const tag = changeStatusTag(stock.changeStatus)
            return (
              <li
                key={stock.ticker}
                onMouseEnter={() => setHoveredTicker(stock.ticker)}
                className="group relative rounded-lg px-[9px] py-5 hover:bg-muted"
              >
                {/* 행 전체가 종목 상세로 가는 링크 — 올려 두는 동안 차트에서 그 종목 선을 도드라지게 한다 */}
                <Link
                  to={`/stock/${stock.ticker}`}
                  state={fromState(pathname + search)}
                  aria-label={`${stock.name} 종목 상세 보기`}
                  onFocus={() => setHoveredTicker(stock.ticker)}
                  onBlur={() => setHoveredTicker(null)}
                  className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
                />
                <div className="pointer-events-none relative flex items-center gap-[9px]">
                  <span className="w-3 shrink-0 text-center font-mono text-[13px] font-semibold text-foreground-tertiary">
                    {i + 1}
                  </span>
                  <StockLogo ticker={stock.ticker} size={28} reserveSpace />
                  {/* 폭이 모자라면 종목명을 자르기 전에 시장·상태 라벨부터 다음 줄로 넘겨 숨긴다 */}
                  <span className="flex h-6 min-w-0 flex-1 flex-wrap items-center gap-x-[9px] overflow-hidden">
                    <span className="max-w-full truncate text-[15px] leading-6 font-semibold text-foreground group-hover:underline">
                      {stock.name}
                    </span>
                    <span className="shrink-0 rounded bg-surface-inset px-1.5 py-0.5 text-micro leading-none tracking-[0.4px] text-muted-foreground">
                      {stock.market}
                    </span>
                    {tag && <ChangeStatusTag tag={tag} className="shrink-0" />}
                  </span>
                  <span className="shrink-0 font-mono text-[15px] font-medium text-foreground">
                    {formatPriceOrDash(stock.price)}
                  </span>
                  <span
                    className={cn(
                      'w-[62px] shrink-0 text-right font-mono text-[13px] font-medium',
                      stock.change === null
                        ? 'text-foreground-tertiary'
                        : changeColorClass(stock.change),
                    )}
                  >
                    {formatChangeOrDash(stock.change)}
                  </span>
                </div>
                <div className="pointer-events-none relative mt-3.5 flex items-baseline justify-between gap-3 pl-[21px] text-[13px] text-muted-foreground">
                  <span className="whitespace-nowrap">
                    시총{' '}
                    <span className="font-mono text-foreground-secondary">
                      {formatCompactKrw(stock.marketCap)}
                    </span>
                  </span>
                  {share !== null && (
                    <span className="whitespace-nowrap">
                      테마 내 비중{' '}
                      <span className="font-mono font-medium tabular-nums text-foreground-secondary">
                        {share.toFixed(1)}%
                      </span>
                    </span>
                  )}
                </div>
                {share !== null && (
                  <div
                    aria-hidden
                    className="pointer-events-none relative mt-3 ml-[21px] h-3 overflow-hidden rounded-[3px] bg-surface-inset"
                  >
                    {/* 막대 색이 차트에서 이 종목의 선 색이다 */}
                    <span
                      className={cn('block h-full rounded-[3px] border', BAR_CLASSES[i])}
                      style={{ width: `max(${share}%, 6px)` }}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        <LeaderReturnChart
          chart={chart}
          leaders={leaders}
          rangeLabel={range.label}
          groupLabel={groupLabel}
          emphasizedIndex={emphasizedIndex}
          candlesLoading={candlesLoading}
        />
      </div>
    </section>
  )
}
