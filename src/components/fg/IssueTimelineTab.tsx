import { ChevronRight, ExternalLink } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { ChangeText } from '@/components/fg/PriceChange'
import { QuoteRetryNote } from '@/components/fg/RetryText'
import { Segment } from '@/components/fg/SegmentedTabs'
import { connectedCount, type IssueSubject } from '@/lib/fg/issueSubject'
import {
  liveTimeline,
  mockTimeline,
  stocksLine,
  TIMELINE_ORDERS,
  type FrequentStock,
  type TimelineNode,
  type TimelineOrder,
} from '@/lib/fg/issueTimeline'
import { issuePath, stockPath } from '@/lib/fg/paths'
import { navState } from '@/lib/fg/stockDetail'
import { useIssueTabTarget } from '@/lib/fg/useIssueTab'
import { fromState } from '@/lib/navigation'
import { useArticleCompanies } from '@/lib/queries/useIssue'

function ArticleStocks({ newsId }: { newsId: string }) {
  const { data } = useArticleCompanies(newsId)
  const line = data ? stocksLine([...new Set(data.map((c) => c.companyName))]) : null
  if (!line) return null
  return <span className="fg-itl__stocks">{`뉴스에 나온 종목 · ${line}`}</span>
}

interface NodeProps {
  node: TimelineNode
  summaryLabel: string
  expanded: boolean
  onToggle: () => void
  onOpenNews: (id: string) => void
}

