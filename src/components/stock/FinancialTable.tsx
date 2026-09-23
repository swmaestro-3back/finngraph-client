import { memo, useLayoutEffect, useMemo, useState } from 'react'
import { FilterChip } from '@/components/ui/filter-chip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { fillYearsAnchoredRight } from '@/lib/annualPeriod'
import type { AnnualFinancials } from '@/lib/apiTypes'
import { formatMultiple, formatPercent, formatTrillion, formatWon } from '@/lib/format'
import { computeTrendTones, MIN_TREND_RUN } from '@/lib/trend'
import { useOverflowFade } from '@/lib/useOverflowFade'
import type { MetricDirection, TrendTone } from '@/lib/trend'
import { cn } from '@/lib/utils'

// 재무 지표 요약 테이블 (design-specs/stock-detail.md §3)
interface RowDef {
  label: string
  value: (f: AnnualFinancials) => string
  /** 추세 계산에 쓰는 원본 수치 */
  metric: (f: AnnualFinancials) => number | null
  /** 지표 성격 — 매출·이익처럼 오를수록 좋은 지표 / 부채비율·PER처럼 내릴수록 좋은 지표 */
  direction: MetricDirection
  highlight?: (f: AnnualFinancials) => boolean
}

/** 순이익률(%) — 원본 데이터에 없어 당기순이익/매출액으로 계산 */
function netMargin(f: AnnualFinancials): number | null {
  if (f.netIncome === null || f.revenue === null || f.revenue === 0) return null
  return (f.netIncome / f.revenue) * 100
}

const ROWS: RowDef[] = [
  { label: '매출액', value: (f) => formatTrillion(f.revenue), metric: (f) => f.revenue, direction: 'up-good' },
  { label: '영업이익', value: (f) => formatTrillion(f.operatingProfit), metric: (f) => f.operatingProfit, direction: 'up-good' },
  { label: '당기순이익', value: (f) => formatTrillion(f.netIncome), metric: (f) => f.netIncome, direction: 'up-good' },
  { label: '영업이익률', value: (f) => formatPercent(f.operatingMargin), metric: (f) => f.operatingMargin, direction: 'up-good' },
  { label: '순이익률', value: (f) => formatPercent(netMargin(f)), metric: (f) => netMargin(f), direction: 'up-good' },
  { label: 'PER', value: (f) => formatMultiple(f.per), metric: (f) => f.per, direction: 'down-good' },
  {
    label: 'PBR',
    value: (f) => (f.pbr === null ? '-' : f.pbr.toFixed(2)),
    metric: (f) => f.pbr,
    direction: 'down-good',
  },
  { label: 'ROE', value: (f) => formatPercent(f.roe), metric: (f) => f.roe, direction: 'up-good' },
  { label: 'EPS', value: (f) => formatWon(f.eps), metric: (f) => f.eps, direction: 'up-good' },
  { label: '자산총계', value: (f) => formatTrillion(f.totalAssets), metric: (f) => f.totalAssets, direction: 'up-good' },
  { label: '자본총계', value: (f) => formatTrillion(f.totalEquity), metric: (f) => f.totalEquity, direction: 'up-good' },
  { label: '부채총계', value: (f) => formatTrillion(f.totalDebt), metric: (f) => f.totalDebt, direction: 'down-good' },
  { label: '부채비율', value: (f) => formatPercent(f.debtRatio), metric: (f) => f.debtRatio, direction: 'down-good' },
]

type HighlightMode = 'none' | 'trend' | 'improving'

// 표는 차트의 기간 칩과 무관하게 마지막 데이터 연도를 오른쪽 끝에 두고 한 화면에 이만큼 보여준다.
// 그 이전 연도는 왼쪽으로 스크롤하면 이어진다. 늦게 상장한 종목은 앞쪽이 '-'로 채워져 열 수가 이 밑으로 줄지 않는다
const VISIBLE_YEARS = 12

// 항목 열은 스크롤 밖의 고정 패널 — 연도 패널과 행 높이를 같은 상수로 맞춰 줄이 어긋나지 않게 한다
const LABEL_COL_WIDTH = 84
const YEAR_COL_MIN_WIDTH = 64
const HEADER_ROW = 'h-9'
const BODY_ROW = 'h-9'

/** 선택된 버튼을 다시 누르면 'none'(표시 안 함)으로 돌아간다 */
// 덜 칠하는 쪽이 먼저 — '개선'만 보다가 한 단계 더 켜면 악화까지 보인다
const MODES: {
  key: Exclude<HighlightMode, 'none'>
  label: string
  legend: { swatchClass: string; text: string }[]
}[] = [
  {
    key: 'improving',
    label: '개선',
    legend: [
      { swatchClass: 'bg-trend-positive/25', text: `${MIN_TREND_RUN}회 연속 개선` },
    ],
  },
  {
    key: 'trend',
    label: '개선/악화',
    legend: [
      { swatchClass: 'bg-trend-positive/25', text: `${MIN_TREND_RUN}회 연속 개선` },
      { swatchClass: 'bg-trend-negative/25', text: `${MIN_TREND_RUN}회 연속 악화` },
    ],
  },
]

/** 모드별 셀 색 — 배경은 opacity 12%로 연하게, 숫자에만 색 포인트. 개선은 두 모드에서 같은 초록 */
function toneClass(mode: HighlightMode, tone: TrendTone | null): string | undefined {
  if (mode === 'none' || tone === null) return undefined
  if (tone === 'improving') return 'bg-trend-positive/12 text-trend-positive'
  return mode === 'trend' ? 'bg-trend-negative/12 text-trend-negative' : undefined
}

