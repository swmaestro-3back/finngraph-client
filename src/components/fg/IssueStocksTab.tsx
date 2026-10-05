import { ChevronDown, ChevronRight, Lock, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { EvidenceSheet } from '@/components/fg/EvidenceSheet'
import { FilterChip, FilterChipGroup } from '@/components/fg/FilterChip'
import { GapValue } from '@/components/fg/Gap'
import { GapBar, HiddenLinkHead, HiddenLinkRow, LINK_LIST_PAGE, STRENGTH_NOTE } from '@/components/fg/HiddenLinkList'
import { IssueStockSheet } from '@/components/fg/IssueStockSheet'
import { MemberGate } from '@/components/fg/MemberGate'
import { ChangeText } from '@/components/fg/PriceChange'
import { QuoteRetryNote, RetryText } from '@/components/fg/RetryText'
import { Segment } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { kstToday } from '@/lib/calendar'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import type { IssueLink } from '@/lib/fg/issueRecords'
import {
  cardArticles,
  cardPicks,
  issueLinkCaption,
  issueLinkChips,
  issueLinkSortOptions,
  issueLinkSummary,
  linkScopeSearch,
  newsStockCards,
  newsStocksCaption,
  readLinkScope,
  scopeLinks,
  sortIssueLinks,
  type LinkScope,
  type NewsStockCard,
} from '@/lib/fg/issueStocks'
import { articlesByTicker, type IssueSubject } from '@/lib/fg/issueSubject'
import { stockPath } from '@/lib/fg/paths'
import { navState } from '@/lib/fg/stockDetail'
import {
  gateScope,
  linkCounts,
  linkEvidenceCount,
  type LinkedCompany,
  type LinkFilter,
  type LinkSort,
} from '@/lib/fg/stockLinks'
import { useFavoriteToggles } from '@/lib/fg/useFavoriteToggle'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import { useIssueArticleCompanies } from '@/lib/queries/useIssue'
import { useEvidenceView, type IssueLinksState } from '@/lib/queries/useLinkedCompanies'
import { cn } from '@/lib/utils'

const NARROW = '(max-width: 767px)'
const NO_SCOPE: LinkScope = { source: null, filter: 'all' }

interface StockCardProps {
  card: NewsStockCard
  member: boolean
  locked: boolean
  on: boolean
  onPick: () => void
  onOpen: () => void
  onRetryQuotes: (() => void) | null
}

function StockCard({ card, member, locked, on, onPick, onOpen, onRetryQuotes }: StockCardProps) {
  const { pathname, search } = useLocation()
  let links
  if (card.links === null) {
    links = <span className="fg-ics__none" />
  } else if (card.links === 0) {
    links = <span className="fg-ics__none">이어진 기업은 아직 없어요</span>
  } else if (member && cardPicks(card) > 0) {
    links = (
      <button
        type="button"
        className="fg-ics__toggle"
        aria-pressed={on}
        aria-label={`이어진 기업 ${card.links}곳 · ${card.name}에서 이어진 기업만 보기`}
        onClick={onPick}
      >
        {`이어진 기업 ${card.links}곳`}
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    )
  } else if (member) {
    links = <span className="fg-ics__none">{`이어진 기업 ${card.links}곳`}</span>
  } else {
    links = (
      <span className="fg-ics__locked">
        {locked && <Lock size={14} strokeWidth={1.75} aria-hidden="true" />}
        {`이어진 기업 ${card.links}곳`}
      </span>
    )
  }
  return (
    <li className={cn('fg-ics__card', on && 'is-on')}>
      <div className="fg-ics__top fg-num">
        <span className="fg-ics__id">
          <CompanyLogo name={card.name} size={24} />
          {card.ticker ? (
            <Link to={stockPath(card.ticker)} state={fromState(`${pathname}${search}`)} className="fg-ics__name">
              {card.name}
            </Link>
          ) : (
            <span className="fg-ics__name">{card.name}</span>
          )}
          <span className="fg-ics__mkt">{marketLabel(card.market)}</span>
        </span>
        <span className="fg-ics__px">
          {card.price === null && card.ticker && onRetryQuotes ? (
            <RetryText subject={`${card.name} 시세`} onRetry={onRetryQuotes} />
          ) : (
            <b className="fg-ics__price">{card.price !== null ? formatPriceWon(card.price) : '—'}</b>
          )}
          {card.change !== null && <ChangeText value={card.change} className="fg-ics__chg" />}
        </span>
      </div>
      {card.role !== null ? (
        <p className="fg-ics__role">{card.role}</p>
      ) : (
        <p className="fg-ics__role fg-ics__role--gap">
          뉴스 속 역할 <GapValue gap="issues" />
        </p>
      )}
      <span className="fg-ics__gap fg-num">
        <span>
          {card.newHigh ? '52주 최고' : '52주 최고 대비'}{' '}
          {card.newHigh ? <b>경신</b> : card.gapFromHigh !== null ? <b>{formatGapPct(card.gapFromHigh)}</b> : '—'}
        </span>
        {card.position !== null && <GapBar position={card.position} />}
      </span>
      <div className="fg-ics__foot">
        {links}
        <button
          type="button"
          className="fg-ics__arts fg-num"
          aria-haspopup="dialog"
          aria-label={`${card.name} 기사 ${card.articles}건 보기`}
          onClick={onOpen}
        >
          {`기사 ${card.articles}건`}
        </button>
      </div>
    </li>
  )
}

interface LinkListProps {
  lead: string
  links: readonly IssueLink[]
  scope: LinkScope
  narrow: boolean
  watchedOf: (company: LinkedCompany) => boolean | null
  onScope: (from: string | null, filter: LinkFilter) => void
  onToggleWatch: (company: LinkedCompany) => void
  onOpen: (id: string) => void
}

function LinkList({ lead, links, scope, narrow, watchedOf, onScope, onToggleWatch, onOpen }: LinkListProps) {
  const [sort, setSort] = useState<LinkSort>('strength')
  const [opened, setOpened] = useState<string | null>(null)
  const source = scope.source
  const scopeKey = `${source?.key ?? ''}|${scope.filter}`
  const scoped = scopeLinks(links, source?.name ?? null)
  const rows = sortIssueLinks(
    scoped.filter((link) => scope.filter === 'all' || link.company.type === scope.filter),
    sort,
  )
  const shown = opened === scopeKey ? rows : rows.slice(0, LINK_LIST_PAGE)
  const hidden = rows.length - shown.length
  const segment = <Segment label="정렬" options={issueLinkSortOptions(narrow)} value={sort} onChange={setSort} />
  return (
    <>
      <div className="fg-ilk__tools">
        <div className="fg-ilk__filter">
          <span className="fg-ilk__path">
            <span className="fg-ilk__pnode">
              <i className="fg-ilk__dia" aria-hidden="true" />
              {lead}
            </span>
            <span className="fg-ilk__pline" aria-hidden="true" />
            {source ? (
              <FilterChip
                pressed
                className="fg-ilk__src"
                aria-label={`${source.name}에서 이어진 기업만 보기 해제`}
                onClick={() => onScope(null, 'all')}
              >
                <i className="fg-ilk__cdot" aria-hidden="true" />
                {source.name}
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </FilterChip>
            ) : (
              <span className="fg-ilk__pnode">
                <i className="fg-ilk__cdot" aria-hidden="true" />
                뉴스에 나온 종목
              </span>
            )}
            <span className="fg-ilk__pdash" aria-hidden="true" />
          </span>
          <FilterChipGroup
            label="관계 유형으로 거르기"
            options={issueLinkChips(scoped)}
            value={scope.filter}
            onChange={(filter) => onScope(source?.key ?? null, filter)}
            className="fg-ilk__chips"
          />
        </div>
        {!narrow && segment}
      </div>
      <div className="fg-ilk__capline">
        <span className="fg-hlist__cap fg-num" aria-live="polite">
          {issueLinkCaption(source?.name ?? null, scope.filter, rows.length, sort)}
        </span>
        {narrow && segment}
      </div>
      <ul className="fg-hlist fg-ilk__list" aria-label="이런 기업은 어때요? 목록">
        <HiddenLinkHead />
        {shown.map((link) => (
          <HiddenLinkRow
            key={link.company.id}
            company={link.company}
            meta={`${link.company.hops.length}단계 · 근거 ${linkEvidenceCount(link.company)}건`}
            openLabel={`근거 ${linkEvidenceCount(link.company)}건 보기`}
            watched={watchedOf(link.company)}
            onToggleWatch={() => onToggleWatch(link.company)}
            onOpen={() => onOpen(link.company.id)}
          />
        ))}
      </ul>
      {hidden > 0 && (
        <Button className="fg-hlist__more" onClick={() => setOpened(scopeKey)}>
          {`${hidden}곳 더 보기`}
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
      <Disclaimer text={STRENGTH_NOTE} className="fg-snote" />
    </>
  )
}

interface IssueStocksTabProps {
  issue: IssueSubject
  linked: IssueLinksState | null
  onOpenNews: (id: string) => void
  onRetryQuotes: (() => void) | null
}

export function IssueStocksTab({ issue, linked, onOpenNews, onRetryQuotes }: IssueStocksTabProps) {
  const narrow = useMediaQuery(NARROW)
  const { locked, pending, promptLogin } = useMemberGate()
  const member = !locked && !pending
  const { pathname, search, state } = useLocation()
  const navigate = useNavigate()
  const live = issue.kind === 'live'
  const links = issue.kind === 'mock' ? issue.record.links : (linked?.links ?? null)
  const firstHops = live ? (linked?.firstHops ?? null) : undefined
  const lead = issue.kind === 'mock' ? issue.record.flowTitle : issue.title
  const cards = useMemo(() => newsStockCards(issue.stocks, links, firstHops), [issue.stocks, links, firstHops])
  const scope = member && links ? readLinkScope(search, cards, links) : NO_SCOPE
  const favorites = useFavoriteToggles('STOCK')
  const [watched, setWatched] = useState<Record<string, boolean>>({})
  const [stockKey, setStockKey] = useState<string | null>(null)
  const [linkId, setLinkId] = useState<string | null>(null)
  const [wantArticles, setWantArticles] = useState(false)
  const [today] = useState(() => kstToday(new Date()))
  const trigger = useRef<HTMLElement | null>(null)

  const articleIds = useMemo(
    () => (issue.kind === 'live' && wantArticles ? issue.articles.map((a) => a.id) : null),
    [issue.kind, issue.articles, wantArticles],
  )
  const companies = useIssueArticleCompanies(articleIds)
  const byTicker = useMemo(
    () => (companies.data ? articlesByTicker(issue.articles, companies.data) : null),
    [companies.data, issue.articles],
  )

  const sheetCard = cards.find((card) => card.key === stockKey) ?? null
  const sheetLink = member && links ? (links.find((link) => link.company.id === linkId) ?? null) : null
  const evidence = useEvidenceView(live ? (sheetLink?.company ?? null) : null, today)
  const sheetArticles = sheetCard ? cardArticles(sheetCard, issue.articles, byTicker) : null
  const summary = links ? issueLinkSummary(links, cards) : []

  const remember = () => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }
  const openStock = (key: string) => {
    remember()
    setWantArticles(true)
    if (companies.error) companies.retry()
    setStockKey(key)
  }
  const openLink = (id: string) => {
    remember()
    setLinkId(id)
  }
  const toggleWatch = (id: string) => setWatched((prev) => ({ ...prev, [id]: !prev[id] }))
  const watchedOf = (company: LinkedCompany): boolean | null => {
    if (!live) return watched[company.id] === true
    return company.code ? favorites.isActive(company.code) : null
  }
  const toggleLinkWatch = (company: LinkedCompany) => {
    if (!live) toggleWatch(company.id)
    else if (company.code) favorites.press(company.code)
  }
  const setScope = (from: string | null, filter: LinkFilter) =>
    navigate({ pathname, search: linkScopeSearch(search, from, filter) }, { replace: true, state: navState(state) })

  let linkBody
  if (!links && linked?.error)
    linkBody = (
      <StateBlock
        kind="error"
        title="이어진 기업을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={linked.retry}>
            다시 시도
          </Button>
        }
      />
    )
  else if (!links) linkBody = <Skeleton height={280} />
  else if (links.length === 0)
    linkBody = <StateBlock kind="empty" title="아직 이어진 기업이 없어요" description="관계가 새로 확인되면 여기에 보여 드려요" />
  else if (pending) linkBody = <Skeleton height={280} />
  else if (locked)
    linkBody = (
      <MemberGate
        subject={`이런 기업 ${links.length}곳`}
        scope={gateScope(linkCounts(links.map((link) => link.company)))}
        className="fg-ilk__gate"
      />
    )
  else
    linkBody = (
      <>
        {linked?.quotesRetry && <QuoteRetryNote onRetry={linked.quotesRetry} />}
        <LinkList
          lead={lead}
          links={links}
          scope={scope}
          narrow={narrow}
          watchedOf={watchedOf}
          onScope={setScope}
          onToggleWatch={toggleLinkWatch}
          onOpen={openLink}
        />
      </>
    )

  return (
    <div className="fg-col fg-ist fg-reveal">
      <section className="fg-section fg-ics" aria-labelledby="fg-ics-title">
        <div className="fg-iflow__titles">
          <h2 id="fg-ics-title" className="fg-section__title">
            뉴스에 나온 종목 <span className="fg-ist__count fg-num">{cards.length}</span>
          </h2>
          <p className="fg-section__sub">{newsStocksCaption(issue.kind, narrow)}</p>
        </div>
        {cards.length > 0 ? (
          <ul className="fg-ics__grid" aria-label="뉴스에 나온 종목">
            {cards.map((card) => {
              const on = scope.source?.key === card.key
              return (
                <StockCard
                  key={card.key}
                  card={card}
                  member={member}
                  locked={locked}
                  on={on}
                  onPick={() => setScope(on ? null : card.key, 'all')}
                  onOpen={() => openStock(card.key)}
                  onRetryQuotes={onRetryQuotes}
                />
              )
            })}
          </ul>
        ) : (
          <StateBlock
            kind="empty"
            title="뉴스에 나온 종목이 없어요"
            description={
              issue.kind === 'mock' ? '시장 전체를 다룬 이슈라 따로 나온 종목이 없어요' : '이 이슈 기사에 나온 상장 종목이 없어요'
            }
          />
        )}
      </section>
      <section className="fg-section fg-ilk" aria-labelledby="fg-ilk-title">
        <div className="fg-section__head fg-ilk__head">
          <div className="fg-sev__titles">
            <span className="fg-sev__title">
              <h2 id="fg-ilk-title" className="fg-section__title">
                이런 기업은 어때요?
                {links && links.length > 0 && <span className="fg-ist__count fg-num">{` ${links.length}`}</span>}
              </h2>
              <Badge tone="inferred">AI 추론</Badge>
            </span>
            <p className="fg-section__sub">뉴스엔 안 나왔지만 관계로 이어진 기업이에요</p>
            {summary.length > 0 && (
              <p className="fg-ilk__sum">
                {summary.map((part, i) => (part.strong ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>))}
              </p>
            )}
          </div>
          {links && links.length > 0 && !narrow && (
            <ButtonLink to="/graph" className="fg-ilk__go">
              관계 탐색에서 크게 보기
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </ButtonLink>
          )}
        </div>
        {linkBody}
      </section>
      <Disclaimer />
      <IssueStockSheet
        card={sheetCard}
        lead={lead}
        total={issue.articles.length}
        articles={sheetArticles}
        failed={issue.kind === 'live' && companies.error !== null}
        onRetry={companies.retry}
        onRetryQuotes={onRetryQuotes}
        watched={sheetCard ? watched[sheetCard.key] === true : false}
        onToggleWatch={() => {
          if (!sheetCard) return
          if (locked) promptLogin()
          else toggleWatch(sheetCard.key)
        }}
        onOpenNews={onOpenNews}
        returnFocusRef={trigger}
        onClose={() => setStockKey(null)}
      />
      {links && (
        <EvidenceSheet
          stockName={sheetLink?.from ?? ''}
          lead={lead}
          company={sheetLink?.company ?? null}
          evidence={evidence}
          watched={sheetLink ? watchedOf(sheetLink.company) : null}
          onToggleWatch={() => sheetLink && toggleLinkWatch(sheetLink.company)}
          returnFocusRef={trigger}
          onClose={() => setLinkId(null)}
        />
      )}
    </div>
  )
}
