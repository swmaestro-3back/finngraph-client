import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { FilterChip } from '@/components/fg/FilterChip'
import { GapValue } from '@/components/fg/Gap'
import { QuoteRetryNote, RetryText } from '@/components/fg/RetryText'
import { Segment } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockChip } from '@/components/fg/StockChip'
import type { IssueSort, IssueSummaryRes, ThemeRes } from '@/lib/apiTypes'
import { useFavorites } from '@/lib/favorites'
import { formatRelativeTime } from '@/lib/format'
import {
  ALL_FILTER,
  chipThemes,
  FEED_SORTS,
  FEED_STOCK_CHIPS,
  feedGroups,
  feedSortSearch,
  filterGroups,
  moreLabel,
  nextFeedRequest,
  parseFeedSort,
  resolveFilter,
  splitChips,
  timelineBadge,
  type FeedFilter,
} from '@/lib/fg/home'
import type { HubFixture, HubThemeIssues } from '@/lib/fg/hub'
import { issueTabPath } from '@/lib/fg/issuePage'
import { dayWord, type IssueQuote } from '@/lib/fg/issueSubject'
import { issuePath } from '@/lib/fg/paths'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import { useHubFixture, type HubSlot } from '@/lib/queries/useHubSlots'
import { useIssueFeed } from '@/lib/queries/useIssueFeed'
import { useIssueQuotes } from '@/lib/queries/useIssue'

const NARROW = '(max-width: 767px)'
const CAPTION = '같은 소식을 다룬 기사를 하나로 묶었어요'
const AI_NOTE = '요약은 AI가 만들었어요'

type Quotes = ReadonlyMap<string, IssueQuote> | null

interface IssueCardProps {
  issue: IssueSummaryRes
  index: number
  quotes: Quotes
  timeline: HubFixture | null
  linked: HubFixture | null
  narrow: boolean
  from: string
}

function IssueCard({ issue, index, quotes, timeline, linked, narrow, from }: IssueCardProps) {
  const state = fromState(from)
  const title = issue.title?.trim() || '제목 없는 이슈'
  const summary = issue.summary?.trim() || null
  const updated = issue.lastPublishedAt ?? issue.firstPublishedAt
  const ago = updated ? formatRelativeTime(updated) : null
  const flow = timeline ? timeline.issueExtra(index).flow : null
  const inferred = linked ? linked.issueExtra(index).inferred : 0
  const { shown, extra } = splitChips(issue.companies, FEED_STOCK_CHIPS)
  return (
    <article className="fg-hcard">
      <div className="fg-hcard__meta fg-num">
        <span>
          <b>{`${issue.mediaCount}개 매체`}</b>
          {` 보도${ago ? ` · ${ago}${narrow ? '' : ' 갱신'}` : ''}`}
        </span>
        {flow && (
          <GapValue
            gap="issue-timeline"
            mock={<Badge tone={flow.count > 1 ? 'issue' : 'neutral'}>{timelineBadge(flow.count)}</Badge>}
          />
        )}
      </div>
      <Link to={issuePath(issue.id)} state={state} className="fg-hcard__title">
        {title}
      </Link>
      {summary && <p className="fg-hcard__sum">{summary}</p>}
      {(shown.length > 0 || inferred > 0) && (
        <div className="fg-hcard__foot">
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
              to={issueTabPath(String(issue.id), 'stocks')}
              state={state}
              className="fg-chip fg-chip--more fg-hcard__more"
              aria-label={`이 이슈에 나온 종목 ${extra}개 더 보기`}
            >
              {`+${extra}`}
            </Link>
          )}
          {inferred > 0 && (
            <GapValue gap="linked-companies" mock={<Badge tone="inferred">{`이어진 기업 ${inferred}곳`}</Badge>} />
          )}
        </div>
      )}
    </article>
  )
}

function FeedSkeleton() {
  return (
    <div className="fg-hfeed__skel" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="fg-hfeed__skelcard">
          <Skeleton height={17} width="36%" />
          <Skeleton height={26} width="88%" />
          <Skeleton height={42} />
          <Skeleton height={32} width={140} shape="chip" />
        </div>
      ))}
    </div>
  )
}

