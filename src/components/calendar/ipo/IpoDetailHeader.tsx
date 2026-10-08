import { NoteBadge, Tag } from '@/components/calendar/detail/DetailParts'
import { ButtonLink } from '@/components/fg/Button'
import type { IpoDetailRes } from '@/lib/apiTypes'
import { IPO_STATUS_LABELS } from '@/lib/calendar'
import { stockPath } from '@/lib/fg/paths'
import { PLANNED_PRICE_HINT, ipoHeaderCountdown, ipoPriceBadge, ipoPriceText, listedTicker } from '@/lib/ipoDetail'
import { fromState } from '@/lib/navigation'

export function IpoDetailMeta({ detail }: { detail: Pick<IpoDetailRes, 'ticker' | 'spac' | 'status'> }) {
  return (
    <span className="fg-cal-dkick">
      {detail.spac && <Tag>스팩</Tag>}
      {detail.ticker && (
        <>
          <span className="fg-num">{detail.ticker}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span>공모주</span>
      <span aria-hidden="true">·</span>
      <b>{IPO_STATUS_LABELS[detail.status]}</b>
    </span>
  )
}

interface IpoDetailHeaderProps {
  detail: IpoDetailRes
  from: string
  today: string
  onNavigate: () => void
}

export function IpoDetailHeader({ detail, from, today, onNavigate }: IpoDetailHeaderProps) {
  const price = detail.offering.price
  const badge = ipoPriceBadge(price, detail.offering.priceBasis)
  const stockTicker = listedTicker(detail)
  const countdown = ipoHeaderCountdown(detail, today)

  return (
    <div className="fg-cal-quote">
      <div className="fg-cal-quote__main">
        <p className="fg-cal-quote__px fg-num">
          <span className="fg-cal-quote__term">공모가</span>
          <span className="fg-cal-quote__now">{ipoPriceText(price)}</span>
          {badge === '예정' && <NoteBadge>예정</NoteBadge>}
          {badge === '확정' && <Tag>확정</Tag>}
          {countdown && (
            <>
              <span aria-hidden="true" className="fg-cal-quote__sep" />
              <span className="fg-cal-quote__dday">{countdown}</span>
            </>
          )}
        </p>
        {badge === '예정' && <p className="fg-cal-quote__hint">{PLANNED_PRICE_HINT}</p>}
      </div>
      {stockTicker && (
        <div className="fg-cal-quote__acts">
          <ButtonLink to={stockPath(stockTicker)} state={fromState(from)} onClick={onNavigate}>
            종목 상세 보기
          </ButtonLink>
        </div>
      )}
    </div>
  )
}
