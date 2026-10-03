import { memo, useMemo, useState } from 'react'
import { CandleChart } from '@/components/chart/CandleChart'
import { ChartCard } from '@/components/chart/ChartCard'
import { ChipGroup } from '@/components/layout/ChipGroup'
import { IssueLane } from '@/components/stock/IssueLane'
import { CANDLE_PERIODS, type Candle, type CandlePeriod, type IssueDay } from '@/lib/apiTypes'
import { lockedIssueCount, useMemberGate } from '@/lib/memberGate'

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
  const { locked, promptLogin } = useMemberGate()
  const lockedUntil = lockedIssueCount(issues.length, locked)
  const selectOpen = (index: number | null) => {
    if (index !== null && index < lockedUntil) {
      promptLogin()
      return
    }
    onSelect(index)
  }

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
  const chartLabel = CANDLE_PERIODS.find((p) => p.key === period)?.chartLabel

  return (
    <ChartCard
      title={`${title} ${chartLabel}`}
      change={periodChange}
      rangeLow={rangeLow}
      rangeHigh={rangeHigh}
      actions={<ChipGroup options={CANDLE_PERIODS} value={period} onChange={onPeriodChange} />}
    >
      <CandleChart
        candles={candles}
        hoveredIndex={hoveredIndex}
        selectedIndex={selectedIndex}
        onHoverIndex={setHoveredIndex}
        onSelect={selectOpen}
        showDates={false}
      />
      <div className="mt-3 border-t border-border pt-3">
        <IssueLane
          days={issues}
          hoveredIndex={hoveredIndex}
          selectedIndex={selectedIndex}
          onHover={setHoveredIndex}
          onSelect={selectOpen}
        />
      </div>
    </ChartCard>
  )
})
