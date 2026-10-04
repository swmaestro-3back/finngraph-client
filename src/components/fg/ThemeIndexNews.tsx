import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { ChangeText } from '@/components/fg/PriceChange'
import { Segment } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { ThemeIndexChart } from '@/components/fg/ThemeIndexChart'
import { ThemeIndexRetry } from '@/components/fg/ThemeIndexRetry'
import { ThemeNewsList } from '@/components/fg/ThemeNewsList'
import type { ThemeIndexRes, ThemeRes } from '@/lib/apiTypes'
import { kstToday } from '@/lib/calendar'
import { formatChange } from '@/lib/format'
import { formatGapPct } from '@/lib/fg/format'
import { monthDayLabel } from '@/lib/fg/themeCharts'
import {
  DEFAULT_INDEX_PERIOD,
  INDEX_CANDLE_LIMIT,
  INDEX_PERIODS,
  formatIndexValue,
  indexWindow,
  streakLabel,
  week52Dates,
  week52Label,
  windowMove,
  type IndexPeriod,
} from '@/lib/fg/themeIndex'
import {
  defaultRange,
  guestStart,
  nearestSlot,
  newsListView,
  newsMarkers,
  toThemeNews,
  type NewsMarker,
  type NewsRange,
} from '@/lib/fg/themeNews'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { week52Position } from '@/lib/fg/week52'
import { useMemberGate } from '@/lib/memberGate'
import { useThemeCandles } from '@/lib/queries/useThemeCandles'
import { useThemeNews } from '@/lib/queries/useThemeNews'
import { cn } from '@/lib/utils'

const TAP_RADIUS = 24
const NEAREST_TAP_QUERY = '(pointer: coarse), (max-width: 1023px)'

interface ThemeIndexNewsProps {
  theme: ThemeRes
  index: ThemeIndexRes | null
  indexFailed: boolean
  onRetryIndex: () => void
  refreshKey: number
  className?: string
}

function IndexHeadline({ index, candles, complete }: { index: ThemeIndexRes; candles: readonly { date: string; close: number }[]; complete: boolean }) {
  const dates = week52Dates(candles, index, complete)
  const label = week52Label(index, dates)
  const position = week52Position({ price: index.close, high: index.high52w, low: index.low52w })
  const streak = streakLabel(index.streak)
  return (
    <div className="fg-tix__head">
      <div className="fg-tix__now fg-num">
        <b>{formatIndexValue(index.close)}</b>
        {index.change !== null && <ChangeText value={index.change} className="fg-tix__chg" />}
        {streak && <Badge>{streak}</Badge>}
      </div>
      <div className="fg-tix__w52 fg-num" role="group" aria-label={label} title={label}>
        <span>
          52주 <b>{formatIndexValue(index.low52w)}</b> ~ <b>{formatIndexValue(index.high52w)}</b>
        </span>
        <span className="fg-tix__w52bar" aria-hidden="true">
          {position !== null && <span className="fg-tix__w52dot" style={{ left: `${(position * 100).toFixed(1)}%` }} />}
        </span>
        <span>
          최고 대비 <b>{index.fromHigh52w === null ? '—' : formatGapPct(index.fromHigh52w)}</b>
        </span>
      </div>
    </div>
  )
}

