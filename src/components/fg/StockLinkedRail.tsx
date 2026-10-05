import { ChevronRight } from 'lucide-react'
import { Link, useLocation, type To } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { MemberGate } from '@/components/fg/MemberGate'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { formatChange } from '@/lib/format'
import { formatGapPct, marketLabel, toneClass } from '@/lib/fg/format'
import { linkedPreview } from '@/lib/fg/linkedCompanies'
import { navState, STRENGTH_LABEL, stockTabSearch } from '@/lib/fg/stockDetail'
import { hasQuote, type LinkedCompany } from '@/lib/fg/stockLinks'
import { josa } from '@/lib/josa'
import { useMemberGate } from '@/lib/memberGate'
import type { LinkedCompaniesState } from '@/lib/queries/useLinkedCompanies'
import { cn } from '@/lib/utils'

export function Week52GapText({ company }: { company: Pick<LinkedCompany, 'newHigh' | 'gapFromHigh'> }) {
  if (company.newHigh) {
    return (
      <span>
        52주 최고 <b>경신</b>
      </span>
    )
  }
  return (
    <span>
      52주 최고 대비 <b>{company.gapFromHigh === null ? '—' : formatGapPct(company.gapFromHigh)}</b>
    </span>
  )
}

interface LinkedRailRowProps {
  company: LinkedCompany
  to: To
  state?: unknown
  replace?: boolean
  footClassName?: string
}

export function LinkedRailRow({ company, to, state, replace, footClassName }: LinkedRailRowProps) {
  return (
    <Link to={to} state={state} replace={replace} className="fg-slr__row fg-num">
      <span className="fg-slr__top">
        <span className="fg-slr__id">
          <CompanyLogo name={company.name} size={24} />
          <span className="fg-slr__name">{company.name}</span>
          <span className="fg-slr__mkt">{marketLabel(company.market)}</span>
        </span>
        {company.change !== null && (
          <span className={cn('fg-slr__chg', toneClass(company.change))}>{formatChange(company.change)}</span>
        )}
      </span>
      <span className="fg-slr__rel">{company.relation}</span>
      <span className={cn('fg-slr__foot', footClassName)}>
        {hasQuote(company) ? <Week52GapText company={company} /> : <span />}
        <span className="fg-strength">
          근거 강도
          {[1, 2, 3].map((bar) => (
            <i key={bar} className={cn(bar <= company.strength && 'on')} aria-hidden="true" />
          ))}
          <b>{STRENGTH_LABEL[company.strength]}</b>
        </span>
      </span>
    </Link>
  )
}

interface StockLinkedRailProps {
  stockName: string
  linked: LinkedCompaniesState
}

export function StockLinkedRail({ stockName, linked }: StockLinkedRailProps) {
  const { pathname, search, state } = useLocation()
  const { locked, pending } = useMemberGate()
  const linksTab = { pathname, search: stockTabSearch(search, 'links') }
  const preview = linked.list ? linkedPreview(linked.list) : null

  let body
  if (linked.error && !preview) {
    body = (
      <p className="fg-slr__note" role="status">
        <span>이어진 기업을 불러오지 못했어요</span>
        <RetryText subject="이어진 기업" onRetry={linked.retry} />
      </p>
    )
  } else if (!preview || pending) {
    body = <Skeleton height={168} />
  } else if (preview.total === 0) {
    body = <p className="fg-slr__note">아직 관계로 이어진 기업이 없어요</p>
  } else {
    body = (
      <>
        {locked ? (
          <MemberGate subject={`이런 기업 ${preview.total}곳`} variant="compact" />
        ) : (
          <div className="fg-slr__rows">
            {preview.rows.map((company) => (
              <LinkedRailRow key={company.id} company={company} to={linksTab} state={navState(state)} replace />
            ))}
          </div>
        )}
        <ButtonLink to={linksTab} state={navState(state)} replace className="fg-slr__all">
          {`이어진 기업 ${preview.total}곳 모두 보기`}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </ButtonLink>
      </>
    )
  }

  return (
    <section className="fg-section fg-slr" aria-labelledby="fg-slr-title">
      <div className="fg-slr__head">
        <span className="fg-slr__title">
          <h2 id="fg-slr-title" className="fg-section__title">
            이런 기업은 어때요?
          </h2>
          <Badge tone="inferred">AI 추론</Badge>
        </span>
        <span className="fg-slr__cap">{`${stockName}${josa(stockName, '와/과')} 관계로 이어진 기업이에요`}</span>
      </div>
      {body}
    </section>
  )
}