export const FinancialTable = memo(function FinancialTable({ rows: source }: { rows: AnnualFinancials[] }) {
  const [mode, setMode] = useState<HighlightMode>('none')
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const rows = useMemo(() => fillYearsAnchoredRight(source, VISIBLE_YEARS), [source])
  const { scrollRef, showFade, showLeftFade } = useOverflowFade<HTMLDivElement>([rows.length])

  // 처음엔 최신 연도가 보이도록 오른쪽 끝으로 — 넘치지 않으면 scrollLeft가 0으로 고정되니 무해하다
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [scrollRef, rows])

  // 100cqw = 연도 패널 폭(container-type: inline-size). 열 수와 무관하게 정확히 VISIBLE_YEARS개가 한 화면에 들어간다
  const yearCols = {
    gridTemplateColumns: `repeat(${rows.length}, max(${YEAR_COL_MIN_WIDTH}px, calc(100cqw / ${VISIBLE_YEARS})))`,
  }
  const trendTones = useMemo(
    () =>
      ROWS.map((row) =>
        computeTrendTones(
          rows.map((f) => row.metric(f)),
          row.direction,
        ),
      ),
    [rows],
  )

  /** 줄무늬·호버는 두 패널이 같은 규칙으로 칠해야 한 행으로 보인다 */
  const rowBg = (rowIndex: number) =>
    hoveredRow === rowIndex ? 'bg-surface-inset' : rowIndex % 2 === 0 ? 'bg-muted' : undefined

  return (
    <div className="card-surface px-5 pb-5 pt-3">
      {/* 색상 강조 옵션 */}
      <div
        role="group"
        aria-label="색상 강조 옵션"
        className="mb-2.5 flex flex-wrap items-center justify-end gap-1.5"
      >
        <span className="mr-[3px] text-caption whitespace-nowrap text-muted-foreground">
          색상 강조
        </span>
        {MODES.map((option) => (
          <HoverCard key={option.key} openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
              <FilterChip
                active={mode === option.key}
                // 선택된 버튼을 다시 누르면 해제
                onClick={() => setMode((prev) => (prev === option.key ? 'none' : option.key))}
              >
                {option.label}
              </FilterChip>
            </HoverCardTrigger>
            <HoverCardContent
              align="start"
              className="flex w-auto flex-col gap-1.5 whitespace-nowrap"
            >
              {option.legend.map((item) => (
                <span
                  key={item.text}
                  className="flex items-center gap-1.5 text-caption text-muted-foreground"
                >
                  <span className={cn('size-2.5 shrink-0 rounded-[3px]', item.swatchClass)} />
                  {item.text}
                </span>
              ))}
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>

      {/* 고정 열 + 스크롤 패널. 항목 열은 스크롤 컨테이너 밖이라 트랙패드 튕김에도 움직이지 않는다 */}
      <div className="flex overflow-hidden rounded-lg" onMouseLeave={() => setHoveredRow(null)}>
        {/* 항목 열 — 항상 같은 자리에 같은 경계선 */}
        <div className="shrink-0 border-r border-border" style={{ width: LABEL_COL_WIDTH }}>
          <div
            className={cn(
              HEADER_ROW,
              'flex items-center border-b border-border bg-surface-inset pl-2 text-caption text-foreground-secondary',
            )}
          >
            항목
          </div>
          {ROWS.map((row, rowIndex) => (
            <div
              key={row.label}
              onMouseEnter={() => setHoveredRow(rowIndex)}
              className={cn(
                BODY_ROW,
                'flex items-center border-b border-secondary pl-2 text-caption font-semibold text-foreground',
                rowBg(rowIndex),
              )}
            >
              {row.label}
            </div>
          ))}
        </div>

        {/* 연도 패널 */}
        <div className="relative min-w-0 flex-1">
          <div
            ref={scrollRef}
            className="overflow-x-auto overscroll-x-contain [container-type:inline-size] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="min-w-max">
              <div
                className={cn(HEADER_ROW, 'grid border-b border-border bg-surface-inset')}
                style={yearCols}
              >
                {rows.map((f) => (
                  <span
                    key={f.year}
                    className="flex items-center justify-end gap-1 pr-2 font-mono text-caption font-medium text-foreground"
                  >
                    {f.year}
                    {f.estimated && (
                      <span className="inline-flex size-[14px] items-center justify-center rounded-[4px] bg-accent-warm-bg text-[9px] font-semibold text-accent-warm">
                        E
                      </span>
                    )}
                  </span>
                ))}
              </div>

              {ROWS.map((row, rowIndex) => (
                <div
                  key={row.label}
                  onMouseEnter={() => setHoveredRow(rowIndex)}
                  className={cn(BODY_ROW, 'grid items-center border-b border-secondary', rowBg(rowIndex))}
                  style={yearCols}
                >
                  {rows.map((f, colIndex) => {
                    const text = row.value(f)
                    const highlighted = text !== '-' && row.highlight?.(f)
                    const tone = toneClass(mode, trendTones[rowIndex][colIndex])
                    return (
                      <span
                        key={f.year}
                        className={cn(
                          'mx-0.5 rounded-[4px] py-[3px] pr-1.5 text-right font-mono text-caption font-medium leading-[1.4]',
                          text === '-'
                            ? 'text-muted-foreground'
                            : highlighted
                              ? 'font-semibold text-accent-warm'
                              : 'text-foreground-numeric',
                          // 추세 톤이 있으면 배경 + 숫자 색을 덮어쓴다
                          tone && `${tone} font-semibold`,
                        )}
                      >
                        {text}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 스크롤바를 숨겼으니 페이드가 "더 있다"는 단서. 왼쪽은 경계선 바로 오른쪽에 그림자처럼 얹힌다 */}
          {showLeftFade && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-foreground/8 to-transparent"
            />
          )}
          {showFade && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent"
            />
          )}
        </div>
      </div>
    </div>
  )
})
