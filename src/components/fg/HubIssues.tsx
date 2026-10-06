import { ChevronRight } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { GapValue, MockBadge } from '@/components/fg/Gap'
import { MemberGate } from '@/components/fg/MemberGate'
import { ChangeText } from '@/components/fg/PriceChange'
import { QuoteRetryNote, RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockChip } from '@/components/fg/StockChip'
import {
  AutoButton,
  HubBody,
  HubFrame,
  HubGapLine,
  HubInline,
  HubItem,
  HubMore,
  HubPanel,
  HubProgress,
  HubQuoteRow,
  HubTimeline,
  type HubTabProps,
} from '@/components/fg/TimelineHub'
import type { IssueCompanyRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import {
  autoFlags,
  flowLabels,
  HUB_INFERRED,
  HUB_INTERVAL_SEC,
  HUB_ISSUE_LIMIT,
  hubCaption,
  hubIssueItems,
  nextAuto,
  panelStocks,
  quoteExtOf,
  toggleAuto,
  type AutoState,
  type HubIssueExtra,
  type HubIssueItem,
  type HubQuoteExt,
} from '@/lib/fg/hub'
import { issueTabPath, rankLinks } from '@/lib/fg/issuePage'
import type { IssueLink, IssueStock } from '@/lib/fg/issueRecords'
import { dayWord, liveStocks, type IssueQuote } from '@/lib/fg/issueSubject'
import { issuePath, stockPath } from '@/lib/fg/paths'
import { STRENGTH_LABEL } from '@/lib/fg/stockDetail'
import { hasQuote, type LinkedCompany } from '@/lib/fg/stockLinks'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useHubSelection, usePageHidden, useSeen } from '@/lib/fg/useHub'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import { useHubFixture } from '@/lib/queries/useHubSlots'
import { isIssueApiId, useIssueDetail, useIssueList, useIssueQuotes, type IssueListQuery } from '@/lib/queries/useIssue'
import { useIssueLinks, type IssueLinksState } from '@/lib/queries/useLinkedCompanies'
import { cn } from '@/lib/utils'

const HEADING = '지금 뜨는 이슈'
const LIST_LABEL_TAIL = '보도한 매체가 많은 순'
const LIST_QUERY: IssueListQuery = { date: null, sort: 'media', page: 0, size: HUB_ISSUE_LIMIT }
const REDUCED = '(prefers-reduced-motion: reduce)'

type Quotes = ReadonlyMap<string, IssueQuote> | null

interface QuoteLookup {
  ext: (ticker: string | null) => HubQuoteExt | null
  value: (ticker: string | null) => number | null
}

const NO_COMPANIES: readonly IssueCompanyRes[] = []

function linkExt(company: LinkedCompany): HubQuoteExt | null {
  if (company.gapFromHigh === null) return null
  return { gapFromHigh: company.gapFromHigh, position: company.position, high: company.newHigh === true }
}

function topLinks(links: readonly IssueLink[]): LinkedCompany[] {
  return rankLinks(links)
    .slice(0, HUB_INFERRED)
    .map((link) => link.company)
}

function pastOf(extra: HubIssueExtra | null, day: string): HubIssueExtra['past'] {
  return extra ? extra.past.filter((node) => node.day < day) : []
}

function IssueHead({ item, extra, quotes }: { item: HubIssueItem; extra: HubIssueExtra | null; quotes: Quotes }) {
  const lead = item.companies[0] ?? null
  const change = lead ? (quotes?.get(lead.ticker)?.change ?? null) : null
  return (
    <>
      <span className="fg-hh">
        <span className="fg-acc__title">{item.title}</span>
        <span className="fg-hh__meta">
          {extra ? (
            <GapValue gap="issue-timeline" mock={flowLabels(extra.flow).meta} />
          ) : (
            <span className="fg-num">{`기사 ${item.articles}건`}</span>
          )}
          {lead && (
            <span className="fg-hh__lead">
              <span className="fg-lg fg-lg--s">
                <CompanyLogo name={lead.name} size={16} />
                {lead.name}
              </span>
              {change !== null && <ChangeText value={change} />}
            </span>
          )}
        </span>
      </span>
      <span className="fg-cov fg-hh__cov">
        <span className="fg-cov__bar" aria-hidden="true">
          <span className="fg-cov__fill" style={{ width: `${item.pct}%` }} />
        </span>
        <span className="fg-cov__txt fg-num">{`${item.media}개 매체`}</span>
      </span>
    </>
  )
}

