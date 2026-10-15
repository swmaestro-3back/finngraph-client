import { ChevronRight } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { EvidenceSheet } from '@/components/fg/EvidenceSheet'
import { IssueTreeGraph } from '@/components/fg/IssueTreeGraph'
import { MemberGate } from '@/components/fg/MemberGate'
import { ChangeText } from '@/components/fg/PriceChange'
import { QuoteRetryNote, RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockChip } from '@/components/fg/StockChip'
import { LinkedRailRow } from '@/components/fg/StockLinkedRail'
import type { IssueTimelineRes } from '@/lib/apiTypes'
import { graphSentence, issueFlow, issueGraph, issueRail, summaryCaption, type IssueFlowModel } from '@/lib/fg/issuePage'
import { summaryPointItems, type IssueLink, type IssuePoint, type IssueRecord, type IssueStock } from '@/lib/fg/issueRecords'
import {
  connectedCount,
  connectedLabel,
  isMarketReaction,
  MARKET_REACTION_NOTE,
  representativeCaption,
  type IssueSubject,
  type LiveIssue,
} from '@/lib/fg/issueSubject'
import { storyFlow } from '@/lib/fg/issueTimeline'
import { issuePath } from '@/lib/fg/paths'
import { navState } from '@/lib/fg/stockDetail'
import type { LinkedCompany } from '@/lib/fg/stockLinks'
import { useFavoriteToggles } from '@/lib/fg/useFavoriteToggle'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useIssueTabTarget } from '@/lib/fg/useIssueTab'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import type { KeyedState } from '@/lib/queries/useKeyed'
import { useEvidenceView, type IssueLinksState } from '@/lib/queries/useLinkedCompanies'
import { cn } from '@/lib/utils'

const NARROW = '(max-width: 767px)'
const NO_RETRY = () => undefined

