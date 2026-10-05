import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { ChangeText } from '@/components/fg/PriceChange'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockChip } from '@/components/fg/StockChip'
import { splitChips } from '@/lib/fg/home'
import { issueTabPath } from '@/lib/fg/issuePage'
import type { IssueQuote } from '@/lib/fg/issueSubject'
import { issuePath } from '@/lib/fg/paths'
import { issueSpanLabel, STOCK_ISSUE_ORDER, tradingDayLabel, type StockIssueEvent } from '@/lib/fg/stockIssues'
import { useDelayed } from '@/lib/fg/useDelayed'
import { fromState } from '@/lib/navigation'
import { useIssueQuotes } from '@/lib/queries/useIssue'

export const ISSUE_CARD_PAGE = 10
const CARD_CHIPS = 3

export type StockIssueState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; events: readonly StockIssueEvent[]; total: number }

interface CardProps {
  event: StockIssueEvent
  ticker: string
  today: string
  quotes: ReadonlyMap<string, IssueQuote> | null
  state: unknown
}

function IssueCard({ event, ticker, today, quotes, state }: CardProps) {
  const others = event.companies.filter((company) => company.ticker !== ticker)
  const { shown, extra } = splitChips(others, CARD_CHIPS)
  return (
    <li className="fg-hcard">
      <div className="fg-hcard__meta fg-num">
        <span>
          <b>{issueSpanLabel(event, today)}</b>
          {` 보도 · ${event.media}개 매체 · 기사 ${event.articles}건 · 이 종목 언급 ${event.mentions}건`}
        </span>
        {event.index !== null && event.change !== null && (
          <span className="fg-sic__chg">
            {tradingDayLabel(event)} <ChangeText value={event.change} className="fg-sic__chgv" />
          </span>
        )}
      </div>
      <Link to={issuePath(event.id)} state={state} className="fg-hcard__title">
        {event.title}
      </Link>
      {event.summary && <p className="fg-hcard__sum">{event.summary}</p>}
      {shown.length > 0 && (
        <div className="fg-hcard__foot">
          <span className="fg-sic__with">함께 나온 종목</span>
          {shown.map((company) => (
            <StockChip
              key={company.ticker}
              ticker={company.ticker}
              name={company.name}
              change={quotes?.get(company.ticker)?.change ?? null}
              withLogo
              state={state}
              className="fg-hcard__chip"
            />
          ))}
          {extra > 0 && (
            <Link
              to={issueTabPath(event.id, 'stocks')}
              state={state}
              className="fg-chip fg-chip--more fg-hcard__more"
              aria-label={`이 이슈에 나온 종목 ${extra}개 더 보기`}
            >
              {`+${extra}`}
            </Link>
          )}
        </div>
      )}
    </li>
  )
}

interface StockIssueCardsProps {
  ticker: string
  issues: StockIssueState
  today: string
}

export function StockIssueCards({ ticker, issues, today }: StockIssueCardsProps) {
  const { pathname, search } = useLocation()
  const [limit, setLimit] = useState(ISSUE_CARD_PAGE)
  const ready = issues.status === 'ready' && issues.events.length > 0
  const { quotes } = useIssueQuotes(ready)
  const waiting = useDelayed(issues.status === 'loading')
  const state = fromState(`${pathname}${search}`)

  let body: ReactNode
  let sub = `최근 1년 · ${STOCK_ISSUE_ORDER}`
  if (issues.status === 'loading') {
    body = waiting ? <Skeleton height={320} /> : null
  } else if (issues.status === 'error') {
    body = (
      <StateBlock
        kind="error"
        title="이슈를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={issues.retry}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (issues.events.length === 0) {
    body = (
      <StateBlock
        kind="empty"
        title="최근 1년 동안 이 종목이 나온 이슈가 없어요"
        description="여러 매체가 다룬 기사가 모이면 여기에 보여 드려요"
      />
    )
  } else {
    const shown = issues.events.slice(0, limit)
    const more = Math.min(ISSUE_CARD_PAGE, issues.events.length - shown.length)
    sub = `${sub} · ${issues.total.toLocaleString('ko-KR')}개`
    body = (
      <>
        <ol className="fg-sic__list" aria-label="이 종목이 나온 이슈">
          {shown.map((event) => (
            <IssueCard key={event.key} event={event} ticker={ticker} today={today} quotes={quotes} state={state} />
          ))}
        </ol>
        {more > 0 && (
          <Button className="fg-sic__more" onClick={() => setLimit((n) => n + ISSUE_CARD_PAGE)}>
            {`이슈 ${more}개 더 보기`}
            <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        )}
        {more === 0 && issues.total > issues.events.length && (
          <p className="fg-sic__note">{`최근 이슈 ${issues.events.length}개까지 보여 드려요`}</p>
        )}
      </>
    )
  }

  return (
    <section className="fg-section fg-sic" aria-labelledby="fg-sic-title">
      <div className="fg-section__head">
        <div className="fg-sev__titles">
          <h2 id="fg-sic-title" className="fg-section__title">
            이 종목이 나온 이슈
          </h2>
          <p className="fg-section__sub fg-num">{sub}</p>
        </div>
      </div>
      {body}
    </section>
  )
}