function FlowRow({ extra }: { extra: HubIssueExtra }) {
  const labels = flowLabels(extra.flow)
  return (
    <span className="fg-hubflow">
      <Badge tone="issue">{labels.badge}</Badge>
      <span className="fg-hubflow__since">{labels.since}</span>
      <MockBadge />
    </span>
  )
}

interface IssueBodyProps {
  item: HubIssueItem
  extra: HubIssueExtra | null
  today: string
  pane: ReactNode
}

function IssueBody({ item, extra, today, pane }: IssueBodyProps) {
  return (
    <>
      {extra && <FlowRow extra={extra} />}
      <HubTimeline label="이슈 타임라인, 최신순" today={today} current={item} past={pastOf(extra, item.day)} showTitle={false} />
      <HubMore to={issueTabPath(item.id, 'timeline')}>타임라인 전체 보기</HubMore>
      {pane && <HubInline>{pane}</HubInline>}
    </>
  )
}

function Strength({ value }: { value: 1 | 2 | 3 }) {
  return (
    <span className="fg-strength">
      근거 강도
      {([1, 2, 3] as const).map((bar) => (
        <i key={bar} className={cn(bar <= value && 'on')} aria-hidden="true" />
      ))}
      <b>{STRENGTH_LABEL[value]}</b>
    </span>
  )
}

function InferredBlock({ linked, to }: { linked: IssueLinksState; to: string }) {
  const { locked, pending } = useMemberGate()
  const links = linked.links
  let body: ReactNode
  if (links === null && linked.error) {
    body = (
      <p className="fg-hubsoon" role="status">
        <span>이어진 기업을 불러오지 못했어요</span>
        <RetryText subject="이어진 기업" onRetry={linked.retry} />
      </p>
    )
  } else if (links === null || pending) {
    body = <Skeleton height={120} />
  } else if (links.length === 0) {
    body = <p className="fg-hubp__empty">아직 이어진 기업이 없어요</p>
  } else if (locked) {
    body = <MemberGate subject={`이런 기업 ${links.length}곳`} variant="compact" className="fg-hubp__gate" />
  } else {
    body = (
      <>
        <div className="fg-hubp__rows">
          {topLinks(links).map((company) => (
            <HubQuoteRow
              key={company.id}
              to={to}
              name={company.name}
              market={company.market}
              price={company.price}
              change={company.change}
            >
              {hasQuote(company) && <HubGapLine ext={linkExt(company)} />}
              <span className="fg-hq__foot">
                <span className="fg-qrow__rel">{company.relation}</span>
                <Strength value={company.strength} />
              </span>
            </HubQuoteRow>
          ))}
        </div>
        {links.length > HUB_INFERRED && <HubMore to={to}>{`이런 기업 ${links.length}곳 모두 보기`}</HubMore>}
      </>
    )
  }
  return (
    <div className="fg-hubp__inf">
      <span className="fg-hubp__titles">
        <span className="fg-hubp__title">이런 기업은 어때요?</span>
      </span>
      <span className="fg-hubp__cap">뉴스엔 안 나왔지만 관계로 이어진 기업이에요</span>
      {body}
    </div>
  )
}

interface IssuePaneProps {
  item: HubIssueItem
  stocks: readonly IssueStock[]
  total: number
  linked: IssueLinksState
  lookup: QuoteLookup
  basisShort: string | null
  from: string
  onRetryQuotes: (() => void) | null
}

