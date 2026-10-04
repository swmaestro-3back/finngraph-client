import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { FilterChip } from '@/components/fg/FilterChip'
import { ChangeText } from '@/components/fg/PriceChange'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import type { ApiError } from '@/lib/api'
import type { ThemeStockRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import { formatPriceWon, marketLabel } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import {
  DEFAULT_MEMBER_SORT,
  MEMBER_TABLE_LIMIT,
  capWeight,
  delistingCount,
  filterMarket,
  formatWeight,
  marketCounts,
  memberAriaSort,
  memberCaption,
  memberSortGlyph,
  memberSortLabel,
  nextMemberSort,
  sortMembers,
  visibleMembers,
  type MarketFilter,
  type MemberSort,
  type MemberSortKey,
} from '@/lib/fg/themeDetail'
import { useDelayed } from '@/lib/fg/useDelayed'
import { fromState } from '@/lib/navigation'
import { changeStatusTag } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

const MARKETS: readonly { value: MarketFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'kospi', label: '코스피' },
  { value: 'kosdaq', label: '코스닥' },
]

const COLUMNS: readonly { key: MemberSortKey; label: string }[] = [
  { key: 'price', label: '현재가' },
  { key: 'change', label: '등락률' },
  { key: 'r1m', label: '1달' },
  { key: 'value', label: '거래대금' },
  { key: 'cap', label: '시가총액' },
]

interface ThemeConstituentsProps {
  stocks: readonly ThemeStockRes[] | null
  loading: boolean
  error: ApiError | null
  onRetry: () => void
  themeCap: number | null
  from: string
  className?: string
}

function Change({ value }: { value: number | null | undefined }) {
  return value === null || value === undefined ? <>—</> : <ChangeText value={value} />
}

function Price({ value }: { value: number | null }) {
  return <>{value === null ? '—' : formatPriceWon(value)}</>
}

function ChangeOrStatus({ stock }: { stock: ThemeStockRes }) {
  const tag = changeStatusTag(stock.changeStatus)
  if (!tag) return <Change value={stock.change} />
  return (
    <Badge title={tag.title} className="fg-tcm__tag">
      {tag.label}
    </Badge>
  )
}

