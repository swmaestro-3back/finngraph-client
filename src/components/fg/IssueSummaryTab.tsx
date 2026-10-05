import { ChevronRight, Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { IssueGraph } from '@/components/fg/IssueGraph'
import { MemberGate } from '@/components/fg/MemberGate'
import { ChangeText } from '@/components/fg/PriceChange'
import { QuoteRetryNote } from '@/components/fg/RetryText'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockChip } from '@/components/fg/StockChip'
import { formatChange } from '@/lib/format'
import { formatGapPct, marketLabel, toneClass } from '@/lib/fg/format'
import {
  graphSentence,
  issueFlow,
  issueGraph,
  issueRail,
  summaryCaption,
  type IssueFlowModel,
} from '@/lib/fg/issuePage'
import type { IssueBook, IssueRecord, IssueStock } from '@/lib/fg/issueRecords'
import { connectedCount, representativeCaption, type IssueSubject, type LiveIssue } from '@/lib/fg/issueSubject'
import { issuePath } from '@/lib/fg/paths'
import { navState, STRENGTH_LABEL } from '@/lib/fg/stockDetail'
import { useIssueTabTarget } from '@/lib/fg/useIssueTab'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const NARROW = '(max-width: 767px)'
const LIVE_GAPS_NOTE = '핵심 포인트·이어진 흐름·관계 그래프·이어진 기업은 준비 중이에요'

