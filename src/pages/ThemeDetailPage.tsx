import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { IssueNewsPanel } from '@/components/stock/IssueNewsPanel'
import { PriceIssueCard } from '@/components/stock/PriceIssueCard'
import { LeaderStockCard } from '@/components/theme/LeaderStockCard'
import { NewsSection } from '@/components/theme/NewsSection'
import { RelatedStocksTable } from '@/components/theme/RelatedStocksTable'
import { CANDLE_COUNTS, candleDates, generateCandles, type CandlePeriod } from '@/data/candles'
import { getThemeNews } from '@/data/news'
import { getThemeById, themes } from '@/data/themes'
import { getThemeDetailStocks } from '@/data/themeDetailStocks'
import { generateThemeIssueTimeline } from '@/data/themeIssues'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { fromState, useBackTarget } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const BASE_INDEX = 27691

export default function ThemeDetailPage() {
  const { themeId } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const theme = getThemeById(themeId ?? '') ?? themes[13]
  const back = useBackTarget({ to: '/', label: '테마 트리맵' })
  const [period, setPeriod] = useState<CandlePeriod>('D')
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(CANDLE_COUNTS.D - 1)

  const indexValue = useMemo(
    () => Math.round(BASE_INDEX * (1 + theme.change / 20)),
    [theme],
  )
  const candles = useMemo(
    () => generateCandles(theme.id, period, indexValue, theme.change * 1.5),
    [theme, period, indexValue],
  )
  const issues = useMemo(
    () => generateThemeIssueTimeline(theme, candleDates(period)),
    [theme, period],
  )
  const detailStocks = useMemo(() => getThemeDetailStocks(theme.id), [theme.id])
  const news = useMemo(() => getThemeNews(theme.id), [theme])

  useEffect(() => {
    setSelectedIndex(CANDLE_COUNTS[period] - 1)
  }, [period, theme.id])

  const clearSelection = useCallback(() => setSelectedIndex(null), [])

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex items-center gap-[9px]">
        <Link to={back.to} className="text-xs font-semibold leading-none text-primary">
          ← {back.label}
        </Link>
        <span className="text-caption text-foreground-tertiary">/</span>
        <span className="text-caption text-muted-foreground">테마 상세</span>
      </div>

      <div className="mb-3 flex items-baseline gap-[9px]">
        <h1 className="text-display font-normal leading-[1.1] tracking-[-0.8px] text-foreground">
          {theme.name}
        </h1>
        <span
          className={cn(
            'font-mono text-base font-medium tracking-[-0.5px]',
            changeColorClass(theme.change),
          )}
        >
          {formatChange(theme.change)}
        </span>
        <span className="font-mono text-lg font-medium text-foreground">
          {formatPrice(indexValue)}
        </span>
      </div>

      <p className="mb-4 max-w-[820px] text-body leading-[1.7] text-muted-foreground [text-wrap:pretty]">
        {theme.description}
      </p>

      <PriceIssueCard
        key={`${theme.id}-${period}`}
        title="테마 지수"
        candles={candles}
        issues={issues}
        period={period}
        onPeriodChange={setPeriod}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
      />

      <div className="mb-[9px] mt-7 flex items-center gap-2">
        <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
          이슈 타임라인
        </h2>
      </div>
      <IssueNewsPanel
        days={issues}
        selectedIndex={selectedIndex}
        onSelectNews={setOpenNewsId}
        onClearSelection={clearSelection}
        extra={
          selectedIndex !== null && issues[selectedIndex].reacted.length > 0 ? (
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
              <span className="mr-[3px] text-caption text-muted-foreground">반응 종목</span>
              {issues[selectedIndex].reacted.map((stock) => (
                <button
                  key={stock.code}
                  type="button"
                  onClick={() =>
                    navigate(`/stock/${stock.code}`, { state: fromState(pathname) })
                  }
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-inset"
                >
                  {stock.name}
                  <span className={cn('font-mono', changeColorClass(stock.change))}>
                    {formatChange(stock.change)}
                  </span>
                </button>
              ))}
            </div>
          ) : null
        }
      />

      <LeaderStockCard theme={theme} themeCandles={candles} period={period} />

      <RelatedStocksTable stocks={detailStocks} />

      <NewsSection
        title={`${theme.name} 관련 뉴스`}
        items={news}
        className="mt-4"
        onItemClick={(item) => setOpenNewsId(item.id)}
      />

      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
      />

      <p className="mt-5 text-caption text-muted-foreground">
        표시된 시세·차트·뉴스는 데모용 예시 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