export function ThemeConstituents({ stocks, loading, error, onRetry, themeCap, from, className }: ThemeConstituentsProps) {
  const [market, setMarket] = useState<MarketFilter>('all')
  const [sort, setSort] = useState<MemberSort>(DEFAULT_MEMBER_SORT)
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const showSkeleton = useDelayed(loading && stocks === null)
  const counts = useMemo(() => marketCounts(stocks ?? []), [stocks])
  const scope = useMemo(() => sortMembers(filterMarket(stocks ?? [], market), sort), [stocks, market, sort])
  const rows = visibleMembers(scope, showAll)
  const tableLabel = `구성 종목, ${memberSortLabel(sort)}`

  const pickMarket = (next: MarketFilter) => {
    setMarket(next)
    setShowAll(false)
  }

  let body: ReactNode
  if (error && stocks === null) {
    body = (
      <StateBlock
        kind="error"
        title="구성 종목을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (stocks === null) {
    body = showSkeleton ? (
      <div className="fg-tcm__skel" aria-hidden="true">
        <Skeleton height={32} width={240} shape="chip" />
        <Skeleton height={40} />
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </div>
    ) : null
  } else if (stocks.length === 0) {
    body = (
      <StateBlock kind="empty" title="이 테마에 담긴 종목이 아직 없어요" description="종목이 정해지면 여기에 보여 드려요" />
    )
  } else {
    body = (
      <>
        <div className="fg-chiprow fg-tcm__chips fg-reveal" role="group" aria-label="시장">
          {MARKETS.map(({ value, label }) => (
            <FilterChip
              key={value}
              pressed={market === value}
              count={counts[value]}
              disabled={value !== 'all' && counts[value] === 0}
              onClick={() => pickMarket(value)}
            >
              {label}
            </FilterChip>
          ))}
        </div>
        <div className="fg-table-wrap fg-tcm__wrap fg-reveal" role="region" aria-label="구성 종목 표" tabIndex={0}>
          <div className="fg-tcm" role="table" aria-label={tableLabel}>
            <div className="fg-tcm__row fg-tcm__row--head" role="row">
              <span role="columnheader">종목</span>
              {COLUMNS.map(({ key, label }) => (
                <span key={key} role="columnheader" aria-sort={memberAriaSort(sort, key)}>
                  <button type="button" className="fg-tcm__sort" onClick={() => setSort(nextMemberSort(sort, key))}>
                    {label}
                    {memberSortGlyph(sort, key)}
                  </button>
                </span>
              ))}
              <span role="columnheader">테마 포함 사유</span>
            </div>
            {rows.map((stock) => (
              <div key={stock.ticker} className="fg-tcm__row" role="row">
                <span role="cell" className="fg-tcm__name">
                  <CompanyLogo name={stock.name} />
                  <span>
                    <Link to={stockPath(stock.ticker)} state={fromState(from)}>
                      {stock.name}
                    </Link>
                    <small>
                      {marketLabel(stock.market)} · {stock.ticker}
                    </small>
                  </span>
                </span>
                <span role="cell" className="fg-tcm__num">
                  <Price value={stock.price} />
                </span>
                <span role="cell" className="fg-tcm__num">
                  <ChangeOrStatus stock={stock} />
                </span>
                <span role="cell" className="fg-tcm__num">
                  <Change value={stock.r1m} />
                </span>
                <span role="cell" className="fg-tcm__num fg-tcm__sub">
                  {formatCompactKrw(stock.tradingValue)}
                </span>
                <span role="cell" className="fg-tcm__num fg-tcm__sub">
                  {formatCompactKrw(stock.marketCap)}
                </span>
                <span role="cell" className="fg-tcm__why">
                  {stock.reason ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
        <ul className="fg-tcm__list fg-reveal" aria-label={tableLabel}>
          {rows.map((stock) => {
            const isOpen = open === stock.ticker
            const moreId = `fg-tcm-more-${stock.ticker}`
            return (
              <li key={stock.ticker} className="fg-tcm__item" data-open={isOpen ? 'true' : undefined}>
                <button
                  type="button"
                  className="fg-tcm__btn"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? moreId : undefined}
                  onClick={() => setOpen(isOpen ? null : stock.ticker)}
                >
                  <span className="fg-tcm__bname">
                    <CompanyLogo name={stock.name} />
                    <span>
                      <b>{stock.name}</b>
                      <small>{stock.reason ?? `${marketLabel(stock.market)} · ${stock.ticker}`}</small>
                    </span>
                  </span>
                  <span className="fg-tcm__bnum">
                    <b>
                      <Price value={stock.price} />
                    </b>
                    <span>
                      <ChangeOrStatus stock={stock} />
                    </span>
                  </span>
                </button>
                <div className="fg-fold" data-open={isOpen ? 'true' : undefined} inert={!isOpen}>
                  <div className="fg-fold__in">
                    <div id={moreId} className="fg-tcm__more">
                      {stock.reason && <p>{stock.reason}</p>}
                      <dl className="fg-tcm__mstats">
                        <div>
                          <dt>시가총액</dt>
                          <dd>{formatCompactKrw(stock.marketCap)}</dd>
                        </div>
                        <div>
                          <dt>테마 내 비중</dt>
                          <dd>{formatWeight(capWeight(stock.marketCap, themeCap))}</dd>
                        </div>
                        <div>
                          <dt>거래대금</dt>
                          <dd>{formatCompactKrw(stock.tradingValue)}</dd>
                        </div>
                        <div>
                          <dt>1달 수익률</dt>
                          <dd>
                            <Change value={stock.r1m} />
                          </dd>
                        </div>
                      </dl>
                      <ButtonLink to={stockPath(stock.ticker)} state={fromState(from)}>
                        {stock.name} 종목 보기
                      </ButtonLink>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        {!showAll && scope.length > MEMBER_TABLE_LIMIT && (
          <Button className="fg-reveal" onClick={() => setShowAll(true)}>
            {scope.length}종목 모두 보기
          </Button>
        )}
      </>
    )
  }

  return (
    <section className={cn('fg-section', className)} aria-labelledby="fg-tcm-title">
      <div className="fg-section__head">
        <div className="fg-tdp__titles">
          <h2 id="fg-tcm-title" className="fg-section__title">
            구성 종목
          </h2>
          {stocks && stocks.length > 0 && (
            <p className="fg-section__sub fg-num">{memberCaption(market, scope.length, sort, delistingCount(scope))}</p>
          )}
        </div>
      </div>
      {body}
    </section>
  )
}