function SummaryCard({ record }: { record: IssueRecord }) {
  const tabTarget = useIssueTabTarget()
  return (
    <section className="fg-section fg-isum" aria-labelledby="fg-isum-title">
      <div className="fg-isum__meta fg-num">
        <Badge strong>AI 요약</Badge>
        <span>{summaryCaption(record)}</span>
      </div>
      <h2 id="fg-isum-title" className="fg-sr">
        요약
      </h2>
      <p className="fg-isum__text">{record.detail}</p>
      {record.points.length > 0 && (
        <div className="fg-isum__points">
          <h3 className="fg-isum__ptitle">핵심 포인트</h3>
          <ul className="fg-isum__list">
            {record.points.map((point) => (
              <li key={point.label}>
                <b>{point.label}</b>
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
      <div className="fg-isum__meta fg-num">
        <Badge strong>대표 기사 요약</Badge>
        <span>{representativeCaption(issue)}</span>
      </div>
      <h2 id="fg-isum-title" className="fg-sr">
        요약
      </h2>
      {issue.detail.summary ? (
        <p className="fg-isum__text">{issue.detail.summary}</p>
      ) : (
        <p className="fg-isum__empty">대표 기사에 아직 요약이 없어요</p>
      )}
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

function SoonNote() {
  return (
    <p className="fg-isp__soon">
      <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>{LIVE_GAPS_NOTE}</span>
    </p>
  )
}

function FlowSteps({ flow }: { flow: IssueFlowModel }) {
  const { state } = useLocation()
  const single = flow.steps.length === 1
  return (
    <ol
      className="fg-tlh fg-iflow__steps"
      data-single={single || undefined}
      style={{ gridTemplateColumns: `repeat(${flow.steps.length}, minmax(0, 1fr))` }}
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

function FlowCard({ record, book, narrow }: { record: IssueRecord; book: IssueBook; narrow: boolean }) {
  const tabTarget = useIssueTabTarget()
  const flow = issueFlow(record, book)
  const more = (
    <>
      타임라인 전체 보기
      <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
    </>
  )
  return (
    <section className="fg-section fg-iflow" aria-labelledby="fg-iflow-title">
      <div className="fg-iflow__head">
        <div className="fg-iflow__titles">
          <h2 id="fg-iflow-title" className="fg-section__title">
            이어진 흐름
          </h2>
          <p className="fg-section__sub">{narrow ? flow.subtitleShort : flow.subtitle}</p>
        </div>
        {!narrow && (
          <Link {...tabTarget('timeline')} className="fg-sdmore">
            {more}
          </Link>
        )}
      </div>
      {narrow ? <FlowList flow={flow} /> : <FlowSteps flow={flow} />}
      {narrow && (
        <ButtonLink {...tabTarget('timeline')} className="fg-iflow__all">
          {more}
        </ButtonLink>
      )}
    </section>
  )
}

function GraphCard({ record, narrow }: { record: IssueRecord; narrow: boolean }) {
  const { locked } = useMemberGate()
  const graph = issueGraph(record)
  const go = (
    <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
  )
  return (
    <section className="fg-section fg-igr" aria-labelledby="fg-igr-title">
      <div className="fg-iflow__head">
        <div className="fg-iflow__titles">
          <h2 id="fg-igr-title" className="fg-section__title">
            관계 그래프
          </h2>
          <p className="fg-section__sub">
            {narrow
              ? graphSentence(record.stocks.length, record.links.length)
              : '이 이슈에서 뉴스에 나온 종목을 거쳐 이어진 기업을 한눈에 봐요'}
          </p>
        </div>
        {!narrow && (
          <ButtonLink to="/graph" className="fg-igr__go">
            관계 탐색에서 크게 보기
            {go}
          </ButtonLink>
        )}
      </div>
      {!narrow &&
        (graph ? (
          <IssueGraph graph={graph} locked={locked} />
        ) : (
          <StateBlock
            kind="empty"
            title="그릴 관계가 아직 없어요"
            description="시장 전체를 다룬 이슈라 뉴스에 나온 종목이 없어요"
          />
        ))}
      {narrow && (
        <ButtonLink to="/graph" className="fg-iflow__all">
          관계 탐색에서 보기
          {go}
        </ButtonLink>
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

function InferredRail({ record }: { record: IssueRecord }) {
  const tabTarget = useIssueTabTarget()
  const { locked } = useMemberGate()
  const rail = issueRail({ stocks: record.stocks, links: record.links })
  let inferred: ReactNode
  if (rail.inferred === 0) inferred = <p className="fg-irail__empty">아직 이어진 기업이 없어요</p>
  else if (locked) inferred = <MemberGate subject={`이런 기업 ${rail.inferred}곳`} variant="compact" className="fg-irail__gate" />
  return (
    <div className="fg-irail__inf">
      <span className="fg-slr__title">
        <span className="fg-irail__h">이런 기업은 어때요?</span>
        <Badge tone="inferred">AI 추론</Badge>
      </span>
      <span className="fg-slr__cap">뉴스엔 안 나왔지만 관계로 이어진 기업이에요</span>
      {inferred ?? (
        <div className="fg-slr__rows">
          {rail.top.map(({ company }) => (
            <Link key={company.id} {...tabTarget('stocks')} className="fg-slr__row fg-num">
              <span className="fg-slr__top">
                <span className="fg-slr__id">
                  <CompanyLogo name={company.name} size={24} />
                  <span className="fg-slr__name">{company.name}</span>
                  <span className="fg-slr__mkt">{marketLabel(company.market)}</span>
                </span>
                <span className={cn('fg-slr__chg', toneClass(company.change))}>{formatChange(company.change)}</span>
              </span>
              <span className="fg-slr__rel">{company.relation}</span>
              <span className="fg-slr__foot fg-irail__foot">
                <span>
                  52주 최고 대비 <b>{formatGapPct(company.gapFromHigh)}</b>
                </span>
                <span className="fg-strength">
                  근거 강도
                  {[1, 2, 3].map((bar) => (
                    <i key={bar} className={cn(bar <= company.strength && 'on')} aria-hidden="true" />
                  ))}
                  <b>{STRENGTH_LABEL[company.strength]}</b>
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StocksRail({ issue, onRetryQuotes }: { issue: IssueSubject; onRetryQuotes: (() => void) | null }) {
  const tabTarget = useIssueTabTarget()
  const rail = issueRail({ stocks: issue.stocks, links: issue.kind === 'mock' ? issue.record.links : [] })
  const connected = connectedCount(issue)
  return (
    <section className="fg-section fg-irail" aria-labelledby="fg-irail-title">
      <h2 id="fg-irail-title" className="fg-section__title">
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
      {issue.kind === 'mock' && <InferredRail record={issue.record} />}
      {connected > 0 && (
        <ButtonLink {...tabTarget('stocks')} className="fg-irail__all">
          {`연결된 종목 ${connected} 모두 보기`}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </ButtonLink>
      )}
    </section>
  )
}

interface IssueSummaryTabProps {
  issue: IssueSubject
  onOpenNews: (id: string) => void
  onRetryQuotes: (() => void) | null
}

export function IssueSummaryTab({ issue, onOpenNews, onRetryQuotes }: IssueSummaryTabProps) {
  const narrow = useMediaQuery(NARROW)
  return (
    <div className="fg-grid fg-iss">
      <div className="fg-col">
        {issue.kind === 'mock' ? (
          <>
            <SummaryCard record={issue.record} />
            <FlowCard record={issue.record} book={issue.book} narrow={narrow} />
            <GraphCard record={issue.record} narrow={narrow} />
          </>
        ) : (
          <LiveSummaryCard issue={issue} onOpenNews={onOpenNews} />
        )}
      </div>
      <aside className="fg-rail fg-iss__rail" aria-label="이 이슈와 연결된 종목">
        <StocksRail issue={issue} onRetryQuotes={onRetryQuotes} />
        {issue.kind === 'live' && <SoonNote />}
        <Disclaimer />
      </aside>
    </div>
  )
}
