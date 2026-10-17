import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { ChangeText } from '@/components/fg/PriceChange'
import { PriceChart, type ChartMarker } from '@/components/fg/PriceChart'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { ThemeIndexRetry } from '@/components/fg/ThemeIndexRetry'
import { ThemeNewsList } from '@/components/fg/ThemeNewsList'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import type { ThemeIndexRes, ThemeRes } from '@/lib/apiTypes'
import { kstToday } from '@/lib/calendar'
import { formatGapPct } from '@/lib/fg/format'
import { monthDayLabel } from '@/lib/fg/themeCharts'
import { INDEX_FORMAT } from '@/lib/fg/priceChart'
import { newsDays, openNews } from '@/lib/fg/stockNews'
import { INDEX_CANDLE_LIMIT, formatIndexValue, streakLabel, week52Dates, week52Label } from '@/lib/fg/themeIndex'
import {
  defaultRange,
  guestStart,
  newsListView,
  toThemeNews,
  type NewsMarker,
  type NewsRange,
} from '@/lib/fg/themeNews'
import { useDelayed } from '@/lib/fg/useDelayed'
import { week52Position } from '@/lib/fg/week52'
import { useMemberGate } from '@/lib/memberGate'
import { themeCandleSource } from '@/lib/queries/useCandles'
import { useThemeCandles } from '@/lib/queries/useThemeCandles'
import { useThemeNews } from '@/lib/queries/useThemeNews'
import { cn } from '@/lib/utils'

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
  const [today] = useState(() => kstToday(new Date()))
  const [showMarkers, setShowMarkers] = useState(true)
  const [markerId, setMarkerId] = useState<string | null>(null)
  const [rangePick, setRangePick] = useState<NewsRange | null>(null)
  const [onlyAnalyzed, setOnlyAnalyzed] = useState(false)
  const [page, setPage] = useState(1)
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)
  const newsTrigger = useRef<HTMLElement | null>(null)
  const candleSource = useMemo(() => themeCandleSource(theme.id), [theme.id])

  const { refresh: refreshCandles } = candles
  useEffect(() => {
    if (refreshKey > 0) refreshCandles()
  }, [refreshKey, refreshCandles])

  const all = useMemo(() => candles.data ?? [], [candles.data])
  const tradingDays = useMemo(() => all.map((c) => c.date), [all])
  const items = useMemo(() => toThemeNews(news.data ?? [], tradingDays), [news.data, tradingDays])
  const openFrom = locked || pending ? guestStart(today) : null
  const refYear = Number(today.slice(0, 4))
  const days = useMemo(() => newsDays(openNews(items, openFrom), all), [items, openFrom, all])
  const markers = useMemo<ChartMarker[]>(
    () =>
      days.map((day) => ({
        key: day.tradeDay,
        index: day.index,
        stack: 0,
        title: `${monthDayLabel(day.tradeDay, refYear)} 뉴스 ${day.items.length}건`,
      })),
    [days, refYear],
  )
  const pickedDay = days.find((day) => day.tradeDay === markerId) ?? null
  const selected: NewsMarker | null = pickedDay && {
    id: pickedDay.tradeDay,
    label: monthDayLabel(pickedDay.tradeDay, refYear),
    items: pickedDay.items,
  }
  const range = rangePick ?? defaultRange(items, today)
  const view = newsListView({ items, selected, range, onlyAnalyzed, page, openFrom, today })
  const selectedCount = selected ? selected.items.filter((n) => openFrom === null || n.day >= openFrom).length : 0
  const chartWaiting = useDelayed(candles.loading && candles.data === null)
  const newsWaiting = useDelayed(news.loading && news.data === null)

  const pickMarker = (key: string) => {
    setMarkerId((current) => (current === key ? null : key))
    setPage(1)
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
  } else if (all.length < 2) {
    chart = <StateBlock kind="empty" title="테마 지수가 아직 없어요" description="지수가 쌓이면 여기에 보여 드려요" />
  } else {
    chart = (
      <PriceChart
        name={`${theme.name} 테마 지수`}
        source={candleSource}
        title={null}
        format={INDEX_FORMAT}
        candles={all}
        markers={markers}
        markerLabel="뉴스"
        showMarkers={showMarkers}
        onToggleMarkers={() => setShowMarkers((on) => !on)}
        selected={showMarkers ? markerId : null}
        onSelect={pickMarker}
        callout={null}
      />
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
        onOpenNews={(id) => {
          newsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          setOpenNewsId(id)
        }}
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
      </div>
      {indexFailed ? (
        <ThemeIndexRetry message="테마 지수 값을 불러오지 못했어요" onRetry={onRetryIndex} />
      ) : (
        index && <IndexHeadline index={index} candles={all} complete={candles.data !== null && all.length < INDEX_CANDLE_LIMIT} />
      )}
      {chart}
      {list}
      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
        returnFocusRef={newsTrigger}
      />
    </section>
  )
}
