import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CandleChart } from '@/components/chart/CandleChart'
import { NewsSection } from '@/components/theme/NewsSection'
import { RelatedStocksTable } from '@/components/theme/RelatedStocksTable'
import { FilterChip } from '@/components/ui/filter-chip'
import { generateCandles, type CandlePeriod } from '@/data/candles'
import { getThemeNews } from '@/data/news'
import { getThemeById, themes } from '@/data/themes'
import { getThemeDetailStocks } from '@/data/themeDetailStocks'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { useBackTarget } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const PERIODS: { key: CandlePeriod; label: string }[] = [
  { key: 'D', label: '일봉' },
  { key: 'W', label: '주봉' },
  { key: 'M', label: '월봉' },
]

// 테마 지수 기준값 (스펙 예시: 철강 27,691)
const BASE_INDEX = 27691

export default function ThemeDetailPage() {
  const { themeId } = useParams()
  const theme = getThemeById(themeId ?? '') ?? themes[13]
  // 진입 경로가 없으면(직접 URL 접근·새로고침) 테마 트리맵으로
  const back = useBackTarget({ to: '/', label: '테마 트리맵' })
  const [period, setPeriod] = useState<CandlePeriod>('D')

  const indexValue = useMemo(
    () => Math.round(BASE_INDEX * (1 + theme.change / 20)),
    [theme],
  )
  const candles = useMemo(
    () => generateCandles(theme.id, period, indexValue, theme.change * 1.5),
    [theme, period, indexValue],
  )
  const detailStocks = useMemo(() => getThemeDetailStocks(theme.id), [theme.id])
  const news = useMemo(
    () => getThemeNews(theme.id, theme.name, theme.stocks[0]?.name ?? ''),
    [theme],
  )

  const rangeLow = Math.min(...candles.map((c) => c.low))
  const rangeHigh = Math.max(...candles.map((c) => c.high))
  const periodChange =
    ((candles[candles.length - 1].close - candles[0].open) / candles[0].open) * 100
  const periodLabel = PERIODS.find((p) => p.key === period)?.label

  return (
    <div className="page-container pb-12 pt-7">
      {/* 브레드크럼 */}
      <div className="mb-3 flex items-center gap-[9px]">
        <Link to={back.to} className="text-xs font-semibold leading-none text-primary">
          ← {back.label}
        </Link>
        <span className="text-[11px] text-[#a8acb3]">/</span>
        <span className="text-[11px] text-muted-foreground">테마 상세</span>
      </div>

      {/* 타이틀 행 */}
      <div className="mb-3 flex items-baseline gap-[9px]">
        <h1 className="text-[32px] font-normal leading-[1.1] tracking-[-0.8px] text-foreground">
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

      {/* 테마 설명 */}
      <p className="mb-4 max-w-[820px] text-[13px] leading-[1.7] text-muted-foreground [text-wrap:pretty]">
        {theme.description}
      </p>

      {/* 차트 기간 전환 */}
      <div className="mb-3 flex justify-end gap-1.5">
        {PERIODS.map((p) => (
          <FilterChip
            key={p.key}
            active={period === p.key}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </FilterChip>
        ))}
      </div>

      {/* 테마 지수 차트 카드 */}
      <section className="rounded-3xl border border-border bg-background p-5">
        <div className="mb-[9px] flex items-baseline gap-3">
          <h2 className="text-[13px] font-semibold text-foreground">
            테마 지수 {periodLabel}
          </h2>
          <span
            className={cn(
              'font-mono text-[13px] font-medium',
              changeColorClass(periodChange),
            )}
          >
            {formatChange(periodChange)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            구간 {formatPrice(rangeLow)} ~ {formatPrice(rangeHigh)}
          </span>
        </div>
        <CandleChart candles={candles} />
      </section>

      {/* 관련 종목 */}
      <RelatedStocksTable stocks={detailStocks} />

      {/* 관련 뉴스 */}
      <NewsSection title={`${theme.name} 관련 뉴스`} items={news} className="mt-4" />

      <p className="mt-5 text-[11px] text-muted-foreground">
        표시된 시세·차트·뉴스는 데모용 예시 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
