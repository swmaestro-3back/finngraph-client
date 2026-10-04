import { ExternalLink } from 'lucide-react'
import { useId, useState, type Ref } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { PriceChange } from '@/components/fg/PriceChange'
import { Skeleton } from '@/components/fg/Skeleton'
import { PriceStatus } from '@/components/fg/StatusTag'
import { StockGraphLink, StockWatchButton } from '@/components/fg/StockActions'
import { StockTabs, type TabCounts } from '@/components/fg/StockTabs'
import { Week52Range } from '@/components/fg/Week52Range'
import type { StockDetailRes } from '@/lib/apiTypes'
import { dartFilingUrl, describeSource, profileRows } from '@/lib/companyOverview'
import { marketLabel } from '@/lib/fg/format'
import { themePath } from '@/lib/fg/paths'
import { companySummary, isAiSummary, type StockTab } from '@/lib/fg/stockDetail'
import { WEEK52_BASIS, type StockStatus, type Week52Summary } from '@/lib/fg/stockQuote'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface StockHeaderProps {
  stock: StockDetailRes
  basis: string | null
  amount: number | null
  week52: Week52Summary | null
  week52Loading: boolean
  status: StockStatus | null
  today: string
  tab: StockTab
  counts: TabCounts
  tabsRef: Ref<HTMLElement>
}

function CompanyAbout({ stock }: { stock: StockDetailRes }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const summary = companySummary(stock.description)
  const rows = profileRows(stock.profile)
  if (!summary && rows.length === 0) return null
  const source = describeSource(stock.descriptionSource)
  const expandable = (summary?.rest.length ?? 0) > 0 || rows.length > 0
  return (
    <>
      <p className="fg-sdh__sum">
        {summary && isAiSummary(stock.descriptionSource) && <Badge>AI 요약</Badge>}
        {summary && <span className="fg-sdh__lead">{summary.lead}</span>}
        {expandable && (
          <button
            type="button"
            className="fg-sdmore"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((on) => !on)}
          >
            {open ? '접기' : summary ? '더 보기' : '기업 정보'}
          </button>
        )}
        {stock.descriptionRceptNo && (
          <a className="fg-sdmore" href={dartFilingUrl(stock.descriptionRceptNo)} target="_blank" rel="noreferrer">
            사업보고서
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
          </a>
        )}
      </p>
      <div id={panelId} className="fg-fold" data-open={open} inert={!open}>
        <div className="fg-fold__in">
          <div className="fg-sdh__about">
            {summary && summary.rest.length > 0 && <p>{summary.rest.join(' ')}</p>}
            {rows.length > 0 && (
              <dl className="fg-sdh__profile">
                {rows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd className={cn(row.numeric && 'fg-num')}>
                      {row.href ? (
                        <a href={row.href} target="_blank" rel="noreferrer">
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {summary && source && <span className="fg-sdh__src">{source}</span>}
          </div>
        </div>
      </div>
    </>
  )
}

function HeaderPrice({ stock, amount, status }: Pick<StockHeaderProps, 'stock' | 'amount' | 'status'>) {
  if (stock.price !== null && status) return <PriceStatus price={stock.price} status={status} display />
  if (stock.price === null || stock.change === null)
    return (
      <span className="fg-price">
        <span className="fg-price__now fg-price__now--display">—</span>
      </span>
    )
  return <PriceChange price={stock.price} change={stock.change} amount={amount} display />
}

export function StockHeader({
  stock,
  basis,
  amount,
  week52,
  week52Loading,
  status,
  today,
  tab,
  counts,
  tabsRef,
}: StockHeaderProps) {
  const { pathname, search } = useLocation()
  const priced = stock.price !== null && (stock.change !== null || status !== null)
  return (
    <section className="fg-section fg-sdh fg-reveal" aria-labelledby="fg-sdh-name">
      <div className="fg-sdh__row">
        <div className="fg-sdh__main">
          <div className="fg-sdh__id">
            <CompanyLogo name={stock.name} size={40} className="fg-sdh__logo" />
            <h1 id="fg-sdh-name" className="fg-sdh__name">
              {stock.name}
            </h1>
            {week52?.state === 'high' && <Badge tone="high">52주 신고가</Badge>}
            {week52?.state === 'low' && <Badge tone="low">52주 신저가</Badge>}
            <span className="fg-sdh__code fg-num">
              {stock.ticker} · {marketLabel(stock.market)}
            </span>
            {stock.themeId !== null && stock.themeName && (
              <Link
                to={themePath(stock.themeId)}
                state={fromState(`${pathname}${search}`)}
                className="fg-badge fg-sdh__theme"
              >
                {stock.themeName}
              </Link>
            )}
          </div>
          <div className="fg-sdh__price">
            <HeaderPrice stock={stock} amount={amount} status={status} />
            {basis && priced && <span className="fg-sdh__at fg-num">{basis}</span>}
          </div>
          <CompanyAbout stock={stock} />
        </div>
        <div className="fg-sdh__side">
          <div className="fg-sdh__acts">
            <StockWatchButton stock={stock} />
            <StockGraphLink stock={stock} />
          </div>
          {week52Loading ? (
            <Skeleton height={89} className="fg-sdh__w52" />
          ) : (
            week52 &&
            stock.price !== null && (
              <Week52Range
                className="fg-sdh__w52"
                name={stock.name}
                price={stock.price}
                high={week52.range.high}
                low={week52.range.low}
                basis={WEEK52_BASIS}
                asOf={week52.asOf}
                today={today}
                state={week52.state}
                highDate={week52.range.highDate}
                lowDate={week52.range.lowDate}
              />
            )
          )}
        </div>
      </div>
      <StockTabs ref={tabsRef} label="종목 보기" current={tab} counts={counts} className="fg-sdh__tabs" />
    </section>
  )
}