interface HomeFeedProps {
  hot: readonly ThemeRes[] | null
  themeIssues: HubSlot<ReadonlyMap<number, HubThemeIssues>>
  today: string
}

export function HomeFeed({ hot, themeIssues, today }: HomeFeedProps) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const narrow = useMediaQuery(NARROW)
  const sort = parseFeedSort(search)
  const feed = useIssueFeed(sort)
  const { locked, pending: authPending } = useMemberGate()
  const member = !locked && !authPending
  const favorites = useFavorites()
  const favoriteSet = useMemo(
    () => new Set(favorites.items.filter((item) => item.type === 'STOCK').map((item) => item.key)),
    [favorites.items],
  )
  const issueMap = themeIssues.status === 'ready' ? themeIssues.data : null
  const chips = useMemo(() => chipThemes(hot ?? [], issueMap), [hot, issueMap])
  const [picked, setPicked] = useState<FeedFilter>(ALL_FILTER)
  const filter = resolveFilter(picked, chips, member)
  const themeIssueIds = useMemo(
    () => (filter.kind === 'theme' && issueMap ? new Set(issueMap.get(filter.id)?.ids ?? []) : null),
    [filter, issueMap],
  )
  const groups = useMemo(() => feedGroups(feed.chunks), [feed.chunks])
  const shownGroups = useMemo(
    () => filterGroups(groups, filter, { favorites: favoriteSet, themeIssueIds }),
    [groups, filter, favoriteSet, themeIssueIds],
  )
  const { quotes, retry: retryQuotes } = useIssueQuotes(true)
  const timeline = useHubFixture('issue-timeline')
  const linked = useHubFixture('linked-companies')
  const skeleton = useDelayed(feed.chunks.length === 0 && feed.pending !== null)
  const from = `${pathname}${search}`

  const onSort = useCallback(
    (next: IssueSort) => {
      const target = feedSortSearch(search, next)
      if (target !== search) navigate({ pathname, search: target }, { replace: true })
    },
    [navigate, pathname, search],
  )

  const loaded = feed.chunks.length > 0
  const primaryDate = feed.chunks[0]?.date ?? null
  const lastDate = feed.chunks[feed.chunks.length - 1]?.date ?? null
  const themeCount = filter.kind === 'theme' ? (issueMap?.get(filter.id)?.count ?? 0) : 0
  const shownCount = shownGroups.reduce((sum, group) => sum + group.items.length, 0)
  const themeDone = filter.kind === 'theme' && shownCount >= themeCount
  const next = loaded && !themeDone ? nextFeedRequest(feed.chunks, filter.kind !== 'theme') : null
  const fill = filter.kind === 'theme' && next !== null && feed.pending === null && !feed.error
  const { more } = feed
  useEffect(() => {
    if (fill && next) more(next)
  }, [fill, next, more])
  const themeName = filter.kind === 'theme' ? (chips.find((theme) => theme.id === filter.id)?.name ?? '') : ''
  const primaryDay = primaryDate ? dayWord(primaryDate, today) : null

  const options: { key: string; label: string; filter: FeedFilter }[] = [{ key: 'all', label: '전체', filter: ALL_FILTER }]
  if (member) options.push({ key: 'fav', label: '관심 종목', filter: { kind: 'fav' } })
  for (const theme of chips) options.push({ key: `t${theme.id}`, label: theme.name, filter: { kind: 'theme', id: theme.id } })
  const sameFilter = (a: FeedFilter, b: FeedFilter) =>
    a.kind === b.kind && (a.kind !== 'theme' || (b.kind === 'theme' && a.id === b.id))

  let scope: string | null = null
  if (filter.kind === 'theme' && primaryDay) scope = `${primaryDay} 이슈 중 ${themeName} 종목이 나온 이슈 ${themeCount}개예요`
  if (filter.kind === 'fav') scope = '불러온 이슈 중 관심 종목이 나온 이슈예요'

  const showAll = (
    <Button size="sm" onClick={() => setPicked(ALL_FILTER)}>
      전체 보기
    </Button>
  )
  let body: ReactNode
  if (!loaded && feed.error) {
    body = (
      <StateBlock
        kind="error"
        title="이슈를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={feed.retry}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (!loaded) {
    body = skeleton ? <FeedSkeleton /> : <div className="fg-hfeed__skel" />
  } else if (groups.length === 0) {
    body = (
      <StateBlock kind="empty" title="아직 묶인 이슈가 없어요" description="여러 매체가 다룬 기사가 모이면 여기에 보여 드려요" />
    )
  } else if (shownGroups.length === 0 && filter.kind === 'fav' && favoriteSet.size === 0) {
    body = <StateBlock kind="empty" title="아직 관심 종목이 없어요" description="종목 화면에서 별을 눌러 추가해 보세요" action={showAll} />
  } else if (shownGroups.length === 0 && filter.kind === 'fav') {
    body = (
      <StateBlock
        kind="empty"
        title="관심 종목이 나온 이슈가 없어요"
        description={next ? '이슈를 더 불러와서 찾아볼 수 있어요' : '지금 불러온 이슈에는 없어요'}
        action={showAll}
      />
    )
  } else if (shownGroups.length === 0) {
    body = (
      <StateBlock
        kind="empty"
        title={`${themeName} 종목이 나온 이슈가 없어요`}
        description={primaryDay ? `${primaryDay} 이슈를 기준으로 찾았어요` : undefined}
        action={showAll}
      />
    )
  } else {
    const order = new Map(shownGroups.flatMap((group) => group.items).map((issue, i) => [issue.id, i]))
    body = shownGroups.map((group) => (
      <div key={group.date ?? 'none'} className="fg-hfeed__group">
        {group.date && <h3 className="fg-hfeed__day fg-num">{dayWord(group.date, today)}</h3>}
        {group.items.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            index={order.get(issue.id) ?? 0}
            quotes={quotes}
            timeline={timeline}
            linked={linked}
            narrow={narrow}
            from={from}
          />
        ))}
      </div>
    ))
  }

  const caption = narrow ? CAPTION : `${CAPTION} · ${AI_NOTE}`

  return (
    <section className="fg-section fg-hsec fg-hfeed" aria-labelledby="fg-feed-h">
      <div className="fg-hsec__head">
        <div className="fg-hsec__titles">
          <h2 id="fg-feed-h" className="fg-hsec__title">
            최신 이슈
          </h2>
          <span className="fg-hsec__cap">{caption}</span>
        </div>
        <Segment label="이슈 정렬" options={FEED_SORTS} value={sort} onChange={onSort} className="fg-hfeed__sort" />
      </div>
      {options.length > 1 && (
        <div className="fg-hfeed__chips" role="group" aria-label="이슈 거르기">
          {options.map((option) => (
            <FilterChip
              key={option.key}
              pressed={sameFilter(option.filter, filter)}
              onClick={() => setPicked(option.filter)}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      )}
      {scope && loaded && shownGroups.length > 0 && <p className="fg-hfeed__scope">{scope}</p>}
      <div className="fg-hfeed__list" aria-busy={feed.pending !== null || undefined}>
        {body}
      </div>
      {retryQuotes && shownGroups.length > 0 && <QuoteRetryNote onRetry={retryQuotes} />}
      {loaded && feed.error && (
        <p className="fg-hfeed__fail" role="status">
          <span>이슈를 더 불러오지 못했어요</span>
          <RetryText subject="이슈" onRetry={feed.retry} />
        </p>
      )}
      {loaded && next && !feed.error && !(filter.kind === 'fav' && favoriteSet.size === 0) && (
        <div className="fg-hfeed__more">
          <Button
            className="fg-hfeed__morebtn"
            busy={feed.pending !== null}
            disabled={feed.pending !== null}
            onClick={() => feed.more(next)}
          >
            {moreLabel(next, lastDate, today)}
            <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      )}
    </section>
  )
}
