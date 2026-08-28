import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SortableHeaderRow, type TableColumn } from '@/components/table/SortableHeaderRow'
import { StockIdentity } from '@/components/table/StockIdentity'
import { FilterChip } from '@/components/ui/filter-chip'
import type { ThemeStockRes } from '@/lib/apiTypes'
import {
  changeColorClass,
  formatAmountOrDash,
  formatChangeOrDash,
  formatPriceOrDash,
  toEok,
  toMillion,
} from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { useTableSort } from '@/lib/useTableSort'
import { cn } from '@/lib/utils'

const VISIBLE_ROWS = 10
const GRID =
  'grid grid-cols-[minmax(210px,1.2fr)_110px_90px_130px_84px_minmax(200px,1.6fr)] items-center gap-3'

type SortKey = 'name' | 'price' | 'change' | 'tradingValue' | 'marketCap'

const COLUMNS: TableColumn<SortKey>[] = [
  { key: 'name', label: '종목명', align: 'left', className: 'pl-[9px]' },
  { key: 'price', label: '현재가', align: 'right' },
  { key: 'change', label: '등락률', align: 'right' },
  { key: 'tradingValue', label: '거래대금 (백만)', align: 'right' },
  { key: 'marketCap', label: '시가총액 (억)', align: 'right' },
  { key: null, label: '테마 포함 사유', align: 'left', className: 'pl-3' },
]

const MARKETS = ['KOSPI', 'KOSDAQ'] as const
type MarketFilter = (typeof MARKETS)[number]

interface RelatedStocksTableProps {
  stocks: ThemeStockRes[]
}

export function RelatedStocksTable({ stocks }: RelatedStocksTableProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [selected, setSelected] = useState<MarketFilter | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const filtered = useMemo(
    () => (selected === null ? stocks : stocks.filter((s) => s.market === selected)),
    [stocks, selected],
  )

  const toggleMarket = (market: MarketFilter) => {
    setSelected((prev) => (prev === market ? null : market))
    setMoreOpen(false)
  }
  const { sorted, sortKey, sortDesc, handleSort } = useTableSort<ThemeStockRes, SortKey>(
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
              key={stock.ticker}
              type="button"
              onClick={() => navigate(`/stock/${stock.ticker}`, { state: fromState(pathname) })}
              className={cn(
                GRID,
                'w-full cursor-pointer border-b border-surface-inset py-[9px] text-left hover:bg-muted',
              )}
            >
              <StockIdentity
                name={stock.name}
                code={stock.ticker}
                market={stock.market === 'KOSDAQ' ? 'KOSDAQ' : 'KOSPI'}
                className="pl-[9px]"
              />
              <span className="text-right font-mono text-body font-medium text-foreground">
                {formatPriceOrDash(stock.price)}
              </span>
              <span
                className={cn(
                  'text-right font-mono text-body font-medium',
                  changeColorClass(stock.change ?? 0),
                )}
              >
                {formatChangeOrDash(stock.change)}
              </span>
              <span className="text-right font-mono text-xs text-foreground-secondary">
                {formatAmountOrDash(toMillion(stock.tradingValue))}
              </span>
              <span className="text-right font-mono text-xs text-foreground-secondary">
                {formatAmountOrDash(toEok(stock.marketCap))}
              </span>
              <span className="pl-3 text-xs leading-[1.55] text-foreground-secondary [text-wrap:pretty]">
                {stock.reason ?? '—'}
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
