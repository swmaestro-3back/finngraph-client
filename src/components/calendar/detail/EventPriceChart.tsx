import { useMemo } from 'react'
import { DetailSection, SectionNotice } from '@/components/calendar/detail/DetailParts'
import { CandleChart } from '@/components/chart/CandleChart'
import { toCandleView } from '@/lib/apiMappers'
import { CANDLE_COUNTS, type CalendarEventKind } from '@/lib/apiTypes'
import { KIND_LABELS, candleIndexOn, formatDayTitle } from '@/lib/calendar'
import { useCandles } from '@/lib/queries/useCandles'

interface EventPriceChartProps {
  ticker: string
  kind: CalendarEventKind
  date: string
  today: string
}

export function EventPriceChart({ ticker, kind, date, today }: EventPriceChartProps) {
  const { data, loading, error } = useCandles(ticker, 'D')
  const candles = useMemo(() => (data ?? []).map((candle) => toCandleView(candle, 'D')), [data])
  const selectedIndex = data ? candleIndexOn(data, date) : null
  const pending = loading || (data === null && error === null)
  const caption =
    selectedIndex !== null
      ? `세로선이 ${formatDayTitle(date)} ${KIND_LABELS[kind]} 캔들입니다.`
      : date > today
        ? '일정일이 아직 오지 않아 최근 일봉만 보여줍니다.'
        : `일정일의 일봉이 없습니다 — 휴장일이거나 최근 ${CANDLE_COUNTS.D}거래일 밖입니다.`

  return (
    <DetailSection id="event-chart-title" title="주가">
      {pending ? (
        <div className="h-[260px] animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : error ? (
        <SectionNotice>주가를 불러오지 못했습니다. 다른 정보는 그대로 볼 수 있습니다.</SectionNotice>
      ) : candles.length === 0 ? (
        <SectionNotice>일봉 기록이 없습니다.</SectionNotice>
      ) : (
        <>
          <CandleChart candles={candles} selectedIndex={selectedIndex} />
          <p className="mt-2 text-caption text-muted-foreground break-keep">{caption}</p>
        </>
      )}
    </DetailSection>
  )
}
