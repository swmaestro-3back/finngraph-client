import { ChevronRight } from 'lucide-react'
import { useCallback, useMemo, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { MemberGate } from '@/components/fg/MemberGate'
import { ChangeText } from '@/components/fg/PriceChange'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import type { StockRowRes } from '@/lib/apiTypes'
import { useFavorites } from '@/lib/favorites'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import { RAIL_MOVERS, WATCH_ROWS, watchRows, type WatchRow } from '@/lib/fg/home'
import { hubSearch, MOVER_UNIVERSE, pickMovers, quoteExtOf, type HubIssueRef, type HubQuoteExt } from '@/lib/fg/hub'
import { stockPath } from '@/lib/fg/paths'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import { useStockIssueLines, type HubSlot } from '@/lib/queries/useHubSlots'
import { stockIndexOf, useStocksCached } from '@/lib/queries/useStocksCached'
import type { PriceBasis } from '@/lib/referenceDate'
import { cn } from '@/lib/utils'

const HOME_NOTE = '이슈 요약과 연결 정보는 AI가 인용된 기사·공시로 만든 참고 자료이며 투자 권유가 아니에요.'

const REDUCED = '(prefers-reduced-motion: reduce)'

type Lines = HubSlot<ReadonlyMap<string, HubIssueRef | null>>

function lineOf(lines: Lines, ticker: string): HubIssueRef | null {
  return lines.status === 'ready' ? (lines.data.get(ticker) ?? null) : null
}

function LinesFailed({ lines }: { lines: Lines }) {
  if (lines.status !== 'error') return null
  return (
    <p className="fg-hsr__fail" role="status">
      <span>최근 이슈를 불러오지 못했어요</span>
      <RetryText subject="최근 이슈" onRetry={lines.retry} />
    </p>
  )
}

function IssueLine({ line }: { line: HubIssueRef }) {
  return (
    <span className="fg-hsr__issue">
      <i className="fg-dia" aria-hidden="true" />
      <span className="fg-hsr__itext">{line.title}</span>
      <span className="fg-hsr__media fg-num">{`${line.media}개 매체`}</span>
    </span>
  )
}

function RowSkeleton({ count, height }: { count: number; height: number }) {
  return (
    <div className="fg-hsr__skel" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  )
}

const FOCUS_FRAMES = 90

function openHead(ticker: string | null): HTMLElement | null {
  const item = ticker === null ? '.fg-acc__item:first-child.is-open' : '.fg-acc__item.is-open'
  const head = document.querySelector<HTMLElement>(`.fg-hubc ${item} > .fg-acc__head`)
  const target = head?.getAttribute('aria-controls') ?? ''
  if (!target.startsWith('fg-hub-stock-')) return null
  return ticker === null || target === `fg-hub-stock-${ticker}` ? head : null
}

function focusHub(ticker: string | null) {
  const reduced = window.matchMedia(REDUCED).matches
  let frames = 0
  const step = () => {
    const head = openHead(ticker)
    frames += 1
    if (!head && frames < FOCUS_FRAMES) {
      window.requestAnimationFrame(step)
      return
    }
    const hub = document.querySelector<HTMLElement>('.fg-hubc')
    if (!hub) return
    const top = (head ?? hub).getBoundingClientRect().top
    const header = document.querySelector<HTMLElement>('.fg-gh')?.offsetHeight ?? 0
    if (top < header || top > window.innerHeight * 0.6) hub.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
    head?.focus({ preventScroll: true })
  }
  window.requestAnimationFrame(step)
}

interface HomeMoversProps {
  market: PriceBasis | null
}

export function HomeMovers({ market }: HomeMoversProps) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const stocks = useStocksCached()
  const movers = useMemo(() => (stocks.data ? pickMovers(stocks.data, MOVER_UNIVERSE, RAIL_MOVERS) : null), [stocks.data])
  const keys = useMemo(() => (movers ?? []).map((stock) => stock.ticker), [movers])
  const lines = useStockIssueLines(keys)
  const skeleton = useDelayed(movers === null && !stocks.error)
  const baseDate = market?.baseDate ?? null

  const go = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, ticker: string | null) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      navigate({ pathname, search: hubSearch(search, 'stocks', ticker) }, { replace: true })
      focusHub(ticker)
    },
    [navigate, pathname, search],
  )

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
    body = skeleton ? <RowSkeleton count={RAIL_MOVERS} height={44} /> : <div className="fg-hsr__skel" />
  } else if (movers.length === 0) {
    body = <StateBlock kind="empty" title="오늘 움직인 종목이 아직 없어요" description="시세가 들어오면 여기에 보여 드려요" />
  } else {
    body = (
      <>
        <ul className="fg-hsr__list">
          {movers.map((stock) => (
            <li key={stock.ticker}>
              <MoverRow
                stock={stock}
                line={lineOf(lines, stock.ticker)}
                ext={quoteExtOf(stock, baseDate)}
                to={`${pathname}${hubSearch(search, 'stocks', stock.ticker)}`}
                onClick={(event) => go(event, stock.ticker)}
              />
            </li>
          ))}
        </ul>
        <LinesFailed lines={lines} />
      </>
    )
  }

  return (
    <section className="fg-section fg-hsec fg-hrail" aria-labelledby="fg-movers-h">
      <div className="fg-hsec__head">
        <div className="fg-hsec__titles">
          <h2 id="fg-movers-h" className="fg-hsec__title">
            많이 움직인 종목
          </h2>
          <span className="fg-hsec__cap">왜 움직였는지 이슈 타임라인으로 이어져요</span>
        </div>
        <Link
          to={`${pathname}${hubSearch(search, 'stocks', null)}`}
          replace
          className="fg-hsec__link"
          aria-label="많이 움직인 종목 전체 보기"
          onClick={(event) => go(event, null)}
        >
          전체
        </Link>
      </div>
      {body}
    </section>
  )
}

