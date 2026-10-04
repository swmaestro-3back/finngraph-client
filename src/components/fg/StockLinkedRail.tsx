import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { MockBadge, NotReady } from '@/components/fg/Gap'
import { MemberGate } from '@/components/fg/MemberGate'
import { formatChange } from '@/lib/format'
import { formatGapPct, marketLabel, toneClass } from '@/lib/fg/format'
import { navState, STRENGTH_LABEL, stockTabSearch, type LinkedPreview } from '@/lib/fg/stockDetail'
import { josa } from '@/lib/josa'
import { useMemberGate } from '@/lib/memberGate'
import { cn } from '@/lib/utils'

interface StockLinkedRailProps {
  stockName: string
  preview: LinkedPreview | null
}

export function StockLinkedRail({ stockName, preview }: StockLinkedRailProps) {
  const { pathname, search, state } = useLocation()
  const { locked } = useMemberGate()
  const linksTab = { pathname, search: stockTabSearch(search, 'links') }
  return (
    <section className="fg-section fg-slr" aria-labelledby="fg-slr-title">
      <div className="fg-slr__head">
        <span className="fg-slr__title">
          <h2 id="fg-slr-title" className="fg-section__title">
            이런 기업은 어때요?
          </h2>
          <Badge tone="inferred">AI 추론</Badge>
          {preview && <MockBadge />}
        </span>
        <span className="fg-slr__cap">{`${stockName}${josa(stockName, '와/과')} 관계로 이어진 기업이에요`}</span>
      </div>
      {!preview ? (
        <NotReady gap="linked-companies" />
      ) : (
        <>
          {locked ? (
            <MemberGate subject={`이런 기업 ${preview.total}곳`} variant="compact" />
          ) : (
            <div className="fg-slr__rows">
              {preview.rows.map((row) => (
                <Link key={row.name} to={linksTab} state={navState(state)} replace className="fg-slr__row fg-num">
                  <span className="fg-slr__top">
                    <span className="fg-slr__id">
                      <CompanyLogo name={row.name} size={24} />
                      <span className="fg-slr__name">{row.name}</span>
                      <span className="fg-slr__mkt">{marketLabel(row.market)}</span>
                    </span>
                    <span className={cn('fg-slr__chg', toneClass(row.change))}>{formatChange(row.change)}</span>
                  </span>
                  <span className="fg-slr__rel">{row.relation(stockName)}</span>
                  <span className="fg-slr__foot">
                    <span>
                      52주 최고 대비 <b>{formatGapPct(row.gapFromHigh)}</b>
                    </span>
                    <span className="fg-strength">
                      근거 강도
                      {[1, 2, 3].map((bar) => (
                        <i key={bar} className={cn(bar <= row.strength && 'on')} aria-hidden="true" />
                      ))}
                      <b>{STRENGTH_LABEL[row.strength]}</b>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <ButtonLink to={linksTab} state={navState(state)} replace className="fg-slr__all">
            {`이어진 기업 ${preview.total}곳 모두 보기`}
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </ButtonLink>
        </>
      )}
    </section>
  )
}
