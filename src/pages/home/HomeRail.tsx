// Lucian UX/UI Prompt #017 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#017
import { ChevronRight } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { MemberGate } from '@/components/fg/MemberGate'
import { ChangeText } from '@/components/fg/PriceChange'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { Week52Gauge } from '@/components/fg/Week52Range'
import { useFavorites } from '@/lib/favorites'
import { formatGapPct, formatPriceWon } from '@/lib/fg/format'
import { WATCH_ROWS, watchRows, type WatchRow } from '@/lib/fg/home'
import { quoteExtOf, type HubIssueRef, type HubQuoteExt } from '@/lib/fg/hub'
import { stockPath } from '@/lib/fg/paths'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import { useStockIssueLines, type HubSlot } from '@/lib/queries/useHubSlots'
import { stockIndexOf, useStocksCached } from '@/lib/queries/useStocksCached'
import type { PriceBasis } from '@/lib/referenceDate'

const HOME_NOTE = '이슈 요약과 연결 정보는 인용된 기사·공시로 만든 참고 자료이며 투자 권유가 아니에요.'

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
      {ext && ext.position !== null && <Week52Gauge position={ext.position} high={ext.high} barClassName="fg-hsr__bar" />}
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
      <CompanyLogo name={row.name} ticker={row.ticker} size={32} />
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
