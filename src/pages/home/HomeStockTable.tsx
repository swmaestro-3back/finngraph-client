import { ChevronRight } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { GapValue } from '@/components/fg/Gap'
import { ChangeText } from '@/components/fg/PriceChange'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import type { StockRowRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import { formatPriceWon } from '@/lib/fg/format'
import { HOME_STOCK_ROWS } from '@/lib/fg/home'
import { MOVER_UNIVERSE, pickMovers, type HubIssueRef } from '@/lib/fg/hub'
import { issueTabPath } from '@/lib/fg/issuePage'
import { stockPath } from '@/lib/fg/paths'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { fromState } from '@/lib/navigation'
import { useStockIssueLines, type HubSlot } from '@/lib/queries/useHubSlots'
import { useStocksCached } from '@/lib/queries/useStocksCached'

const NARROW = '(max-width: 767px)'
const ORDER_NOTE = '등락률이 큰 순'
const ISSUE_NOTE = '최근 이슈를 누르면 타임라인으로 이어져요'
const UNIVERSE_NOTE = `시가총액 상위 ${MOVER_UNIVERSE}종목 기준`

type Lines = HubSlot<ReadonlyMap<string, HubIssueRef | null>>

interface IssueCellProps {
  lines: Lines
  ticker: string
  state: unknown
}

function lineOf(lines: Lines, ticker: string): HubIssueRef | null {
  return lines.status === 'ready' ? (lines.data.get(ticker) ?? null) : null
}

function IssueLink({ lines, ticker, state }: IssueCellProps) {
  if (lines.status === 'not-ready') return <GapValue gap={lines.gap} />
  if (lines.status === 'loading') return <Skeleton height={20} width="70%" />
  if (lines.status === 'error') return <span className="fg-htt__none">—</span>
  const line = lineOf(lines, ticker)
  if (!line) return <span className="fg-htt__none">최근 이슈가 없어요</span>
  return (
    <Link to={issueTabPath(line.id, 'timeline')} state={state} className="fg-htt__issue" title={line.title}>
      <i className="fg-dia" aria-hidden="true" />
      <span className="fg-htt__itext">{line.title}</span>
      <span className="fg-htt__media fg-num">{`${line.media}개 매체`}</span>
    </Link>
  )
}

interface RowProps {
  stock: StockRowRes
  lines: Lines
  state: unknown
}

function StockName({ stock, state }: Omit<RowProps, 'lines'>) {
  return (
    <Link to={stockPath(stock.ticker)} state={state} className="fg-htt__name">
      {stock.name}
    </Link>
  )
}

function TableRow({ stock, lines, state }: RowProps) {
  return (
    <tr>
      <th scope="row">
        <StockName stock={stock} state={state} />
      </th>
      <td className="fg-htt__num">{stock.price === null ? '—' : formatPriceWon(stock.price)}</td>
      <td className="fg-htt__num">{stock.change === null ? '—' : <ChangeText value={stock.change} />}</td>
      <td className="fg-htt__num fg-htt__ratio">{formatCompactKrw(stock.tradeValue ?? null)}</td>
      <td className="fg-htt__num fg-htt__ratio">{formatCompactKrw(stock.marketCap)}</td>
      <td className="fg-htt__cell">
        <IssueLink lines={lines} ticker={stock.ticker} state={state} />
      </td>
    </tr>
  )
}

function ListRow({ stock, lines, state }: RowProps) {
  const showIssue = lines.status !== 'not-ready' && lines.status !== 'error'
  return (
    <li className="fg-htt__item">
      <span className="fg-htt__top">
        <span className="fg-htt__who">
          <StockName stock={stock} state={state} />
          <span className="fg-htt__sub fg-num">
            {`거래대금 ${formatCompactKrw(stock.tradeValue ?? null)} · 시총 ${formatCompactKrw(stock.marketCap)}`}
          </span>
        </span>
        <span className="fg-hsr__px fg-num">
          {stock.price !== null && <span className="fg-hsr__price">{formatPriceWon(stock.price)}</span>}
          {stock.change !== null && <ChangeText value={stock.change} className="fg-htt__chg" />}
        </span>
      </span>
      {showIssue && <IssueLink lines={lines} ticker={stock.ticker} state={state} />}
    </li>
  )
}

export function HomeStockTable({ basis }: { basis: string | null }) {
  const { pathname, search } = useLocation()
  const narrow = useMediaQuery(NARROW)
  const stocks = useStocksCached()
  const movers = useMemo(
    () => (stocks.data ? pickMovers(stocks.data, MOVER_UNIVERSE, HOME_STOCK_ROWS) : null),
    [stocks.data],
  )
  const keys = useMemo(() => (movers ?? []).map((stock) => stock.ticker), [movers])
  const lines = useStockIssueLines(keys)
  const skeleton = useDelayed(movers === null && !stocks.error)
  const state = fromState(`${pathname}${search}`)
  const ready = lines.status === 'ready'
  const caption = [ORDER_NOTE, UNIVERSE_NOTE, !narrow && ready ? ISSUE_NOTE : null, basis].filter(Boolean).join(' · ')

  let body: ReactNode
  if (stocks.error && movers === null) {
    body = (
      <StateBlock
        kind="error"
        title="데이터를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={stocks.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (movers === null) {
    body = skeleton ? (
      <div className="fg-htt__skel" aria-hidden="true">
        {Array.from({ length: HOME_STOCK_ROWS }, (_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    ) : (
      <div className="fg-htt__skel" />
    )
  } else if (movers.length === 0) {
    body = (
      <StateBlock kind="empty" title="오늘 움직인 종목이 아직 없어요" description="시세가 들어오면 여기에 보여 드려요" />
    )
  } else if (narrow) {
    body = (
      <ul className="fg-htt__list">
        {movers.map((stock) => (
          <ListRow key={stock.ticker} stock={stock} lines={lines} state={state} />
        ))}
      </ul>
    )
  } else {
    body = (
      <div className="fg-table-wrap fg-htt__wrap" role="region" aria-label="오늘 움직인 종목 표" tabIndex={0}>
        <table className="fg-htt__table">
          <thead>
            <tr>
              <th scope="col">종목</th>
              <th scope="col" className="fg-htt__num">
                현재가
              </th>
              <th scope="col" className="fg-htt__num">
                등락률
              </th>
              <th scope="col" className="fg-htt__num">
                거래대금
              </th>
              <th scope="col" className="fg-htt__num">
                시가총액
              </th>
              <th scope="col">
                <span className="fg-htt__ihead">
                  최근 이슈
                  {lines.status === 'not-ready' && <span className="fg-htt__gap">준비 중</span>}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {movers.map((stock) => (
              <TableRow key={stock.ticker} stock={stock} lines={lines} state={state} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="fg-section fg-hsec fg-htt" aria-labelledby="fg-stocks-h">
      <div className="fg-hsec__head">
        <div className="fg-hsec__titles">
          <h2 id="fg-stocks-h" className="fg-hsec__title">
            오늘 움직인 종목
          </h2>
          <span className="fg-hsec__cap fg-num">{caption}</span>
        </div>
        <Link to="/stocks" className="fg-hsec__link">
          {narrow ? '전체' : '종목 전체 보기'}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
      {body}
      {lines.status === 'error' && movers && movers.length > 0 && (
        <p className="fg-htt__fail" role="status">
          <span>최근 이슈를 불러오지 못했어요</span>
          <RetryText subject="최근 이슈" onRetry={lines.retry} />
        </p>
      )}
    </section>
  )
}
