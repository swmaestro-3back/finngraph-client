import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChartColumn, ChevronUp, Newspaper, Table2, Users } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { AnnualCharts } from '@/components/stock/AnnualCharts'
import { FinancialTable } from '@/components/stock/FinancialTable'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { IssueNewsPanel } from '@/components/stock/IssueNewsPanel'
import { PriceIssueCard } from '@/components/stock/PriceIssueCard'
import { SupplyDemandCharts } from '@/components/stock/SupplyDemandCharts'
import { candleDates, generateCandles, type CandlePeriod } from '@/data/candles'
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
  // hover는 PriceIssueCard가 쥔다 — 페이지는 뉴스 패널과 공유하는 클릭 선택만 관리한다
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)

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
    () => generateIssueTimeline(stock.code, candleDates(period)),
    [stock.code, period],
  )

  // 기간을 바꾸면 인덱스의 의미가 달라진다 — 선택을 들고 가지 않는다
  useEffect(() => {
    setSelectedIndex(null)
  }, [period, stock.code])

  // memo된 자식들에게 내려가는 콜백 — 참조가 흔들리면 memo가 무력해진다
  const clearSelection = useCallback(() => setSelectedIndex(null), [])

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
      <div className="mb-3 flex flex-wrap items-baseline gap-[9px]">
        <h1 className="text-[32px] font-normal leading-[1.1] tracking-[-0.8px] text-foreground">
          {stock.name}
        </h1>
        <span className="font-mono text-[13px] text-muted-foreground">{stock.code}</span>
        <span className="font-mono text-[22px] font-medium tracking-[-0.5px] text-foreground">
          {formatPrice(stock.price)}
        </span>
        <span
          className={cn('font-mono text-base font-medium', changeColorClass(stock.change))}
        >
          {formatChange(stock.change)}
        </span>
      </div>

      {/* 요약 스탯 8타일 — 차트보다 먼저, 종목의 몸집을 먼저 읽고 움직임을 본다 */}
      <div className="mb-4 grid grid-cols-2 gap-[9px] md:grid-cols-4">
        {statTiles.map((tile) => (
          <div key={tile.label} className="rounded-xl bg-muted px-3 py-[9px]">
            <div className="text-[11px] text-muted-foreground">{tile.label}</div>
            <div className="font-mono text-sm font-medium leading-[1.3] text-foreground">
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {/* 주가 차트 카드 — 기간 전환은 카드 헤더 오른쪽에 붙는다.
          축이 바뀌면 key로 리마운트해 카드 내부의 hover·키보드 포커스가 함께 리셋된다 */}
      <PriceIssueCard
        key={`${stock.code}-${period}`}
        candles={candles}
        issues={issues}
        period={period}
        onPeriodChange={setPeriod}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
      />

      {/* 이슈 타임라인 */}
      <div className="mb-[9px] mt-7 flex items-center gap-2">
        <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">
          이슈 타임라인
        </h2>
        <Newspaper className="size-3.5 text-[#8b99af]" />
      </div>
      <IssueNewsPanel
        days={issues}
        selectedIndex={selectedIndex}
        onSelectNews={setOpenNewsId}
        onClearSelection={clearSelection}
      />

      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
      />

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
      {annualOpen && <AnnualCharts />}

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