interface MoverRowProps {
  stock: StockRowRes
  line: HubIssueRef | null
  ext: HubQuoteExt | null
  to: string
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void
}

function MoverRow({ stock, line, ext, to, onClick }: MoverRowProps) {
  const sub = [marketLabel(stock.market), stock.themeName].filter(Boolean).join(' · ')
  return (
    <Link to={to} replace className="fg-hsr" onClick={onClick}>
      <CompanyLogo name={stock.name} size={32} />
      <span className="fg-hsr__body">
        <span className="fg-hsr__top">
          <span className="fg-hsr__id">
            <span className="fg-hsr__name">{stock.name}</span>
            {ext?.high && <Badge tone="high">52주 신고가</Badge>}
          </span>
          {stock.change !== null && <ChangeText value={stock.change} className="fg-hsr__chg" />}
        </span>
        {line ? <IssueLine line={line} /> : <span className="fg-hsr__sub">{sub}</span>}
      </span>
    </Link>
  )
}

function WeekLine({ ext }: { ext: HubQuoteExt | null }) {
  return (
    <span className="fg-hsr__w52 fg-num">
      {ext?.high ? (
        <Badge tone="high">52주 신고가</Badge>
      ) : (
        <span className="fg-hsr__gap">
          52주 최고 대비 {ext ? <b>{formatGapPct(ext.gapFromHigh)}</b> : '—'}
        </span>
      )}
      {ext && ext.position !== null && (
        <span className="fg-hsr__bar" aria-hidden="true">
          <i className={cn(ext.high && 'is-high')} style={{ left: `${(ext.position * 100).toFixed(1)}%` }} />
        </span>
      )}
    </span>
  )
}

interface WatchRowViewProps {
  row: WatchRow
  line: HubIssueRef | null
  ext: HubQuoteExt | null
  state: unknown
}

function WatchRowView({ row, line, ext, state }: WatchRowViewProps) {
  return (
    <Link to={stockPath(row.ticker)} state={state} className="fg-hsr fg-hsr--watch">
      <CompanyLogo name={row.name} size={32} />
      <span className="fg-hsr__body">
        <span className="fg-hsr__top">
          <span className="fg-hsr__name">{row.name}</span>
          <span className="fg-hsr__px fg-num">
            {row.price !== null && <span className="fg-hsr__price">{formatPriceWon(row.price)}</span>}
            {row.change !== null && <ChangeText value={row.change} className="fg-hsr__chg fg-hsr__chg--quiet" />}
          </span>
        </span>
        <WeekLine ext={ext} />
        {line && <IssueLine line={line} />}
      </span>
    </Link>
  )
}

interface HomeWatchlistProps {
  market: PriceBasis | null
}

export function HomeWatchlist({ market }: HomeWatchlistProps) {
  const { pathname, search } = useLocation()
  const { locked, pending } = useMemberGate()
  const favorites = useFavorites()
  const member = !locked && !pending
  const stocks = useStocksCached()
  const quotes = stockIndexOf(stocks.data)
  const { rows, total } = useMemo(() => watchRows(favorites.items, quotes), [favorites.items, quotes])
  const keys = useMemo(() => (member ? rows.map((row) => row.ticker) : []), [member, rows])
  const lines = useStockIssueLines(keys)
  const loading = pending || (member && !favorites.ready && !favorites.error)
  const skeleton = useDelayed(loading)
  const state = fromState(`${pathname}${search}`)
  const baseDate = market?.baseDate ?? null

  let body: ReactNode
  if (locked) {
    body = <MemberGate subject="관심 종목" variant="compact" className="fg-hwl__gate" />
  } else if (loading) {
    body = skeleton ? <RowSkeleton count={3} height={64} /> : <div className="fg-hsr__skel" />
  } else if (favorites.error && !favorites.ready) {
    body = (
      <StateBlock
        kind="error"
        title="관심 종목을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={() => void favorites.refresh().catch(() => undefined)}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (total === 0) {
    body = (
      <StateBlock
        kind="empty"
        title="아직 관심 종목이 없어요"
        description="종목 화면에서 별을 눌러 추가해 보세요"
        action={
          <ButtonLink size="sm" to="/stocks">
            종목 보러 가기
          </ButtonLink>
        }
      />
    )
  } else {
    body = (
      <>
        <ul className="fg-hsr__list">
          {rows.map((row) => (
            <li key={row.ticker}>
              <WatchRowView
                row={row}
                line={lineOf(lines, row.ticker)}
                ext={quoteExtOf(quotes?.get(row.ticker), baseDate)}
                state={state}
              />
            </li>
          ))}
        </ul>
        <LinesFailed lines={lines} />
        {total > WATCH_ROWS && (
          <Link to="/me" className="fg-hub__more fg-hubmore fg-hwl__all">
            {`관심 종목 ${total}개 모두 보기`}
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )}
      </>
    )
  }

  return (
    <section className="fg-section fg-hsec fg-hrail fg-hwl" aria-labelledby="fg-watch-h">
      <div className="fg-hsec__head">
        <h2 id="fg-watch-h" className="fg-hsec__title">
          관심 종목
        </h2>
        {member && (
          <Link to="/me" className="fg-hsec__link" aria-label="관심 종목 편집">
            편집
          </Link>
        )}
      </div>
      {body}
    </section>
  )
}

export function HomeNote() {
  return <Disclaimer text={HOME_NOTE} className="fg-hnote" />
}