function IssuePane({ item, stocks, total, linked, lookup, basisShort, from, onRetryQuotes }: IssuePaneProps) {
  const split = panelStocks(stocks, total)
  const rep = split.rep
  const all = issueTabPath(item.id, 'stocks')
  const state = fromState(from)
  const repExt = lookup.ext(rep?.ticker ?? null)
  const tradingValue = lookup.value(rep?.ticker ?? null)
  return (
    <>
      <div className="fg-hubp__head">
        <span className="fg-hubp__title">이 이슈와 연결된 종목</span>
        <span className="fg-hubp__cap">{basisShort ? `${item.title} · ${basisShort}` : item.title}</span>
      </div>
      <div className="fg-hubp__news">
        <span className="fg-hubp__label fg-num">
          <span>뉴스에 나온 종목</span>
          <span className="fg-hubp__count">{`${split.total}개`}</span>
        </span>
        {rep ? (
          <HubQuoteRow
            to={rep.ticker ? stockPath(rep.ticker) : null}
            state={state}
            name={rep.name}
            market={rep.market ?? null}
            price={rep.price ?? null}
            change={rep.change}
            high={repExt?.high ?? false}
          >
            <HubGapLine
              ext={repExt}
              extra={
                tradingValue !== null && (
                  <span className="fg-hq__extra">
                    거래대금 <b>{formatCompactKrw(tradingValue)}</b>
                  </span>
                )
              }
            />
          </HubQuoteRow>
        ) : (
          <p className="fg-hubp__empty">이 이슈 기사에 나온 상장 종목이 없어요</p>
        )}
        {(split.chips.length > 0 || split.extra > 0) && (
          <div className="fg-hub__chips fg-num">
            {split.chips.map((stock) =>
              stock.ticker ? (
                <StockChip
                  key={stock.ticker}
                  ticker={stock.ticker}
                  name={stock.name}
                  change={stock.change}
                  withLogo
                  state={state}
                />
              ) : null,
            )}
            {split.extra > 0 && (
              <Link to={all} className="fg-chip fg-chip--more" aria-label={`뉴스에 나온 종목 ${split.extra}개 더 보기`}>
                {`+${split.extra}`}
              </Link>
            )}
          </div>
        )}
      </div>
      {onRetryQuotes && stocks.length > 0 && <QuoteRetryNote onRetry={onRetryQuotes} />}
      <InferredBlock linked={linked} to={all} />
      <ButtonLink to={rep?.ticker ? `/graph/${rep.ticker}` : '/graph'} className="fg-hubp__go">
        관계 탐색에서 보기
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </ButtonLink>
    </>
  )
}

interface MobileProps {
  items: readonly HubIssueItem[]
  index: number
  stocks: readonly IssueStock[]
  total: number
  linked: IssueLinksState
  extraOf: ((index: number) => HubIssueExtra) | null
  quotes: Quotes
  lookup: QuoteLookup
  today: string
  from: string
}

