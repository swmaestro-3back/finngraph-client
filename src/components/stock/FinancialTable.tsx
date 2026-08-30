import { memo, useMemo, useState } from 'react'
import { FilterChip } from '@/components/ui/filter-chip'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import type { AnnualFinancials } from '@/data/types'
import { formatMultiple, formatPercent, formatTrillion, formatWon } from '@/lib/format'
import { computeTrendTones, MIN_TREND_RUN } from '@/lib/trend'
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

const ROWS: RowDef[] = [
  { label: '매출액', value: (f) => formatTrillion(f.revenue), metric: (f) => f.revenue, direction: 'up-good' },
  { label: '영업이익', value: (f) => formatTrillion(f.operatingProfit), metric: (f) => f.operatingProfit, direction: 'up-good' },
  { label: '당기순이익', value: (f) => formatTrillion(f.netIncome), metric: (f) => f.netIncome, direction: 'up-good' },
  { label: '영업이익률', value: (f) => formatPercent(f.operatingMargin), metric: (f) => f.operatingMargin, direction: 'up-good' },
  { label: 'ROE', value: (f) => formatPercent(f.roe), metric: (f) => f.roe, direction: 'up-good' },
  { label: '부채비율', value: (f) => formatPercent(f.debtRatio), metric: (f) => f.debtRatio, direction: 'down-good' },
  { label: '자산총계', value: (f) => formatTrillion(f.totalAssets), metric: (f) => f.totalAssets, direction: 'up-good' },
  { label: '별도자산총계', value: (f) => formatTrillion(f.separateAssets), metric: (f) => f.separateAssets, direction: 'up-good' },
  { label: '자본총계', value: (f) => formatTrillion(f.totalEquity), metric: (f) => f.totalEquity, direction: 'up-good' },
  { label: '부채총계', value: (f) => formatTrillion(f.totalDebt), metric: (f) => f.totalDebt, direction: 'down-good' },
  { label: 'EPS', value: (f) => formatWon(f.eps), metric: (f) => f.eps, direction: 'up-good' },
  { label: 'PER', value: (f) => formatMultiple(f.per), metric: (f) => f.per, direction: 'down-good' },
  {
    label: 'PBR',
    value: (f) => (f.pbr === null ? '-' : f.pbr.toFixed(2)),
    metric: (f) => f.pbr,
    direction: 'down-good',
  },
  { label: '주당배당금', value: (f) => formatWon(f.dps), metric: (f) => f.dps, direction: 'up-good' },
]

type HighlightMode = 'none' | 'trend' | 'improving'

/** 선택된 버튼을 다시 누르면 'none'(표시 안 함)으로 돌아간다 */
const MODES: {
  key: Exclude<HighlightMode, 'none'>
  label: string
  legend: { swatchClass: string; text: string }[]
}[] = [
  {
    key: 'trend',
    label: '개선/악화',
    legend: [
      { swatchClass: 'bg-stock-up/25', text: `${MIN_TREND_RUN}회 연속 개선` },
      { swatchClass: 'bg-stock-down/25', text: `${MIN_TREND_RUN}회 연속 악화` },
    ],
  },
  {
    key: 'improving',
    label: '개선만',
    legend: [
      { swatchClass: 'bg-trend-positive/25', text: `${MIN_TREND_RUN}회 연속 개선` },
    ],
  },
]

/** 모드별 셀 색 — 배경은 opacity 10~12%로 연하게, 숫자에만 색 포인트 */
function toneClass(mode: HighlightMode, tone: TrendTone | null): string | undefined {
  if (mode === 'none' || tone === null) return undefined
  if (mode === 'improving') {
    return tone === 'improving' ? 'bg-trend-positive/12 text-trend-positive' : undefined
  }
  return tone === 'improving'
    ? 'bg-stock-up/10 text-stock-up'
    : 'bg-stock-down/10 text-stock-down'
}

export const FinancialTable = memo(function FinancialTable({ rows }: { rows: AnnualFinancials[] }) {
  const [mode, setMode] = useState<HighlightMode>('none')

  const gridCols = { gridTemplateColumns: `84px repeat(${rows.length}, minmax(44px, 1fr))` }
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

      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[1080px]">
          {/* 헤더 행 */}
          <div
            className="grid gap-1 rounded-t-lg border-b border-border bg-surface-inset px-1 py-2"
            style={gridCols}
          >
            <span className="pl-1 text-caption text-foreground-secondary">항목</span>
            {rows.map((f) => (
              <span
                key={f.year}
                className="flex items-center justify-end gap-1 pr-1 text-right font-mono text-caption font-medium text-foreground"
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
              className={cn(
                'grid items-center gap-1 rounded-md border-b border-secondary px-1 py-[7px] hover:bg-surface-inset',
                rowIndex % 2 === 0 && 'bg-muted',
              )}
              style={gridCols}
            >
              <span className="pl-1 text-caption font-semibold leading-[1.4] text-foreground">
                {row.label}
              </span>
              {rows.map((f, colIndex) => {
                const text = row.value(f)
                const highlighted = text !== '-' && row.highlight?.(f)
                const tone = toneClass(mode, trendTones[rowIndex][colIndex])
                return (
                  <span
                    key={f.year}
                    className={cn(
                      'rounded-[4px] py-[3px] pr-1 text-right font-mono text-caption font-medium leading-[1.4]',
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
    </div>
  )
})
