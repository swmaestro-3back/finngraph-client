import { ButtonLink } from '@/components/fg/Button'
import { ChangeText } from '@/components/fg/PriceChange'
import { StockWatchButton } from '@/components/fg/StockActions'
import type { StockCalendarRes } from '@/lib/apiTypes'
import { formatPriceWon, marketLabel } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import { fromState } from '@/lib/navigation'
import { formatMonthDay } from '@/lib/themeMetrics'

type HeaderStock = Pick<StockCalendarRes, 'ticker' | 'stockName' | 'market' | 'price' | 'change' | 'priceDate'>

export function EventDetailMeta({ stock, description }: { stock: HeaderStock; description: string }) {
  return (
    <span className="fg-cal-dkick">
      <span className="fg-num">{stock.ticker}</span>
      <span aria-hidden="true">·</span>
      <span>{marketLabel(stock.market)}</span>
      <span aria-hidden="true">·</span>
      <b>{description}</b>
    </span>
  )
}

interface EventDetailHeaderProps {
  stock: HeaderStock
  from: string
  onNavigate: () => void
}

export function EventDetailHeader({ stock, from, onNavigate }: EventDetailHeaderProps) {
  return (
    <div className="fg-cal-quote">
      <p className="fg-cal-quote__px fg-num">
        <span className="fg-cal-quote__now">{stock.price === null ? '—' : formatPriceWon(stock.price)}</span>
        {stock.change !== null && <ChangeText value={stock.change} className="fg-cal-quote__chg" />}
        {stock.priceDate && <span className="fg-cal-quote__basis">{formatMonthDay(stock.priceDate)} 기준</span>}
      </p>
      <div className="fg-cal-quote__acts">
        <ButtonLink to={stockPath(stock.ticker)} state={fromState(from)} onClick={onNavigate}>
          종목 상세 보기
        </ButtonLink>
        <StockWatchButton stock={{ ticker: stock.ticker, name: stock.stockName }} />
      </div>
    </div>
  )
}