function TimelineItem({ node, summaryLabel, expanded, onToggle, onOpenNews }: NodeProps) {
  const { state } = useLocation()
  const { target } = node
  let title: ReactNode = <span className="fg-itl__title">{node.title}</span>
  if (target?.kind === 'issue') {
    title = (
      <Link to={issuePath(target.id)} state={navState(state)} className="fg-itl__title fg-itl__link">
        {node.title}
      </Link>
    )
  } else if (target?.kind === 'news') {
    title = (
      <button type="button" className="fg-itl__title fg-itl__link" onClick={() => onOpenNews(target.id)}>
        {node.title}
      </button>
    )
  } else if (target?.kind === 'url') {
    title = (
      <a className="fg-itl__title fg-itl__link" href={target.url} target="_blank" rel="noopener noreferrer">
        {node.title}
        <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" className="fg-itl__ext" />
      </a>
    )
  }
  const moreId = `fg-itl-more-${node.key}`
  const hasMore = node.summary !== null || node.stocks !== null || node.newsId !== null
  return (
    <li className="fg-itl__node" data-now={node.now || undefined} aria-current={node.now ? 'step' : undefined}>
      <span className="fg-itl__dot" aria-hidden="true" />
      <div className="fg-itl__body">
        <span className="fg-itl__meta fg-num">
          <span className="fg-itl__date">{node.date}</span>
          {node.badge && <Badge tone="issue">{node.badge}</Badge>}
          <span>{node.meta}</span>
        </span>
        {title}
        {node.cov && (
          <span className="fg-cov fg-num">
            <span className="fg-cov__bar" aria-hidden="true">
              <span className="fg-cov__fill" style={{ width: `${node.cov.pct}%` }} />
            </span>
            <span className="fg-cov__txt">{`${node.cov.media}개 매체`}</span>
          </span>
        )}
        {hasMore && (
          <div id={moreId} className="fg-itl__more" hidden={!expanded}>
            {expanded && node.summary && (
              <p className="fg-itl__sum">
                <Badge>{summaryLabel}</Badge>
                {node.summary}
              </p>
            )}
            {expanded && node.stocks && <span className="fg-itl__stocks">{`뉴스에 나온 종목 · ${node.stocks}`}</span>}
            {expanded && node.newsId && <ArticleStocks newsId={node.newsId} />}
          </div>
        )}
        {hasMore && !node.now && (
          <button
            type="button"
            className="fg-itl__toggle"
            aria-expanded={expanded}
            aria-controls={moreId}
            aria-label={`${node.title} ${expanded ? '요약 접기' : '요약 보기'}`}
            onClick={onToggle}
          >
            <span>{expanded ? '요약 접기' : '요약 보기'}</span>
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}

function FrequentRow({ stock }: { stock: FrequentStock }) {
  const { pathname, search } = useLocation()
  const body = (
    <>
      <span className="fg-itl__who">
        <CompanyLogo name={stock.name} size={24} />
        <span className="fg-itl__name">
          <b>{stock.name}</b>
          <small>{stock.label}</small>
        </span>
      </span>
      {stock.change === null ? (
        <span className="fg-itl__chg fg-num">—</span>
      ) : (
        <ChangeText value={stock.change} className="fg-itl__chg" />
      )}
    </>
  )
  if (!stock.ticker) return <div className="fg-itl__srow">{body}</div>
  return (
    <Link to={stockPath(stock.ticker)} state={fromState(`${pathname}${search}`)} className="fg-itl__srow fg-itl__slink">
      {body}
    </Link>
  )
}

interface IssueTimelineTabProps {
  issue: IssueSubject
  onOpenNews: (id: string) => void
  onRetryQuotes: (() => void) | null
}

export function IssueTimelineTab({ issue, onOpenNews, onRetryQuotes }: IssueTimelineTabProps) {
  const tabTarget = useIssueTabTarget()
  const [order, setOrder] = useState<TimelineOrder>('new')
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())
  const model = issue.kind === 'mock' ? mockTimeline(issue.record, issue.book, order) : liveTimeline(issue, order)
  const connected = connectedCount(issue)
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  return (
    <div className="fg-grid fg-itl">
      <div className="fg-col">
        <section className="fg-section" aria-labelledby="fg-itl-title">
          <div className="fg-section__head fg-itl__head">
            <div className="fg-iflow__titles">
              <h2 id="fg-itl-title" className="fg-section__title">
                {model.heading}
              </h2>
              <p className="fg-section__sub">{model.subtitle}</p>
            </div>
            {model.nodes.length > 1 && (
              <Segment label="정렬" options={TIMELINE_ORDERS} value={order} onChange={setOrder} />
            )}
          </div>
          <ol className="fg-itl__list" aria-label={model.listLabel}>
            {model.nodes.map((node) => (
              <TimelineItem
                key={node.key}
                node={node}
                summaryLabel={model.summaryLabel}
                expanded={node.now || open.has(node.key)}
                onToggle={() => toggle(node.key)}
                onOpenNews={onOpenNews}
              />
            ))}
          </ol>
          <p className="fg-itl__cap">{model.footnote}</p>
        </section>
      </div>
      <aside className="fg-rail fg-isp__rail" aria-label={model.glanceTitle}>
        <section className="fg-section" aria-labelledby="fg-itl-glance">
          <h2 id="fg-itl-glance" className="fg-section__title">
            {model.glanceTitle}
          </h2>
          <dl className="fg-itl__stats">
            {model.glance.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd className="fg-num">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className="fg-itl__note">{model.glanceNote}</p>
        </section>
        <section className="fg-section fg-itl__freq" aria-labelledby="fg-itl-freq">
          <div className="fg-iflow__titles">
            <h2 id="fg-itl-freq" className="fg-section__title">
              {model.frequentTitle}
            </h2>
            <p className="fg-itl__note">{model.frequentNote}</p>
          </div>
          {model.frequent.length > 0 ? (
            <ul className="fg-itl__slist">
              {model.frequent.map((stock) => (
                <li key={stock.name}>
                  <FrequentRow stock={stock} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="fg-irail__empty">이 이슈에 나온 종목이 없어요</p>
          )}
          {onRetryQuotes && model.frequent.length > 0 && <QuoteRetryNote onRetry={onRetryQuotes} />}
          {connected > 0 && (
            <ButtonLink {...tabTarget('stocks')} className="fg-irail__all">
              {`연결된 종목 ${connected} 모두 보기`}
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </ButtonLink>
          )}
        </section>
        <Disclaimer />
      </aside>
    </div>
  )
}
