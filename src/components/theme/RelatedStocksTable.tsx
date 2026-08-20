import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SortableHeaderRow, type TableColumn } from '@/components/table/SortableHeaderRow'
import { StockIdentity } from '@/components/table/StockIdentity'
import { FilterChip } from '@/components/ui/filter-chip'
import type { Market } from '@/data/stockMeta'
import type { ThemeStock } from '@/data/types'
import { changeColorClass, formatAmount, formatChange, formatPrice } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { useTableSort } from '@/lib/useTableSort'
import { cn } from '@/lib/utils'

const VISIBLE_ROWS = 10
const GRID =
  'grid grid-cols-[minmax(210px,1.2fr)_110px_90px_130px_84px_minmax(200px,1.6fr)] items-center gap-3'

type SortKey = 'name' | 'price' | 'change' | 'tradingValue' | 'marketCap'

// key가 null인 컬럼(테마 포함 사유)은 정렬 대상이 아니라 라벨만 표시한다
const COLUMNS: TableColumn<SortKey>[] = [
  { key: 'name', label: '종목명', align: 'left', className: 'pl-[9px]' },
  { key: 'price', label: '현재가', align: 'right' },
  { key: 'change', label: '등락률', align: 'right' },
  { key: 'tradingValue', label: '거래대금 (백만)', align: 'right' },
  { key: 'marketCap', label: '시가총액 (억)', align: 'right' },
  { key: null, label: '테마 포함 사유', align: 'left', className: 'pl-3' },
]

// 아무것도 선택하지 않은 상태가 곧 전체
const MARKETS: Market[] = ['KOSPI', 'KOSDAQ']

interface RelatedStocksTableProps {
  stocks: ThemeStock[]
}

// 관련 종목 테이블 (design-specs/theme-detail.md §3)
export function RelatedStocksTable({ stocks }: RelatedStocksTableProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [selected, setSelected] = useState<Market | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const filtered = useMemo(
    () => (selected === null ? stocks : stocks.filter((s) => s.market === selected)),
    [stocks, selected],
  )

  // 한 번에 하나만 선택 — 켜져 있는 버튼을 다시 누르면 해제되고 전체가 된다
  const toggleMarket = (market: Market) => {
    setSelected((prev) => (prev === market ? null : market))
    setMoreOpen(false)
  }
  const { sorted, sortKey, sortDesc, handleSort } = useTableSort<ThemeStock, SortKey>(
    filtered,
    'change',
  )

  const visible = moreOpen ? sorted : sorted.slice(0, VISIBLE_ROWS)
  const hasMore = sorted.length > VISIBLE_ROWS

  return (
    <section className="mt-4 card-surface p-5">
      <div className="mb-[9px] flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium tracking-[-0.4px] text-foreground">관련 종목</h2>
        <div className="flex gap-1.5">
          {MARKETS.map((market) => (
            <FilterChip
              key={market}
              active={selected === market}
              onClick={() => toggleMarket(market)}
            >
              {market}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="min-w-[1010px]">
          <SortableHeaderRow
            columns={COLUMNS}
            sortKey={sortKey}
            sortDesc={sortDesc}
            onSort={handleSort}
            className={cn(GRID, 'rounded-lg bg-muted py-1.5 text-xs text-foreground-secondary')}
            cellClassName=""
            inactiveClassName=""
          />

          {visible.map((stock) => (
            <button
              key={stock.code}
              type="button"
              onClick={() => navigate(`/stock/${stock.code}`, { state: fromState(pathname) })}
              className={cn(
                GRID,
                'w-full cursor-pointer border-b border-surface-inset py-[9px] text-left hover:bg-muted',
              )}
            >
              <StockIdentity
                name={stock.name}
                code={stock.code}
                market={stock.market}
                className="pl-[9px]"
              />
              <span className="text-right font-mono text-body font-medium text-foreground">
                {formatPrice(stock.price)}
              </span>
              <span
                className={cn(
                  'text-right font-mono text-body font-medium',
                  changeColorClass(stock.change),
                )}
              >
                {formatChange(stock.change)}
              </span>
              <span className="text-right font-mono text-xs text-foreground-secondary">
                {formatAmount(stock.tradingValue)}
              </span>
              <span className="text-right font-mono text-xs text-foreground-secondary">
                {formatAmount(stock.marketCap)}
              </span>
              <span className="pl-3 text-xs leading-[1.55] text-foreground-secondary [text-wrap:pretty]">
                {stock.reason}
              </span>
            </button>
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="pt-[9px] text-center">
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className="inline-flex cursor-pointer items-center gap-0.5 text-xs font-semibold text-foreground-secondary"
          >
            {moreOpen ? '접기' : '더보기'}
            <ChevronDown className={cn('size-3.5 transition-transform', moreOpen && 'rotate-180')} />
          </button>
        </div>
      )}
    </section>
  )
}
