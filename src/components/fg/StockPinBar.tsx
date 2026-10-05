import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { StatusTag } from '@/components/fg/StatusTag'
import { StockTabs, type TabCounts } from '@/components/fg/StockTabs'
import type { StockDetailRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { formatPriceWon, toneClass } from '@/lib/fg/format'
import type { StockTab } from '@/lib/fg/stockDetail'
import type { StockStatus } from '@/lib/fg/stockQuote'

interface StockPinBarProps {
  stock: StockDetailRes
  on: boolean
  status: StockStatus | null
  tab: StockTab
  counts: TabCounts
}

export function StockPinBar({ stock, on, status, tab, counts }: StockPinBarProps) {
  return (
    <div className="fg-sdpin" data-on={on ? 'true' : 'false'}>
      <div className="fg-wrap fg-sdpin__in">
        <div className="fg-sdpin__id fg-num">
          <CompanyLogo name={stock.name} size={24} />
          <b>{stock.name}</b>
          {stock.price !== null && <span>{formatPriceWon(stock.price)}</span>}
          {status ? (
            <StatusTag status={status} />
          ) : (
            stock.change !== null && <span className={toneClass(stock.change)}>{formatChange(stock.change)}</span>
          )}
        </div>
        <StockTabs label="종목 보기(고정)" current={tab} counts={counts} />
      </div>
    </div>
  )
}
