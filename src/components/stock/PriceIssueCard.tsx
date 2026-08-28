import { memo, useMemo, useState } from 'react'
import { CandleChart } from '@/components/chart/CandleChart'
import { ChartCard } from '@/components/chart/ChartCard'
import { FilterChip } from '@/components/ui/filter-chip'
import { IssueLane } from '@/components/stock/IssueLane'
import type { Candle, CandlePeriod } from '@/data/candles'
import type { IssueDay } from '@/data/stockDetail'


const PERIODS: { key: CandlePeriod; label: string; chartLabel: string }[] = [
  { key: 'D', label: '1일', chartLabel: '일봉' },
  { key: 'W', label: '1주', chartLabel: '주봉' },
  { key: 'M', label: '1달', chartLabel: '월봉' },
]

interface PriceIssueCardProps {
  candles: Candle[]
  issues: IssueDay[]
  period: CandlePeriod
  onPeriodChange: (period: CandlePeriod) => void
  selectedIndex: number | null
  onSelect: (index: number | null) => void
  title?: string
}

export const PriceIssueCard = memo(function PriceIssueCard({
  candles,
  issues,
  period,
  onPeriodChange,
  selectedIndex,
  onSelect,
  title = '주가',
}: PriceIssueCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const { rangeLow, rangeHigh, periodChange } = useMemo(() => {
    let low = Infinity
    let high = -Infinity
    for (const c of candles) {
      if (c.low < low) low = c.low
      if (c.high > high) high = c.high
    }
    const change =
      ((candles[candles.length - 1].close - candles[0].open) / candles[0].open) * 100
    return { rangeLow: low, rangeHigh: high, periodChange: change }
  }, [candles])
  const chartLabel = PERIODS.find((p) => p.key === period)?.chartLabel

  return (
    <ChartCard
      title={`${title} ${chartLabel}`}
      change={periodChange}
      rangeLow={rangeLow}
      rangeHigh={rangeHigh}
      actions={
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <FilterChip
              key={p.key}
              active={period === p.key}
              onClick={() => onPeriodChange(p.key)}
            >
              {p.label}
            </FilterChip>
          ))}
        </div>
      }
    >
      <CandleChart
        candles={candles}
        hoveredIndex={hoveredIndex}
        selectedIndex={selectedIndex}
        onHoverIndex={setHoveredIndex}
        onSelect={onSelect}
        showDates={false}
      />
      <div className="mt-3 border-t border-border pt-3">
        <IssueLane
          days={issues}
          hoveredIndex={hoveredIndex}
          selectedIndex={selectedIndex}
          onHover={setHoveredIndex}
          onSelect={onSelect}
        />
      </div>
    </ChartCard>
  )
})
