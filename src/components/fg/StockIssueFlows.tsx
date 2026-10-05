import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { FlowMiniChart } from '@/components/fg/FlowMiniChart'
import { MockBadge } from '@/components/fg/Gap'
import { Segment } from '@/components/fg/SegmentedTabs'
import { StateBlock } from '@/components/fg/StateBlock'
import type { CandleRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { formatPriceWon, toneClass } from '@/lib/fg/format'
import { motionAllowed } from '@/lib/fg/motion'
import { issuePath } from '@/lib/fg/paths'
import {
  DEFAULT_FLOW_PERIOD,
  FLOW_ORDERS,
  FLOW_PERIODS,
  FLOW_SORTS,
  flowCaption,
  flowChartLabel,
  flowChartWindow,
  flowCompareNote,
  flowListTitle,
  flowMediaLabel,
  flowMeta,
  flowSpan,
  flowStatus,
  timelineNodes,
  visibleFlows,
  widenOffer,
  type FlowOrder,
  type FlowPeriod,
  type FlowSort,
  type IssueFlow,
} from '@/lib/fg/stockFlows'
import { tradingDayLabel } from '@/lib/fg/stockIssues'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const CARD_STEP = 268
const EDGE_SLACK = 4

function changeText(value: number | null): string {
  return value === null ? '—' : formatChange(value)
}

function FlowBadges({ flow }: { flow: IssueFlow }) {
  const n = flow.items.length
  return (
    <span className="fg-flow__badges">
      <Badge tone={n > 1 ? 'issue' : 'neutral'}>{`이슈 ${n}개`}</Badge>
      {flow.live && <span className="fg-flow__live">진행 중</span>}
    </span>
  )
}

interface FlowCardProps {
  flow: IssueFlow
  today: string
  pressed: boolean
  onPick: () => void
}

function FlowCard({ flow, today, pressed, onPick }: FlowCardProps) {
  const single = flow.items.length === 1
  return (
    <button type="button" className="fg-flow" aria-pressed={pressed} onClick={onPick}>
      <span className="fg-flow__top">
        <FlowBadges flow={flow} />
        <span>{flowSpan(flow, today)}</span>
      </span>
      <span className="fg-flow__title">{flow.title}</span>
      <span className="fg-flow__rail" data-single={single || undefined} aria-hidden="true">
        {flow.items.map((item) => (
          <span key={item.key} className={cn('fg-flow__dot', flow.live && item.key === flow.last.key && 'fg-flow__dot--now')} />
        ))}
      </span>
      <span className="fg-flow__top">
        <span>{flowMediaLabel(flow)}</span>
        <span>{flowStatus(flow, today)}</span>
      </span>
      <span className="fg-flow__foot">
        <span>이 흐름 동안 주가</span>
        <b className={toneClass(flow.change)}>{changeText(flow.change)}</b>
      </span>
    </button>
  )
}

interface FlowDetailProps {
  flow: IssueFlow
  stockName: string
  candles: readonly CandleRes[]
  today: string
  onOpenIssue: (key: string) => void
}

function FlowDetail({ flow, stockName, candles, today, onOpenIssue }: FlowDetailProps) {
  const { pathname, search } = useLocation()
  const [order, setOrder] = useState<FlowOrder>('time')
  const n = flow.items.length
  const span = flowChartWindow(flow, candles.length)
  const windowed = useMemo(() => candles.slice(span.from, span.to + 1), [candles, span.from, span.to])
  const marks = useMemo(
    () => flow.items.map((item) => ({ key: item.key, date: candles[item.index]?.date ?? item.date, close: item.close })),
    [flow.items, candles],
  )
  const nodes = timelineNodes(flow, order, candles, today)
  const listTitle = flowListTitle(flow, order)
  return (
    <section className="fg-section fg-sfd" aria-labelledby="fg-sfd-title">
      <div className="fg-sfd__head">
        <div className="fg-sfd__id">
          <FlowBadges flow={flow} />
          <h2 id="fg-sfd-title" className="fg-sfd__title">
            {flow.title}
          </h2>
          <span className="fg-sfd__meta fg-num">{flowMeta(flow, today)}</span>
        </div>
        <div className="fg-sfd__chg fg-num">
          <small>이 흐름 동안 주가</small>
          <b className={toneClass(flow.change)}>{changeText(flow.change)}</b>
          <small>{`${formatPriceWon(flow.fromClose)} → ${formatPriceWon(flow.toClose)}`}</small>
        </div>
      </div>
      <FlowMiniChart candles={windowed} marks={marks} change={flow.change} label={flowChartLabel(flow, stockName)} />
      <div className="fg-sfd__legend fg-num">
        <span>
          <i className="fg-dia" aria-hidden="true" />
          이슈가 보도된 날(휴장일이면 다음 거래일) · 일봉 종가
        </span>
        <span>{flowCompareNote(flow, today)}</span>
      </div>
      <div className="fg-sfd__listhead">
        <h3>{listTitle}</h3>
        {n > 1 && <Segment label="순서" options={FLOW_ORDERS} value={order} onChange={setOrder} />}
      </div>
      <ol className="fg-vt" aria-label={listTitle}>
        {nodes.map((node) => {
          const { issue } = node
          return (
            <li key={issue.key} className="fg-vt__node" data-now={node.now || undefined}>
              {node.since && (
                <p className="fg-vt__since fg-num">
                  <span>{`${node.since.days}일 뒤`}</span>
                  <span>
                    이 사이 주가 <b className={toneClass(node.since.change)}>{changeText(node.since.change)}</b>
                  </span>
                </p>
              )}
              <span className="fg-vt__date fg-num">
                <b>{node.dateText}</b>
                <small>{node.dateSub}</small>
              </span>
              <span className="fg-vt__dot" aria-hidden="true" />
              <div className="fg-vt__body">
                <span className="fg-vt__meta fg-num">
                  <Badge tone={n > 1 ? 'issue' : 'neutral'}>{node.badge}</Badge>
                  <span>{`${issue.media}개 매체 · 기사 ${issue.articles}건`}</span>
                </span>
                <button type="button" className="fg-vt__title" aria-haspopup="dialog" onClick={() => onOpenIssue(issue.key)}>
                  {issue.title}
                </button>
                <p className="fg-vt__sum">
                  <Badge>AI 요약</Badge>
                  {issue.summary}
                </p>
                {issue.with.length > 0 && (
                  <span className="fg-vt__with">
                    <span>함께 나온 종목</span>
                    {issue.with.map((name) => (
                      <span key={name} className="fg-lg fg-vt__co">
                        <CompanyLogo name={name} size={16} />
                        <span>{name}</span>
                      </span>
                    ))}
                    {issue.more > 0 && <span>{`외 ${issue.more}`}</span>}
                  </span>
                )}
              </div>
              <span className="fg-vt__chg fg-num">
                <span>{tradingDayLabel(issue)}</span>
                <b className={toneClass(issue.change)}>{changeText(issue.change)}</b>
              </span>
              {n === 1 && (
                <p className="fg-vt__single">아직 이어진 이슈가 없어요. 비슷한 소식이 나오면 이 흐름에 이어 붙여요</p>
              )}
            </li>
          )
        })}
      </ol>
      {n > 1 && (
        <Link
          to={`${issuePath(flow.last.key)}?tab=timeline`}
          state={fromState(`${pathname}${search}`)}
          className="fg-sdmore fg-sfd__page"
        >
          이슈 페이지에서 타임라인 보기
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}

interface StockIssueFlowsProps {
  stockName: string
  flows: readonly IssueFlow[]
  candles: readonly CandleRes[]
  today: string
  onOpenIssue: (key: string) => void
}

export function StockIssueFlows({ stockName, flows, candles, today, onOpenIssue }: StockIssueFlowsProps) {
  const [period, setPeriod] = useState<FlowPeriod>(DEFAULT_FLOW_PERIOD)
  const [sort, setSort] = useState<FlowSort>('recent')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const list = useMemo(() => visibleFlows(flows, { period, sort, query, today }), [flows, period, sort, query, today])
  const widen = widenOffer(flows, period, query, list.length, today)
  const selected = list.find((flow) => flow.id === picked) ?? list[0] ?? null

  const syncEdges = useCallback(() => {
    if (!scroller) return
    const start = scroller.scrollLeft <= EDGE_SLACK
    const end = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - EDGE_SLACK
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [scroller])

  useEffect(() => {
    if (!scroller) return
    syncEdges()
    const observer = new ResizeObserver(syncEdges)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [scroller, syncEdges, list, widen])

  const toStart = () => {
    if (scroller) scroller.scrollLeft = 0
  }
  const pickSort = (next: FlowSort) => {
    setSort(next)
    toStart()
  }
  const changeQuery = (next: string) => {
    setQuery(next)
    toStart()
  }
  const scrollBy = (dir: 1 | -1) => {
    if (!scroller || (dir < 0 ? edges.start : edges.end)) return
    const step = Math.max(CARD_STEP, Math.floor(scroller.clientWidth / CARD_STEP) * CARD_STEP)
    scroller.scrollBy({ left: dir * step, behavior: motionAllowed() ? 'smooth' : 'auto' })
  }

  const widenButton = widen && (
    <Button onClick={() => setPeriod(widen.next)} className="fg-sfl__widen">
      {widen.label}
    </Button>
  )

  return (
    <>
      <section className="fg-section fg-sfl" aria-labelledby="fg-sfl-title">
        <div className="fg-sfl__head">
          <div className="fg-sev__titles">
            <span className="fg-sev__title">
              <h2 id="fg-sfl-title" className="fg-section__title">
                이 종목이 나온 이슈 흐름
              </h2>
              <MockBadge />
            </span>
            <p className="fg-section__sub">이어진 이슈끼리 묶었어요. 흐름을 고르면 아래에 시간순으로 펼쳐요</p>
          </div>
          <div className="fg-sfl__tools">
            <Segment label="기간" options={FLOW_PERIODS} value={period} onChange={setPeriod} />
            <Segment label="정렬" options={FLOW_SORTS} value={sort} onChange={pickSort} />
            <label className="fg-sfl__search">
              <Search size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="fg-sr">흐름 찾기</span>
              <input type="search" placeholder="흐름 찾기" value={query} onChange={(e) => changeQuery(e.target.value)} />
            </label>
          </div>
        </div>
        {flows.length === 0 ? (
          <StateBlock kind="empty" title="아직 이 종목이 나온 이슈 흐름이 없어요" description="이슈가 묶이면 여기에 보여 드려요" />
        ) : (
          <>
            <div className="fg-sfl__bar">
              <span className="fg-sfl__cap fg-num" aria-live="polite">
                {flowCaption(list.length, period, sort, query)}
              </span>
              {list.length > 0 && (
                <div className="fg-sfl__nav">
                  <button type="button" aria-label="이전 흐름" aria-disabled={edges.start} onClick={() => scrollBy(-1)}>
                    <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="다음 흐름" aria-disabled={edges.end} onClick={() => scrollBy(1)}>
                    <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            {list.length > 0 ? (
              <div className="fg-sfl__scroll" ref={setScroller} onScroll={syncEdges} role="group" aria-label="이슈 흐름 목록">
                {list.map((flow) => (
                  <FlowCard
                    key={flow.id}
                    flow={flow}
                    today={today}
                    pressed={flow.id === selected?.id}
                    onPick={() => setPicked(flow.id)}
                  />
                ))}
                {widen && (
                  <div className="fg-sfl__more">
                    <span>{widen.text}</span>
                    {widenButton}
                  </div>
                )}
              </div>
            ) : (
              <div className="fg-sfl__empty">
                <b>찾는 흐름이 없어요</b>
                <span>검색어를 바꾸거나 기간을 늘려 보세요</span>
                {widenButton}
              </div>
            )}
          </>
        )}
      </section>
      {selected && (
        <FlowDetail flow={selected} stockName={stockName} candles={candles} today={today} onOpenIssue={onOpenIssue} />
      )}
    </>
  )
}
