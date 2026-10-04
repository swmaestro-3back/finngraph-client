import { Fragment, type ReactNode, type Ref } from 'react'
import { Badge } from '@/components/fg/Badge'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { SortButton } from '@/components/fg/DataTable'
import { GapValue } from '@/components/fg/Gap'
import { ChangeText } from '@/components/fg/PriceChange'
import { RowExpansion } from '@/components/fg/RowExpansion'
import { StatusTag } from '@/components/fg/StatusTag'
import type { StockRowRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import type { StockStatus } from '@/lib/fg/stockQuote'
import { columnSort, nextColumnSort, type QuoteOf, type StockColumn, type StockSort } from '@/lib/fg/stocks'
import { useRowFold } from '@/lib/fg/useRowFold'
import { gapFromHigh } from '@/lib/fg/week52'
import { useOverflowFade } from '@/lib/useOverflowFade'

interface StockTableProps {
  rows: readonly StockRowRes[]
  label: string
  sort: StockSort
  onSort: (sort: StockSort) => void
  quoteOf: QuoteOf | null
  selectedCode: string | null
  selectedStatus: StockStatus | null
  onSelect: (code: string) => void
  expanded: ReactNode
  selectedRef?: Ref<HTMLDivElement>
}

export function StockTable({
  rows,
  label,
  sort,
  onSort,
  quoteOf,
  selectedCode,
  selectedStatus,
  onSelect,
  expanded,
  selectedRef,
}: StockTableProps) {
  const { scrollRef, showFade, showLeftFade } = useOverflowFade<HTMLDivElement>([rows.length, quoteOf])
  const fade = showFade && showLeftFade ? 'both' : showFade ? 'end' : showLeftFade ? 'start' : undefined
  const gapCols = quoteOf ? undefined : 'true'
  const { hold, opened, closing } = useRowFold(
    rows.map((stock) => stock.ticker),
    selectedCode,
    expanded,
  )
  const pick = (code: string, el: HTMLElement) => {
    hold(code, el)
    onSelect(code)
  }
  const head = (column: StockColumn, text: string) => {
    const direction = columnSort(sort, column)
    return (
      <span role="columnheader" className="fg-trow__num" aria-sort={direction} data-col={column}>
        <SortButton sort={direction} onSort={() => onSort(nextColumnSort(sort, column))}>
          {text}
        </SortButton>
        {column === 'value' && !quoteOf && <span className="fg-trow__gap">준비 중</span>}
      </span>
    )
  }
  return (
    <div
      ref={scrollRef}
      className="fg-table-wrap fg-stable fg-reveal"
      role="region"
      aria-label={label}
      tabIndex={0}
      data-fade={fade}
    >
      <div className="fg-ttable fg-ttable--stock" role="table" data-gap-cols={gapCols} data-sort={sort}>
        <div className="fg-trow fg-trow--head fg-trow--stock" role="row">
          <span role="columnheader">종목</span>
          <span role="columnheader" className="fg-trow__num">
            현재가
          </span>
          {head('change', '등락률')}
          <span role="columnheader" className="fg-trow__num" data-col="high">
            최고가 대비
            {!quoteOf && <span className="fg-trow__gap">준비 중</span>}
          </span>
          {quoteOf ? (
            head('value', '거래대금')
          ) : (
            <span role="columnheader" className="fg-trow__num" data-col="value">
              거래대금
              <span className="fg-trow__gap">준비 중</span>
            </span>
          )}
          {head('cap', '시가총액')}
        </div>
        {rows.map((stock) => {
          const selected = stock.ticker === selectedCode
          const quote = quoteOf ? quoteOf(stock) : null
          const newHigh = quote !== null && stock.price !== null && stock.price >= quote.high52
          const folding = !selected && closing?.key === stock.ticker ? closing.node : null
          return (
            <Fragment key={stock.ticker}>
              <div
                ref={selected ? selectedRef : undefined}
                className="fg-trow fg-trow--stock"
                role="row"
                data-selected={selected ? 'true' : undefined}
              >
                <span role="cell">
                  <button
                    type="button"
                    className="fg-trow__pick fg-srow__pick"
                    aria-pressed={selected}
                    onClick={(e) => pick(stock.ticker, e.currentTarget)}
                  >
                    <CompanyLogo name={stock.name} />
                    <span className="fg-srow__id">
                      <span className="fg-srow__nm">
                        <b>{stock.name}</b>
                        {newHigh && <Badge tone="high">52주 신고가</Badge>}
                      </span>
                      <small className="fg-num">
                        {marketLabel(stock.market)} · {stock.ticker}
                      </small>
                    </span>
                  </button>
                </span>
                <span role="cell" className="fg-trow__num">
                  {stock.price === null ? '—' : formatPriceWon(stock.price)}
                </span>
                <span role="cell" className="fg-trow__num">
                  {selected && selectedStatus ? (
                    <StatusTag status={selectedStatus} />
                  ) : stock.change === null ? (
                    '—'
                  ) : (
                    <ChangeText value={stock.change} />
                  )}
                </span>
                <span
                  role="cell"
                  className="fg-trow__num fg-srow__sub"
                  data-col="high"
                  data-gap-cell={quoteOf ? undefined : 'true'}
                  title={quote ? `52주 최고 ${formatPriceWon(quote.high52)}` : undefined}
                >
                  <GapValue
                    gap="stock-quote-ext"
                    mock={quote && stock.price !== null ? formatGapPct(gapFromHigh(stock.price, quote.high52)) : null}
                  />
                </span>
                <span
                  role="cell"
                  className="fg-trow__num fg-srow__sub"
                  data-col="value"
                  data-gap-cell={quoteOf ? undefined : 'true'}
                >
                  <GapValue
                    gap="stock-quote-ext"
                    mock={quote && quote.tradingValue !== null ? formatCompactKrw(quote.tradingValue) : null}
                  />
                </span>
                <span role="cell" className="fg-trow__num fg-srow__sub">
                  {formatCompactKrw(stock.marketCap)}
                </span>
              </div>
              {selected && expanded && <RowExpansion opening={opened === stock.ticker}>{expanded}</RowExpansion>}
              {folding && <RowExpansion closing>{folding}</RowExpansion>}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