export function ThemeIndexNews({ theme, index, indexFailed, onRetryIndex, refreshKey, className }: ThemeIndexNewsProps) {
  const candles = useThemeCandles(theme.id, INDEX_CANDLE_LIMIT)
  const news = useThemeNews(theme.id)
  const { locked, pending, promptLogin } = useMemberGate()
  const tapNearest = useMediaQuery(NEAREST_TAP_QUERY)
  const [today] = useState(() => kstToday(new Date()))
  const [period, setPeriod] = useState<IndexPeriod>(DEFAULT_INDEX_PERIOD)
  const [markerId, setMarkerId] = useState<string | null>(null)
  const [rangePick, setRangePick] = useState<NewsRange | null>(null)
  const [onlyAnalyzed, setOnlyAnalyzed] = useState(false)
  const [page, setPage] = useState(1)
  const [areaWidth, setAreaWidth] = useState(0)

  const { refresh: refreshCandles } = candles
  useEffect(() => {
    if (refreshKey > 0) refreshCandles()
  }, [refreshKey, refreshCandles])

  const measureArea = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setAreaWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const all = useMemo(() => candles.data ?? [], [candles.data])
  const tradingDays = useMemo(() => all.map((c) => c.date), [all])
  const items = useMemo(() => toThemeNews(news.data ?? [], tradingDays), [news.data, tradingDays])
  const periodInfo = INDEX_PERIODS.find((p) => p.value === period) ?? INDEX_PERIODS[1]
  const span = useMemo(() => indexWindow(all, periodInfo.months), [all, periodInfo.months])
  const move = windowMove(span)
  const hasChart = span.length >= 2 && move !== null
  const openFrom = locked || pending ? guestStart(today) : null
  const refYear = Number(today.slice(0, 4))
  const xOf = useCallback(
    (i: number) => (span.length > 1 ? (i / (span.length - 1)) * areaWidth : 0),
    [span.length, areaWidth],
  )
  const markers = useMemo(
    () =>
      hasChart && areaWidth > 0
        ? newsMarkers(
            items,
            span.map((c) => c.date),
            xOf,
            openFrom,
            refYear,
          )
        : [],
    [hasChart, areaWidth, items, span, xOf, openFrom, refYear],
  )
  const selected = markers.find((m) => m.id === markerId && !m.locked) ?? null
  const range = rangePick ?? defaultRange(items, today)
  const view = newsListView({ items, selected, range, onlyAnalyzed, page, openFrom, today })
  const selectedCount = selected ? selected.items.filter((n) => openFrom === null || n.day >= openFrom).length : 0
  const chartWaiting = useDelayed(candles.loading && candles.data === null)
  const newsWaiting = useDelayed(news.loading && news.data === null)

  const pickPeriod = (next: IndexPeriod) => {
    setPeriod(next)
    setMarkerId(null)
    setPage(1)
  }
  const pickMarker = (marker: NewsMarker) => {
    setMarkerId((current) => (current === marker.id ? null : marker.id))
    setPage(1)
  }
  const tapPlot = (event: MouseEvent<HTMLDivElement>) => {
    if (!tapNearest) return
    if (event.target instanceof Element && event.target.closest('.fg-tix__mk')) return
    const x = event.clientX - event.currentTarget.getBoundingClientRect().left
    const marker = nearestSlot(markers, x, xOf, TAP_RADIUS)
    if (marker && !marker.locked) pickMarker(marker)
  }
  const pickRange = (next: NewsRange) => {
    setRangePick(next)
    setMarkerId(null)
    setPage(1)
  }
  const toggleAnalyzed = () => {
    setOnlyAnalyzed((on) => !on)
    setPage(1)
  }
  const clearSelected = () => {
    setMarkerId(null)
    setPage(1)
  }

  let chart: ReactNode
  if (candles.error && candles.data === null) {
    chart = (
      <StateBlock
        kind="error"
        title="테마 지수를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={candles.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (candles.data === null) {
    chart = (
      <div className="fg-tix__wait" aria-hidden="true">
        {chartWaiting && <Skeleton height="100%" />}
      </div>
    )
  } else if (!hasChart || move === null) {
    chart = <StateBlock kind="empty" title="테마 지수가 아직 없어요" description="지수가 쌓이면 여기에 보여 드려요" />
  } else {
    const first = span[0]
    const end = span[span.length - 1]
    const year = Number(end.date.slice(0, 4))
    chart = (
      <>
        <ThemeIndexChart
          candles={span}
          move={move}
          periodLabel={periodInfo.label}
          tickMode={period === '1m' ? 'days' : period === '1y' ? 'even-months' : 'months'}
          markers={markers}
          selected={selected}
          areaRef={measureArea}
          onPick={pickMarker}
          onPlotTap={tapPlot}
        />
        <div className="fg-tix__legend fg-num fg-reveal">
          <span>
            <i className="fg-tix__key" aria-hidden="true" />
            테마 종목 뉴스가 나온 날(휴장일이면 다음 거래일)
          </span>
          <span>
            {monthDayLabel(first.date, year)} ~ {monthDayLabel(end.date, year)} · {periodInfo.label} {formatChange(move)} · 지수 종가
          </span>
        </div>
      </>
    )
  }

  let list: ReactNode
  if (news.error && news.data === null) {
    list = (
      <StateBlock
        kind="error"
        title="뉴스를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={news.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (news.data === null) {
    list = (
      <div className="fg-tnw__wait" aria-hidden="true">
        {newsWaiting && (
          <>
            <Skeleton height={24} width={200} />
            <Skeleton height={32} width={320} shape="chip" />
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </>
        )}
      </div>
    )
  } else {
    list = (
      <ThemeNewsList
        view={view}
        range={range}
        onlyAnalyzed={onlyAnalyzed}
        selected={selected}
        selectedCount={selectedCount}
        onRange={pickRange}
        onToggleAnalyzed={toggleAnalyzed}
        onClearSelected={clearSelected}
        onMore={() => setPage((p) => p + 1)}
        onLogin={promptLogin}
      />
    )
  }

  return (
    <section className={cn('fg-section', className)} aria-labelledby="fg-tdp-ixnews" data-slot="theme-index-news">
      <div className="fg-section__head">
        <div className="fg-tdp__titles">
          <h2 id="fg-tdp-ixnews" className="fg-section__title">
            테마 지수와 뉴스
          </h2>
          <p className="fg-section__sub">지수 위 ◆를 누르면 그날 나온 뉴스만 보여 줘요</p>
        </div>
        <Segment label="지수 기간" options={INDEX_PERIODS} value={period} onChange={pickPeriod} />
      </div>
      {indexFailed ? (
        <ThemeIndexRetry message="테마 지수 값을 불러오지 못했어요" onRetry={onRetryIndex} />
      ) : (
        index && <IndexHeadline index={index} candles={all} complete={candles.data !== null && all.length < INDEX_CANDLE_LIMIT} />
      )}
      {chart}
      {list}
    </section>
  )
}
