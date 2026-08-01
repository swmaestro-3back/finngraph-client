import { useMemo, useState } from 'react'
import { ChartColumn, ChevronUp, Newspaper, Table2, Users } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CandleChart } from '@/components/theme/CandleChart'
import {
  CapitalStructureChart,
  DebtRatioChart,
  EpsDividendChart,
  MarginRoeChart,
  PbrPerChart,
  RevenueChart,
} from '@/components/stock/AnnualCharts'
import { FinancialTable } from '@/components/stock/FinancialTable'
import { FilterChip } from '@/components/ui/filter-chip'
import { IssueTimeline } from '@/components/stock/IssueTimeline'
import { SupplyDemandCharts } from '@/components/stock/SupplyDemandCharts'
import { generateCandles, CANDLE_COUNTS, type CandlePeriod } from '@/data/candles'
import {
  DEFAULT_STOCK,
  generateIssueTimeline,
  generateSupplyDemand,
  getStatTiles,
} from '@/data/stockDetail'
import { themes } from '@/data/themes'
import { changeColorClass, formatChange, formatPrice } from '@/lib/format'
import { fromState, useBackTarget } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const PERIODS: { key: CandlePeriod; label: string; chartLabel: string }[] = [
  { key: 'D', label: '1일', chartLabel: '일봉' },
  { key: 'W', label: '1주', chartLabel: '주봉' },
  { key: 'M', label: '1달', chartLabel: '월봉' },
]

function findStock(code: string | undefined) {
  if (!code) return DEFAULT_STOCK
  for (const theme of themes) {
    const stock = theme.stocks.find((s) => s.code === code)
    if (stock) {
      return {
        name: stock.name,
        code: stock.code,
        price: stock.price,
        change: stock.change,
        themeId: theme.id,
        themeName: theme.name,
      }
    }
  }
  return DEFAULT_STOCK
}

export default function StockDetailPage() {
  const { stockCode } = useParams()
  const { pathname } = useLocation()
  const stock = useMemo(() => findStock(stockCode), [stockCode])
  // 진입 경로가 없으면(직접 URL 접근·새로고침) 해당 종목의 테마 상세로
  const back = useBackTarget({ to: `/theme/${stock.themeId}`, label: '테마 상세' })
  const [period, setPeriod] = useState<CandlePeriod>('D')
  const [annualOpen, setAnnualOpen] = useState(true)

  const candles = useMemo(
    () => generateCandles(`stock-${stock.code}`, period, stock.price, stock.change),
    [stock, period],
  )
  const supply = useMemo(() => generateSupplyDemand(stock.code), [stock.code])
  const statTiles = useMemo(
    () => getStatTiles(stock, supply[supply.length - 1].foreignRatio),
    [stock, supply],
  )
  const issues = useMemo(
    () => generateIssueTimeline(stock.code, CANDLE_COUNTS[period]),
    [stock.code, period],
  )

  const rangeLow = Math.min(...candles.map((c) => c.low))
  const rangeHigh = Math.max(...candles.map((c) => c.high))
  const periodChange =
    ((candles[candles.length - 1].close - candles[0].open) / candles[0].open) * 100
  const chartLabel = PERIODS.find((p) => p.key === period)?.chartLabel

  return (
    <div className="page-container pb-12 pt-7">
      {/* 브레드크럼 */}
      <div className="mb-3 flex items-center gap-[9px]">
        <Link to={back.to} className="text-xs font-semibold leading-none text-primary">
          ← {back.label}
        </Link>
        <span className="text-[11px] text-[#a8acb3]">/</span>
        <Link
          to={`/theme/${stock.themeId}`}
          state={fromState(pathname)}
          className="text-[11px] text-muted-foreground hover:text-primary hover:underline"
        >
          {stock.themeName}
        </Link>
      </div>

      {/* 종목 헤더 */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-[9px]">
          <h1 className="text-[32px] font-normal leading-[1.1] tracking-[-0.8px] text-foreground">
            {stock.name}
          </h1>
          <span className="font-mono text-[13px] text-muted-foreground">{stock.code}</span>
          <span className="font-mono text-[22px] font-medium tracking-[-0.5px] text-foreground">
            {formatPrice(stock.price)}
          </span>
          <span
            className={cn(
              'font-mono text-base font-medium',
              changeColorClass(stock.change),
            )}
          >
            {formatChange(stock.change)}
          </span>
        </div>
        <div className="flex gap-1.5">
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
      </div>

      {/* 주가 차트 카드 */}
      <section className="rounded-3xl border border-border bg-background p-5">
        <div className="mb-[9px] flex items-baseline gap-3">
          <h2 className="text-[13px] font-semibold text-foreground">주가 {chartLabel}</h2>
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

      {/* 요약 스탯 8타일 */}
      <div className="mt-4 grid grid-cols-2 gap-[9px] md:grid-cols-4">
        {statTiles.map((tile) => (
          <div key={tile.label} className="rounded-xl bg-muted px-3 py-[9px]">
            <div className="text-[11px] text-muted-foreground">{tile.label}</div>
            <div className="font-mono text-sm font-medium leading-[1.3] text-foreground">
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {/* 이슈 타임라인 */}
      <div className="mb-[9px] mt-7 flex items-center gap-2">
        <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
          이슈 타임라인
        </h2>
        <Newspaper className="size-3.5 text-[#8b99af]" />
      </div>
      <section className="rounded-3xl border border-border bg-background p-5">
        <IssueTimeline days={issues} />
      </section>

      {/* 투자자별 수급 */}
      <div className="mb-[9px] mt-7 flex items-center gap-2">
        <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
          투자자별 수급
        </h2>
        <Users className="size-3.5 text-[#8b99af]" />
      </div>
      <SupplyDemandCharts points={supply} />

      {/* 연간 실적 */}
      <div className="mb-[9px] mt-7 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">연간 실적</h2>
          <ChartColumn className="size-3.5 text-[#8b99af]" />
        </div>
        <button
          type="button"
          onClick={() => setAnnualOpen((open) => !open)}
          className="cursor-pointer text-muted-foreground"
          aria-label={annualOpen ? '연간 실적 접기' : '연간 실적 펼치기'}
        >
          <ChevronUp
            className={cn('size-4 transition-transform', !annualOpen && 'rotate-180')}
          />
        </button>
      </div>
      {annualOpen && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RevenueChart />
          <MarginRoeChart />
          <EpsDividendChart />
          <PbrPerChart />
          <CapitalStructureChart />
          <DebtRatioChart />
        </div>
      )}

      {/* 재무 지표 요약 */}
      <div className="mb-[9px] mt-7 flex items-center gap-2">
        <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
          재무 지표 요약
        </h2>
        <Table2 className="size-3.5 text-[#8b99af]" />
      </div>
      <FinancialTable />

      <p className="mt-5 text-[11px] text-muted-foreground">
        표시된 시세·재무·수급 데이터는 데모용 예시입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