function IssuesMobile({ items, index, stocks, total, linked, extraOf, quotes, lookup, today, from }: MobileProps) {
  const { locked, pending, promptLogin } = useMemberGate()
  const item = items[index]
  const extra = extraOf ? extraOf(index) : null
  const links = linked.links && linked.links.length > 0 ? linked.links : null
  const all = issueTabPath(item.id, 'stocks')
  const state = fromState(from)
  const cards = stocks.filter((stock) => stock.ticker).slice(0, links ? 1 : 5)
  const others = items.flatMap((other, i) => (i === index ? [] : [{ other, i }]))
  const allLabel = links ? `뉴스 종목 ${total} · 이런 기업 ${links.length}` : `뉴스 종목 ${total}`
  return (
    <div className="fg-hubm">
      <article className="fg-hubm__card" aria-label="선택한 이슈 타임라인">
        <div className="fg-hubm__top">
          {extra && <FlowRow extra={extra} />}
          <span className="fg-cov fg-hubm__cov">
            <span className="fg-cov__bar" aria-hidden="true">
              <span className="fg-cov__fill" style={{ width: `${item.pct}%` }} />
            </span>
            <span className="fg-cov__txt fg-num">{`${dayWord(item.day, today)} ${item.media}개 매체`}</span>
          </span>
        </div>
        <HubTimeline
          label="이슈 타임라인, 최신순"
          today={today}
          current={item}
          past={pastOf(extra, item.day)}
          showTitle
          variant="card"
        />
        <HubMore to={issueTabPath(item.id, 'timeline')}>타임라인 전체 보기</HubMore>
      </article>
      <div className="fg-hubm__head">
        <h2 className="fg-hubm__h2">이 이슈와 연결된 종목</h2>
        <span className="fg-hubm__cap">
          {links ? '보라색은 뉴스엔 안 나왔지만 관계로 이어진 기업이에요' : '이 이슈 기사에 나온 종목이에요'}
        </span>
      </div>
      {cards.length === 0 && !links ? (
        <p className="fg-hubm__empty">이 이슈 기사에 나온 상장 종목이 없어요</p>
      ) : (
        <div className="fg-hubm__cards">
          {cards.map((stock) => (
            <Link key={stock.ticker} to={stockPath(stock.ticker ?? '')} state={state} className="fg-hubm__scard fg-num">
              <Badge>뉴스에 나온 종목</Badge>
              <span className="fg-hubm__id">
                <span className="fg-lg">
                  <CompanyLogo name={stock.name} size={24} />
                  <span className="fg-hubm__name">{stock.name}</span>
                </span>
                {stock.market && <span className="fg-hubm__mkt">{marketLabel(stock.market)}</span>}
              </span>
              <span className="fg-hq__px">
                {stock.price != null && <span className="fg-hq__price">{formatPriceWon(stock.price)}</span>}
                {stock.change !== null && <ChangeText value={stock.change} className="fg-hq__chg" />}
              </span>
              <HubGapLine ext={lookup.ext(stock.ticker)} />
            </Link>
          ))}
          {links &&
            !pending &&
            (locked ? (
              <div className="fg-hubm__gcard">
                <span className="fg-hubm__gtitle">{`이런 기업 ${links.length}곳은 로그인하면 볼 수 있어요`}</span>
                <span className="fg-hubm__gsub">관계 경로와 원문 근거까지 볼 수 있어요</span>
                <Button variant="primary" onClick={promptLogin}>
                  로그인
                </Button>
              </div>
            ) : (
              topLinks(links).map((company) => (
                <Link key={company.id} to={all} className="fg-hubm__scard fg-num">
                  <Badge tone="inferred">{`근거 강도 ${STRENGTH_LABEL[company.strength]}`}</Badge>
                  <span className="fg-hubm__id">
                    <span className="fg-lg">
                      <CompanyLogo name={company.name} size={24} />
                      <span className="fg-hubm__name">{company.name}</span>
                    </span>
                    <span className="fg-hubm__mkt">{marketLabel(company.market)}</span>
                  </span>
                  {hasQuote(company) && (
                    <span className="fg-hq__px">
                      <span className="fg-hq__price">{company.price !== null ? formatPriceWon(company.price) : '—'}</span>
                      {company.change !== null && <ChangeText value={company.change} className="fg-hq__chg" />}
                    </span>
                  )}
                  {hasQuote(company) && (
                    <span className="fg-hq__meta">
                      <span className="fg-hq__gap">
                        {company.newHigh ? (
                          <>
                            52주 최고 <b>경신</b>
                          </>
                        ) : (
                          <>
                            52주 최고 대비 <b>{company.gapFromHigh === null ? '—' : formatGapPct(company.gapFromHigh)}</b>
                          </>
                        )}
                      </span>
                    </span>
                  )}
                  <span className="fg-qrow__rel">{company.relation}</span>
                </Link>
              ))
            ))}
          <Link to={all} className="fg-hubm__all">
            <span className="fg-hubm__allcap fg-num">{allLabel}</span>
            <span className="fg-hubm__allgo">
              모두 보기
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </span>
          </Link>
        </div>
      )}
      {others.length > 0 && (
        <div className="fg-hubm__others">
          <span className="fg-hubm__label">다른 뜨는 이슈</span>
          <ul className="fg-hubm__list">
            {others.map(({ other, i }) => {
              const lead = other.companies[0] ?? null
              const change = lead ? (quotes?.get(lead.ticker)?.change ?? null) : null
              const otherExtra = extraOf ? extraOf(i) : null
              return (
                <li key={other.id}>
                  <Link to={issuePath(other.id)} className="fg-hubm__row">
                    <span className="fg-hubm__rowmain">
                      <span className="fg-hubm__rowtitle">{other.title}</span>
                      <span className="fg-hubm__rowmeta fg-num">
                        <b>{`${dayWord(other.day, today)} ${other.media}개 매체`}</b>
                        {otherExtra && <GapValue gap="issue-timeline" mock={flowLabels(otherExtra.flow).count} />}
                        {lead && (
                          <span className="fg-hh__lead">
                            <span className="fg-lg fg-lg--s">
                              <CompanyLogo name={lead.name} size={16} />
                              {lead.name}
                            </span>
                            {change !== null && <ChangeText value={change} />}
                          </span>
                        )}
                      </span>
                    </span>
                    <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="fg-hubm__chev" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function HubSkeletonBody({ wide }: { wide: boolean }) {
  return (
    <div className={cn('fg-hubskel', wide && 'fg-hubskel--wide')} aria-hidden="true">
      <div className="fg-hubskel__list">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height={72} />
        ))}
      </div>
      {wide && <Skeleton height={360} shape="card" />}
    </div>
  )
}

export function HubIssues({ layout, tabs, basis, basisShort, market, pick, onPick, today, from }: HubTabProps) {
  const wide = layout === 'wide'
  const mobile = layout === 'mobile'
  const list = useIssueList(LIST_QUERY)
  const listItems = list.data?.items ?? null
  const listDay = list.data?.meta?.date ?? null
  const inList = pick !== null && listItems !== null && listItems.some((item) => String(item.id) === pick)
  const wantExtra = pick !== null && listItems !== null && !inList
  const firstId = listItems?.[0] ? String(listItems[0].id) : null
  const detailId = pick !== null && (inList || wantExtra) && isIssueApiId(pick) ? pick : firstId
  const detail = useIssueDetail(detailId)
  const extraIssue = wantExtra && detail.data && String(detail.data.id) === pick ? detail.data : null
  const items = useMemo(
    () => (listItems ? hubIssueItems(listItems, listDay, extraIssue) : []),
    [listItems, listDay, extraIssue],
  )
  const keys = useMemo(() => items.map((item) => item.id), [items])
  const extraPending = wantExtra && extraIssue === null && detail.loading && detailId === pick
  const selected = useHubSelection(keys, pick, listItems !== null && !extraPending, onPick)
  const selectedIndex = selected === null ? -1 : keys.indexOf(selected)
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null

  const { quotes, retry: retryQuotes } = useIssueQuotes(true)
  const baseDate = market?.baseDate ?? null
  const lookup = useMemo<QuoteLookup>(
    () => ({
      ext: (ticker) => (ticker ? quoteExtOf(quotes?.get(ticker), baseDate) : null),
      value: (ticker) => (ticker ? (quotes?.get(ticker)?.tradeValue ?? null) : null),
    }),
    [quotes, baseDate],
  )
  const mock = useHubFixture('issue-timeline')
  const extraOf = mock ? mock.issueExtra : null
  const detailCompanies =
    selectedItem !== null && detail.data !== null && String(detail.data.id) === selectedItem.id ? detail.data.companies : null
  const listCompanies = selectedItem?.companies ?? null
  const stocks = useMemo(
    () => liveStocks(detailCompanies ?? listCompanies ?? NO_COMPANIES, quotes, baseDate),
    [detailCompanies, listCompanies, quotes, baseDate],
  )
  const total = (detailCompanies ?? listCompanies ?? NO_COMPANIES).length
  const linked = useIssueLinks(detailCompanies, baseDate)

  const reduced = useMediaQuery(REDUCED)
  const hidden = usePageHidden()
  const [auto, setAuto] = useState<AutoState>(() => ({ stopped: pick !== null, paused: false }))
  const [hover, setHover] = useState(false)
  const enabled = wide && !reduced && items.length > 1
  const { autoOn, running, playing } = autoFlags({ enabled, ...auto, hover, hidden })
  const seen = useSeen(selected)
  const skeleton = useDelayed(listItems === null || extraPending)

  const pickItem = (key: string) => {
    setAuto((state) => ({ ...state, stopped: true }))
    onPick(key)
  }
  const advance = () => {
    const next = nextAuto(Math.max(0, selectedIndex), keys.length, false)
    if (next.stop) setAuto((state) => ({ ...state, stopped: true }))
    onPick(keys[next.sel])
  }
  const pauseOnFocus = () => {
    if (autoOn && !auto.paused) setAuto((state) => ({ ...state, paused: true }))
  }
  const toggle = () => setAuto((state) => toggleAuto(state, running))

  const dayText = listDay ? dayWord(listDay, today) : null
  const caption = mobile
    ? ['여러 매체가 다룬 기사를 이슈로 묶고 타임라인으로 이었어요', basis, '요약은 AI가 만들었어요'].filter(Boolean).join(' · ')
    : hubCaption('issues', { day: dayText, autoSec: enabled ? HUB_INTERVAL_SEC : null })
  const listLabel = `뜨는 이슈, ${dayText ?? '오늘'} ${LIST_LABEL_TAIL}`

  let body: ReactNode
  if (list.error && listItems === null) {
    body = (
      <StateBlock
        kind="error"
        title="이슈를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={list.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (listItems === null || extraPending) {
    body = skeleton ? <HubSkeletonBody wide={wide} /> : <div className="fg-hubskel" />
  } else if (items.length === 0 || selectedItem === null) {
    body = (
      <StateBlock
        kind="empty"
        title="아직 뜨는 이슈가 없어요"
        description="여러 매체가 다룬 기사가 모이면 여기에 보여 드려요"
      />
    )
  } else if (mobile) {
    body = (
      <IssuesMobile
        items={items}
        index={selectedIndex}
        stocks={stocks}
        total={total}
        linked={linked}
        extraOf={extraOf}
        quotes={quotes}
        lookup={lookup}
        today={today}
        from={from}
      />
    )
  } else {
    const pane = (
      <IssuePane
        item={selectedItem}
        stocks={stocks}
        total={total}
        linked={linked}
        lookup={lookup}
        basisShort={basisShort}
        from={from}
        onRetryQuotes={retryQuotes}
      />
    )
    body = (
      <HubBody
        layout={layout}
        listLabel={listLabel}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={pauseOnFocus}
        items={items.map((item, index) => {
          const open = item.id === selected
          const extra = extraOf ? extraOf(index) : null
          return (
            <HubItem
              key={item.id}
              open={open}
              bodyId={`fg-hub-issue-${item.id}`}
              head={<IssueHead item={item} extra={extra} quotes={quotes} />}
              onPick={() => pickItem(item.id)}
              progress={
                open && autoOn ? (
                  <HubProgress key={item.id} seconds={HUB_INTERVAL_SEC} playing={playing} onDone={advance} />
                ) : null
              }
            >
              {seen.has(item.id) && (
                <IssueBody item={item} extra={extra} today={today} pane={!wide && open ? pane : null} />
              )}
            </HubItem>
          )
        })}
        panel={
          <HubPanel label={`${selectedItem.title} 연결 종목`} paneKey={selectedItem.id} live={running ? 'off' : 'polite'}>
            {pane}
          </HubPanel>
        }
      />
    )
  }

  return (
    <HubFrame
      heading={HEADING}
      tab="issues"
      tabs={tabs}
      basis={basis}
      caption={caption}
      layout={layout}
      auto={enabled ? <AutoButton running={running} onToggle={toggle} /> : null}
    >
      {body}
    </HubFrame>
  )
}
