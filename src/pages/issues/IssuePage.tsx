import { ChevronLeft } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/fg/Button'
import { IssueArticlesTab } from '@/components/fg/IssueArticlesTab'
import { IssueHead } from '@/components/fg/IssueHead'
import { IssueStocksTab } from '@/components/fg/IssueStocksTab'
import { IssueSummaryTab } from '@/components/fg/IssueSummaryTab'
import { IssueTimelineTab } from '@/components/fg/IssueTimelineTab'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { NewsDetailModal } from '@/components/news/NewsDetailModal'
import { kstToday } from '@/lib/calendar'
import { hubSearch } from '@/lib/fg/hub'
import { parseIssueTab, type IssueHead as IssueHeadModel } from '@/lib/fg/issuePage'
import { findIssue, resolveIssueId, type IssueBook, type IssueLink } from '@/lib/fg/issueRecords'
import { liveSubject, mockSubject, subjectHead, type IssueSubject } from '@/lib/fg/issueSubject'
import { issuePath } from '@/lib/fg/paths'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useBackTarget } from '@/lib/navigation'
import { isIssueApiId, useIssueDetail, useIssueQuotes } from '@/lib/queries/useIssue'
import { useIssueLinks } from '@/lib/queries/useLinkedCompanies'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { useGap, type GapState } from '@/lib/useGap'

const loadBook = import.meta.env.DEV ? () => import('@/dev/fixtures/issues').then((m) => m.issueBookFixture) : null

const HEADER_SELECTOR = '.fg-gh'

export default function IssuePage() {
  const { issueId } = useParams()
  const gap = useGap('issues', loadBook)
  const id = issueId ?? ''
  return <IssueView key={id} id={id} gap={gap} />
}

function withLinkCount(head: IssueHeadModel, links: readonly IssueLink[] | null): IssueHeadModel {
  if (!links || links.length === 0) return head
  return { ...head, counts: { ...head.counts, stocks: head.counts.stocks + links.length } }
}

function NotFound() {
  return (
    <section className="fg-section">
      <h1 className="fg-sr">이슈</h1>
      <StateBlock
        kind="empty"
        title="이 이슈를 찾지 못했어요"
        description="주소가 바뀌었거나 없는 이슈예요"
        action={
          <ButtonLink to="/" size="sm">
            홈으로 가기
          </ButtonLink>
        }
      />
    </section>
  )
}

function Loading() {
  return (
    <>
      <Skeleton height={176} shape="card" />
      <div className="fg-grid" aria-hidden="true">
        <div className="fg-col">
          <Skeleton height={320} shape="card" />
          <Skeleton height={200} shape="card" />
        </div>
        <div className="fg-rail">
          <Skeleton height={360} shape="card" />
        </div>
      </div>
    </>
  )
}

function IssueView({ id, gap }: { id: string; gap: GapState<IssueBook> }) {
  const { search, hash, state } = useLocation()
  const tab = parseIssueTab(search)
  const back = useBackTarget({ to: `/${hubSearch('', 'issues', isIssueApiId(id) ? id : null)}`, label: '뜨는 이슈' })
  const [tabsEl, setTabsEl] = useState<HTMLElement | null>(null)
  const shownTab = useRef(tab)
  const [today] = useState(() => kstToday(new Date()))
  const [openNewsId, setOpenNewsId] = useState<string | null>(null)
  const newsTrigger = useRef<HTMLElement | null>(null)

  const book = gap.status === 'mock' ? gap.data : null
  const resolved = book ? resolveIssueId(book, id) : null
  const record = book && resolved ? findIssue(book, resolved) : null
  const live = gap.status === 'not-ready' || (book !== null && record === null && isIssueApiId(id))
  const detail = useIssueDetail(live ? id : null)
  const { quotes, retry: retryQuotes } = useIssueQuotes(live && detail.data !== null)
  const market = useThemeMarket()
  const basisDate = market.data?.baseDate ?? null
  const skeleton = useDelayed(gap.status === 'loading' || (live && detail.loading))

  const subject = useMemo<IssueSubject | null>(() => {
    if (book && record) return mockSubject(record, book)
    if (live && detail.data) return liveSubject(detail.data, quotes, today, basisDate)
    return null
  }, [book, record, live, detail.data, quotes, today, basisDate])
  const linked = useIssueLinks(subject?.kind === 'live' ? subject.stocks : null, basisDate)

  useLayoutEffect(() => {
    if (shownTab.current === tab) return
    shownTab.current = tab
    if (!tabsEl) return
    const header = document.querySelector<HTMLElement>(HEADER_SELECTOR)?.offsetHeight ?? 0
    const top = tabsEl.getBoundingClientRect().top
    if (top >= header) return
    window.scrollTo({ top: top + window.scrollY - header })
  }, [tab, tabsEl])

  if (book && resolved && resolved !== id) {
    return <Navigate to={{ pathname: issuePath(resolved), search, hash }} state={state} replace />
  }

  const openNews = (newsId: string) => {
    newsTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpenNewsId(newsId)
  }

  let body: ReactNode = null
  if (subject) {
    let panel: ReactNode
    const onRetryQuotes = subject.kind === 'live' ? retryQuotes : null
    const issueLinks = subject.kind === 'live' ? linked : null
    if (tab === 'timeline') panel = <IssueTimelineTab issue={subject} onOpenNews={openNews} onRetryQuotes={onRetryQuotes} />
    else if (tab === 'articles') panel = <IssueArticlesTab issue={subject} onOpenNews={openNews} />
    else if (tab === 'stocks')
      panel = <IssueStocksTab issue={subject} linked={issueLinks} onOpenNews={openNews} onRetryQuotes={onRetryQuotes} />
    else panel = <IssueSummaryTab issue={subject} linked={issueLinks} onOpenNews={openNews} onRetryQuotes={onRetryQuotes} />
    body = (
      <>
        <IssueHead
          title={subject.title}
          head={withLinkCount(subjectHead(subject), issueLinks?.links ?? null)}
          tab={tab}
          mock={subject.kind === 'mock'}
          tabsRef={setTabsEl}
        />
        <div className="fg-isp__panel">{panel}</div>
      </>
    )
  } else if (gap.status === 'loading' || (live && detail.loading)) {
    body = skeleton ? <Loading /> : null
  } else if (live && detail.error && !detail.error.isNotFound && detail.error.code !== 'INVALID_PARAMETER') {
    body = (
      <section className="fg-section">
        <h1 className="fg-sr">이슈</h1>
        <StateBlock
          kind="error"
          title="이슈를 불러오지 못했어요"
          description="잠시 뒤 다시 시도해 주세요"
          action={
            <Button size="sm" onClick={detail.retry}>
              다시 시도
            </Button>
          }
        />
      </section>
    )
  } else {
    body = <NotFound />
  }

  return (
    <div className="fg-main fg-wrap fg-isp">
      <Link to={back.to} className="fg-tdp__back">
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        {back.label}
      </Link>
      {body}
      <NewsDetailModal
        newsId={openNewsId}
        onOpenChange={(open) => !open && setOpenNewsId(null)}
        returnFocusRef={newsTrigger}
      />
    </div>
  )
}