function PointList({ points }: { points: readonly IssuePoint[] }) {
  if (points.length === 0) return null
  return (
    <div className="fg-isum__points">
      <h3 className="fg-isum__ptitle">핵심 포인트</h3>
      <ul className="fg-isum__list">
        {points.map((point) => (
          <li key={point.label}>
            <b>{point.label}</b>
            <span>{point.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SummaryCard({ record }: { record: IssueRecord }) {
  const tabTarget = useIssueTabTarget()
  return (
    <section className="fg-section fg-isum" aria-labelledby="fg-isum-title">
      <div className="fg-section__head">
        <h2 id="fg-isum-title" className="fg-section__title fg-section__title--issue">
          요약
        </h2>
        <Badge>요약</Badge>
      </div>
      <p className="fg-isum__text">{record.detail}</p>
      <PointList points={record.points} />
      <p className="fg-isum__src fg-num">{summaryCaption(record)}</p>
      <Link {...tabTarget('articles')} className="fg-sdmore fg-isum__more">
        {`기사 ${record.articles}건 보기`}
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </section>
  )
}

function LiveSummaryCard({ issue, onOpenNews }: { issue: LiveIssue; onOpenNews: (id: string) => void }) {
  const tabTarget = useIssueTabTarget()
  const rep = issue.representative
  const go = <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
  let repLink = null
  if (rep?.analyzed) {
    repLink = (
      <button type="button" className="fg-sdmore" onClick={() => onOpenNews(rep.id)}>
        대표 기사 보기
        {go}
      </button>
    )
  } else if (rep?.url) {
    repLink = (
      <a className="fg-sdmore" href={rep.url} target="_blank" rel="noopener noreferrer">
        대표 기사 원문 보기
        {go}
      </a>
    )
  }
  return (
    <section className="fg-section fg-isum" aria-labelledby="fg-isum-title">
      <div className="fg-section__head">
        <h2 id="fg-isum-title" className="fg-section__title fg-section__title--issue">
          요약
        </h2>
        <Badge>대표 기사 요약</Badge>
      </div>
      {issue.detail.summary ? (
        <p className="fg-isum__text">{issue.detail.summary}</p>
      ) : (
        <p className="fg-isum__empty">대표 기사에 아직 요약이 없어요</p>
      )}
      <PointList points={summaryPointItems(issue.detail.summaryPoints)} />
      <p className="fg-isum__src fg-num">{representativeCaption(issue)}</p>
      <div className="fg-isum__links">
        {repLink}
        <Link {...tabTarget('articles')} className="fg-sdmore">
          {`기사 ${issue.articleCount}건 보기`}
          {go}
        </Link>
      </div>
    </section>
  )
}

function FlowSteps({ flow }: { flow: IssueFlowModel }) {
  const { state } = useLocation()
  const single = flow.steps.length === 1
  return (
    <ol
      className="fg-tlh fg-iflow__steps"
      data-single={single || undefined}
      style={{ gridTemplateColumns: `repeat(${flow.steps.length}, minmax(0, 1fr))`, '--fg-steps': flow.steps.length } as CSSProperties}
      aria-label="이슈 타임라인, 오래된 순"
    >
      {flow.steps.map((step) => (
        <li
          key={step.id}
          className={cn('fg-tlh__step', step.now && 'fg-tlh__step--now')}
          aria-current={step.now ? 'step' : undefined}
        >
          <span className="fg-tlh__dot" aria-hidden="true">
            {step.now && <span className="fg-iflow__pulse" />}
          </span>
          <span className="fg-tlh__date">{step.date}</span>
          {step.now ? (
            <span className="fg-tlh__title">{step.title}</span>
          ) : (
            <Link to={issuePath(step.id)} state={navState(state)} className="fg-tlh__title fg-iflow__link">
              {step.title}
            </Link>
          )}
          <span className="fg-iflow__cov fg-num">
            <span className="fg-iflow__bar" aria-hidden="true">
              <i style={{ width: `${step.pct}%` }} />
            </span>
            {`${step.media}개 매체`}
          </span>
          {single && <Badge className="fg-iflow__new">새 이슈</Badge>}
        </li>
      ))}
    </ol>
  )
}

function FlowList({ flow }: { flow: IssueFlowModel }) {
  const { state } = useLocation()
  return (
    <ol className="fg-iflow__mtl" aria-label="이슈 타임라인, 최신순">
      {[...flow.steps].reverse().map((step) => (
        <li key={step.id} data-now={step.now || undefined} aria-current={step.now ? 'step' : undefined}>
          <span className="fg-iflow__mdate fg-num">{step.date}</span>
          {step.now ? (
            <span className="fg-iflow__mtitle">{step.title}</span>
          ) : (
            <Link to={issuePath(step.id)} state={navState(state)} className="fg-iflow__mtitle fg-iflow__mlink">
              {step.title}
            </Link>
          )}
          <span className="fg-iflow__mcov fg-num">{`${step.media}개 매체`}</span>
        </li>
      ))}
    </ol>
  )
}

function FlowHead({ withLink }: { withLink: boolean }) {
  const tabTarget = useIssueTabTarget()
  return (
    <div className="fg-section__head">
      <h2 id="fg-iflow-title" className="fg-section__title fg-section__title--issue">
        이어진 흐름
      </h2>
      {withLink && (
        <Link {...tabTarget('timeline')} className="fg-sdmore">
          타임라인 전체 보기
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

function FlowCard({ flow, narrow }: { flow: IssueFlowModel; narrow: boolean }) {
  return (
    <section className="fg-section fg-iflow" aria-labelledby="fg-iflow-title">
      <FlowHead withLink />
      <p className="fg-isp__lead">{narrow ? flow.subtitleShort : flow.subtitle}</p>
      {narrow ? <FlowList flow={flow} /> : <FlowSteps flow={flow} />}
    </section>
  )
}

interface LiveFlowCardProps {
  issue: LiveIssue
  story: KeyedState<IssueTimelineRes> | null
  narrow: boolean
}

function LiveFlowCard({ issue, story, narrow }: LiveFlowCardProps) {
  const reaction = isMarketReaction(issue)
  const skeleton = useDelayed(!reaction && story !== null && story.data === null && story.error === null)
  if (reaction) {
    return (
      <section className="fg-section fg-iflow" aria-labelledby="fg-iflow-title">
        <FlowHead withLink={false} />
        <p className="fg-isp__lead">{MARKET_REACTION_NOTE}</p>
      </section>
    )
  }
  if (story === null) return null
  if (story.data) return <FlowCard flow={storyFlow(issue, story.data)} narrow={narrow} />
  return (
    <section className="fg-section fg-iflow" aria-labelledby="fg-iflow-title">
      <FlowHead withLink />
      {story.error ? (
        <StateBlock
          kind="error"
          title="이어진 흐름을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요"
          action={
            <Button size="sm" onClick={story.retry}>
              다시 시도
            </Button>
          }
        />
      ) : (
        skeleton && <Skeleton height={narrow ? 160 : 120} />
      )}
    </section>
  )
}

interface IssueGraphSource {
  id: string
  title: string
  articles: number
  firstAt: string | null
  lastAt: string | null
  stocks: readonly IssueStock[]
  links: readonly IssueLink[] | null
}

interface GraphCardProps {
  source: IssueGraphSource
  live: boolean
  today: string
  error: boolean
  onRetry: () => void
  emptyNote: string
  narrow: boolean
}

function GraphCard({ source, live, today, error, onRetry, emptyNote, narrow }: GraphCardProps) {
  const { locked, pending } = useMemberGate()
  const { stocks, links } = source
  const ready = links !== null && !pending
  const skeleton = useDelayed(!ready && !(links === null && error))
  const graph = useMemo(
    () => (ready && !narrow ? issueGraph({ flowTitle: source.title, stocks: source.stocks, links: source.links ?? [] }) : null),
    [ready, narrow, source],
  )
  const favorites = useFavoriteToggles('STOCK')
  const [sheet, setSheet] = useState<IssueLink | null>(null)
  const [watched, setWatched] = useState<Record<string, boolean>>({})
  const trigger = useRef<HTMLElement | null>(null)
  const evidence = useEvidenceView(live ? (sheet?.company ?? null) : null, today)
  const openLink = useCallback((link: IssueLink) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSheet(link)
  }, [])
  const watchedOf = (company: LinkedCompany): boolean | null => {
    if (!live) return watched[company.id] === true
    return company.code ? favorites.isActive(company.code) : null
  }
  const toggleWatch = (company: LinkedCompany) => {
    if (!live) setWatched((prev) => ({ ...prev, [company.id]: !prev[company.id] }))
    else if (company.code) favorites.press(company.code)
  }

  let body: ReactNode = null
  if (links === null && error) {
    body = (
      <StateBlock
        kind="error"
        title="관계 그래프를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (!ready) {
    body = skeleton ? <Skeleton height={narrow ? 40 : 'var(--fg-igraph-h)'} /> : null
  } else if (!narrow) {
    body = graph ? (
      <IssueTreeGraph graph={graph} locked={locked} links={links ?? []} onOpenLink={openLink} />
    ) : (
      <StateBlock kind="empty" title="그릴 관계가 아직 없어요" description={emptyNote} />
    )
  }
  let sub: string | null = '이 이슈에서 뉴스에 나온 종목을 거쳐 이어진 기업을 한눈에 봐요'
  if (narrow) sub = links !== null ? graphSentence(stocks.length, links.length) : null
  return (
    <section className="fg-section fg-igr" aria-labelledby="fg-igr-title">
      <div className="fg-section__head">
        <h2 id="fg-igr-title" className="fg-section__title fg-section__title--issue">
          관계 그래프
        </h2>
        <Link to="/graph" className="fg-sdmore">
          {narrow ? '관계 탐색에서 보기' : '관계 탐색에서 크게 보기'}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
      {sub && <p className="fg-section__sub">{sub}</p>}
      {body}
      {!locked && links && (
        <EvidenceSheet
          stockName={sheet?.from ?? ''}
          lead={source.title}
          company={sheet?.company ?? null}
          evidence={evidence}
          watched={sheet ? watchedOf(sheet.company) : null}
          onToggleWatch={() => sheet && toggleWatch(sheet.company)}
          returnFocusRef={trigger}
          onClose={() => setSheet(null)}
        />
      )}
    </section>
  )
}

function IssueStockChip({ stock }: { stock: IssueStock }) {
  const { pathname, search } = useLocation()
  if (stock.ticker) {
    return (
      <StockChip
        ticker={stock.ticker}
        name={stock.name}
        change={stock.change}
        withLogo
        state={fromState(`${pathname}${search}`)}
      />
    )
  }
  return (
    <span className="fg-chip fg-irail__chip">
      <CompanyLogo name={stock.name} size={24} />
      {stock.name}
      {stock.change !== null && <ChangeText value={stock.change} className="fg-chg" />}
    </span>
  )
}

interface InferredRailProps {
  stocks: readonly IssueStock[]
  links: readonly IssueLink[] | null
  error: boolean
  onRetry: () => void
}

function InferredRail({ stocks, links, error, onRetry }: InferredRailProps) {
  const tabTarget = useIssueTabTarget()
  const { locked, pending } = useMemberGate()
  const rail = issueRail({ stocks, links: links ?? [] })
  let inferred: ReactNode
  if (links === null && error)
    inferred = (
      <p className="fg-irail__empty" role="status">
        <span>이어진 기업을 불러오지 못했어요</span>
        <RetryText subject="이어진 기업" onRetry={onRetry} />
      </p>
    )
  else if (links === null || pending) inferred = <Skeleton height={168} />
  else if (rail.inferred === 0) inferred = <p className="fg-irail__empty">아직 이어진 기업이 없어요</p>
  else if (locked) inferred = <MemberGate subject={`이런 기업 ${rail.inferred}곳`} variant="compact" className="fg-irail__gate" />
  return (
    <div className="fg-irail__inf">
      <span className="fg-slr__title">
        <span className="fg-irail__h">이런 기업은 어때요?</span>
      </span>
      <span className="fg-slr__cap">뉴스엔 안 나왔지만 관계로 이어진 기업이에요</span>
      {inferred ?? (
        <div className="fg-slr__rows">
          {rail.top.map(({ company }) => (
            <LinkedRailRow key={company.id} company={company} {...tabTarget('stocks')} footClassName="fg-irail__foot" />
          ))}
        </div>
      )}
    </div>
  )
}

interface StocksRailProps {
  issue: IssueSubject
  linked: IssueLinksState | null
  onRetryQuotes: (() => void) | null
}

function StocksRail({ issue, linked, onRetryQuotes }: StocksRailProps) {
  const tabTarget = useIssueTabTarget()
  const links = issue.kind === 'mock' ? issue.record.links : (linked?.links ?? null)
  const rail = issueRail({ stocks: issue.stocks, links: links ?? [] })
  const connected = connectedCount(issue, links)
  return (
    <section className="fg-section fg-irail" aria-labelledby="fg-irail-title">
      <h2 id="fg-irail-title" className="fg-section__title fg-section__title--issue">
        이 이슈와 연결된 종목
      </h2>
      <div className="fg-irail__news">
        <span className="fg-irail__label fg-num">
          <span>뉴스에 나온 종목</span>
          <span className="fg-irail__count">{`${rail.stocks.length}개`}</span>
        </span>
        {rail.stocks.length > 0 ? (
          <div className="fg-irail__chips fg-num">
            {rail.stocks.map((stock) => (
              <IssueStockChip key={stock.name} stock={stock} />
            ))}
            {rail.extra > 0 && (
              <Link
                {...tabTarget('stocks')}
                className="fg-chip fg-chip--more fg-irail__more"
                aria-label={`뉴스에 나온 종목 ${rail.extra}개 더 보기`}
              >
                {`+${rail.extra}`}
              </Link>
            )}
          </div>
        ) : (
          <p className="fg-irail__empty">
            {issue.kind === 'mock' ? '시장 전체를 다룬 이슈라 따로 나온 종목이 없어요' : '이 이슈 기사에 나온 상장 종목이 없어요'}
          </p>
        )}
        {onRetryQuotes && rail.stocks.length > 0 && <QuoteRetryNote onRetry={onRetryQuotes} />}
      </div>
      {(issue.kind === 'mock' || linked) && (
        <InferredRail
          stocks={issue.stocks}
          links={links}
          error={Boolean(linked?.error)}
          onRetry={linked?.retry ?? (() => undefined)}
        />
      )}
      {(connected === null ? rail.stocks.length > 0 : connected > 0) && (
        <Link {...tabTarget('stocks')} className="fg-sdmore fg-irail__all">
          {connectedLabel(connected)}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}

interface IssueSummaryTabProps {
  issue: IssueSubject
  story: KeyedState<IssueTimelineRes> | null
  linked: IssueLinksState | null
  onOpenNews: (id: string) => void
  onRetryQuotes: (() => void) | null
}

function graphSource(issue: IssueSubject, links: readonly IssueLink[] | null): IssueGraphSource {
  if (issue.kind === 'mock') {
    const { record } = issue
    return {
      id: record.id,
      title: record.flowTitle,
      articles: record.articles,
      firstAt: record.date,
      lastAt: record.date,
      stocks: record.stocks,
      links,
    }
  }
  return {
    id: issue.id,
    title: issue.title,
    articles: issue.articleCount,
    firstAt: issue.detail.firstPublishedAt,
    lastAt: issue.detail.lastPublishedAt,
    stocks: issue.stocks,
    links,
  }
}

export function IssueSummaryTab({ issue, story, linked, onOpenNews, onRetryQuotes }: IssueSummaryTabProps) {
  const narrow = useMediaQuery(NARROW)
  const links = issue.kind === 'mock' ? issue.record.links : (linked?.links ?? null)
  const source = useMemo(() => graphSource(issue, links), [issue, links])
  return (
    <div className="fg-grid fg-iss">
      <div className="fg-col">
        {issue.kind === 'mock' ? (
          <>
            <SummaryCard record={issue.record} />
            <FlowCard flow={issueFlow(issue.record, issue.book)} narrow={narrow} />
            <GraphCard
              source={source}
              live={false}
              today={issue.today}
              error={false}
              onRetry={NO_RETRY}
              emptyNote="시장 전체를 다룬 이슈라 뉴스에 나온 종목이 없어요"
              narrow={narrow}
            />
          </>
        ) : (
          <>
            <LiveSummaryCard issue={issue} onOpenNews={onOpenNews} />
            <LiveFlowCard issue={issue} story={story} narrow={narrow} />
            <GraphCard
              source={source}
              live
              today={issue.today}
              error={Boolean(linked?.error)}
              onRetry={linked?.retry ?? NO_RETRY}
              emptyNote="이 이슈 기사에 나온 상장 종목이 없어요"
              narrow={narrow}
            />
          </>
        )}
      </div>
      <aside className="fg-rail fg-iss__rail" aria-label="이 이슈와 연결된 종목">
        <StocksRail issue={issue} linked={linked} onRetryQuotes={onRetryQuotes} />
        <Disclaimer />
      </aside>
    </div>
  )
}
