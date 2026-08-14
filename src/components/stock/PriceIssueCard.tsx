import { memo, useMemo, useState } from 'react'
import { CandleChart } from '@/components/chart/CandleChart'
import { ChartCard } from '@/components/chart/ChartCard'
import { FilterChip } from '@/components/ui/filter-chip'
import { IssueLane } from '@/components/stock/IssueLane'
import type { Candle, CandlePeriod } from '@/data/candles'
import type { IssueDay } from '@/data/stockDetail'

// 주가 차트 + 이슈 레인 카드 — 두 레인이 같은 x축 위에서 같은 칸을 가리킨다.
//
// hover는 매 픽셀 갱신되는 상태라 페이지가 쥐면 수급·실적 차트까지 전부 리렌더된다.
// 커서 상태는 이 카드가 쥐고, 페이지에는 클릭 선택(selectedIndex)만 올린다.

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
  /** 이슈 뉴스 패널과 공유하는 클릭 선택 — 페이지가 쥔다 */
  selectedIndex: number | null
  onSelect: (index: number | null) => void
}

export const PriceIssueCard = memo(function PriceIssueCard({
  candles,
  issues,
  period,
  onPeriodChange,
  selectedIndex,
  onSelect,
}: PriceIssueCardProps) {
  // 기간이 바뀌면 부모가 key로 리마운트한다 — 지난 기간의 커서를 들고 갈 일이 없다
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // hover마다 리렌더되는 컴포넌트라 구간 요약은 candles가 바뀔 때만 한 번 훑는다
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
      title={`주가 ${chartLabel}`}
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
      {/* 이슈 레인 — 가격과 같은 x축 위에 놓여야 "이 날 왜 움직였는지"가 대조 없이 읽힌다 */}
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
