import { ChevronRight, Clock, Pause, Play } from 'lucide-react'
import type { FocusEventHandler, MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { ChangeText } from '@/components/fg/PriceChange'
import { HeadingTabs } from '@/components/fg/SegmentedTabs'
import { Skeleton } from '@/components/fg/Skeleton'
import type { GapId } from '@/lib/dataGaps'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import { nodeDate, shortDay, type HubIssueNode, type HubQuoteExt, type HubTab } from '@/lib/fg/hub'
import { issuePath } from '@/lib/fg/paths'
import type { PriceBasis } from '@/lib/referenceDate'
import { cn } from '@/lib/utils'

export type HubLayout = 'wide' | 'inline' | 'mobile'

export interface HubTabLink {
  key: HubTab
  label: string
  to: string
}

export interface HubTabProps {
  layout: HubLayout
  tabs: readonly HubTabLink[]
  basis: string | null
  basisShort: string | null
  market: PriceBasis | null
  pick: string | null
  onPick: (key: string | null) => void
  today: string
  from: string
  refreshKey: number
}

interface HubFrameProps {
  heading: string
  tab: HubTab
  tabs: readonly HubTabLink[]
  basis: string | null
  caption: string
  layout: HubLayout
  auto?: ReactNode
  children: ReactNode
}

export function HubFrame({ heading, tab, tabs, basis, caption, layout, auto = null, children }: HubFrameProps) {
  const mobile = layout === 'mobile'
  return (
    <section className={cn('fg-hubc', mobile && 'fg-hubc--mobile')} aria-labelledby="fg-hub-h">
      <div className="fg-hubc__head">
        <h1 id="fg-hub-h" className="fg-sr">
          {heading}
        </h1>
        <div className="fg-hubc__bar">
          <HeadingTabs label="허브 보기" options={tabs} current={tab} className="fg-hubc__tabs" />
          {!mobile && (basis || auto) && (
            <div className="fg-hubc__side">
              {basis && <span className="fg-hubc__basis fg-num">{basis}</span>}
              {auto}
            </div>
          )}
        </div>
        <p className="fg-hubc__cap">{caption}</p>
      </div>
      {children}
    </section>
  )
}

interface AutoButtonProps {
  running: boolean
  onToggle: () => void
}

export function AutoButton({ running, onToggle }: AutoButtonProps) {
  const Icon = running ? Pause : Play
  return (
    <button type="button" className="fg-hubc__auto" onClick={onToggle}>
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {running ? '자동 넘김 멈추기' : '자동 넘김 켜기'}
    </button>
  )
}

interface HubBodyProps {
  layout: HubLayout
  listLabel: string
  items: ReactNode
  panel?: ReactNode
  onMouseEnter?: MouseEventHandler<HTMLDivElement>
  onMouseLeave?: MouseEventHandler<HTMLDivElement>
  onFocus?: FocusEventHandler<HTMLDivElement>
}

export function HubBody({ layout, listLabel, items, panel = null, onMouseEnter, onMouseLeave, onFocus }: HubBodyProps) {
  const wide = layout === 'wide'
  return (
    <div
      className={cn('fg-hub', !wide && 'fg-hub--inline')}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
    >
      <ol className="fg-acc" aria-label={listLabel}>
        {items}
      </ol>
      {wide && panel}
    </div>
  )
}

interface HubItemProps {
  open: boolean
  bodyId: string
  head: ReactNode
  onPick: () => void
  children?: ReactNode
  progress?: ReactNode
}

export function HubItem({ open, bodyId, head, onPick, children = null, progress = null }: HubItemProps) {
  return (
    <li className={cn('fg-acc__item', open && 'is-open')}>
      <button type="button" className="fg-acc__head" aria-expanded={open} aria-controls={bodyId} onClick={onPick}>
        {head}
        <ChevronRight className="fg-acc__chev" size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <div className="fg-acc__body" id={bodyId}>
        <div className="fg-acc__inner">
          <div className="fg-acc__content">{children}</div>
        </div>
      </div>
      {progress}
    </li>
  )
}

interface HubProgressProps {
  seconds: number
  playing: boolean
  onDone: () => void
}

export function HubProgress({ seconds, playing, onDone }: HubProgressProps) {
  return (
    <span className="fg-acc__progress" aria-hidden="true">
      <span
        style={{ animationDuration: `${seconds}s`, animationPlayState: playing ? 'running' : 'paused' }}
        onAnimationEnd={onDone}
      />
    </span>
  )
}

interface HubPanelProps {
  label: string
  paneKey: string
  live: 'off' | 'polite'
  children: ReactNode
}

export function HubPanel({ label, paneKey, live, children }: HubPanelProps) {
  return (
    <div className="fg-hub__panel" aria-live={live}>
      <section key={paneKey} className="fg-hubp" aria-label={label}>
        {children}
      </section>
    </div>
  )
}

export function HubInline({ children }: { children: ReactNode }) {
  return <div className="fg-hubi">{children}</div>
}

interface HubTimelineProps {
  label: string
  today: string
  current: HubIssueNode
  past: readonly HubIssueNode[]
  showTitle: boolean
  variant?: 'hub' | 'card'
  size?: 'md' | 'lg'
  linkState?: unknown
}

export function HubTimeline({
  label,
  today,
  current,
  past,
  showTitle,
  variant = 'hub',
  size = 'lg',
  linkState,
}: HubTimelineProps) {
  const card = variant === 'card'
  const currentDate = card ? nodeDate(current.day, today) : `${nodeDate(current.day, today)} · ${current.media}개 매체`
  return (
    <ol
      className={cn('fg-tl fg-htl', size === 'md' && 'fg-htl--md', card && 'fg-htl--card fg-tl--pulse')}
      aria-label={label}
    >
      <li className="fg-tl__node fg-tl__node--current">
        <span className="fg-tl__date fg-num">{currentDate}</span>
        {showTitle && (
          <Link to={issuePath(current.id)} state={linkState} className="fg-tl__title fg-htl__link">
            {current.title}
          </Link>
        )}
        {current.summary && <p className="fg-tl__sum">{current.summary}</p>}
      </li>
      {past.map((node) =>
        card ? (
          <li key={node.id} className="fg-tl__node fg-htl__stack">
            <span className="fg-tl__date fg-num">{`${shortDay(node.day)} · ${node.media}개 매체`}</span>
            <Link to={issuePath(node.id)} state={linkState} className="fg-tl__title fg-htl__link">
              {node.title}
            </Link>
          </li>
        ) : (
          <li key={node.id} className="fg-tl__node">
            <span className="fg-htl__lead">
              <span className="fg-tl__date fg-num">{shortDay(node.day)}</span>
              <Link to={issuePath(node.id)} state={linkState} className="fg-tl__title fg-htl__link">
                {node.title}
              </Link>
            </span>
            <span className="fg-tl__cov fg-num">{`${node.media}개 매체`}</span>
          </li>
        ),
      )}
    </ol>
  )
}

interface HubMoreProps {
  to: string
  state?: unknown
  children: ReactNode
}

export function HubMore({ to, state, children }: HubMoreProps) {
  return (
    <Link to={to} state={state} className="fg-hub__more fg-hubmore">
      {children}
      <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
    </Link>
  )
}

export function HubSoon({ gap, text }: { gap: GapId; text: string }) {
  return (
    <p className="fg-hubsoon" data-gap={gap}>
      <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>{text}</span>
    </p>
  )
}

export function HubTimelineSkeleton() {
  return (
    <div className="fg-htl__skel" aria-hidden="true">
      <Skeleton height={17} width="40%" />
      <Skeleton height={42} />
      <Skeleton height={20} width="70%" />
    </div>
  )
}

interface HubQuoteRowProps {
  to: string | null
  state?: unknown
  name: string
  market: string | null
  price: number | null
  change: number | null
  high?: boolean
  badge?: ReactNode
  children?: ReactNode
}

export function HubQuoteRow({ to, state, name, market, price, change, high = false, badge = null, children = null }: HubQuoteRowProps) {
  const body = (
    <>
      <CompanyLogo name={name} size={32} />
      <span className="fg-hq__body">
        <span className="fg-hq__top">
          <span className="fg-hq__id">
            <span className="fg-hq__name">{name}</span>
            {market && <span className="fg-hq__mkt">{marketLabel(market)}</span>}
            {high && <Badge tone="high">52주 신고가</Badge>}
            {badge}
          </span>
          <span className="fg-hq__px fg-num">
            {price !== null && <span className="fg-hq__price">{formatPriceWon(price)}</span>}
            {change !== null && <ChangeText value={change} className="fg-hq__chg" />}
          </span>
        </span>
        {children}
      </span>
    </>
  )
  if (to === null) return <div className="fg-hq">{body}</div>
  return (
    <Link to={to} state={state} className="fg-hq">
      {body}
    </Link>
  )
}

interface HubGapLineProps {
  ext: HubQuoteExt | null
  extra?: ReactNode
}

export function HubGapLine({ ext, extra = null }: HubGapLineProps) {
  const value = ext ? <b>{ext.high ? '경신' : formatGapPct(ext.gapFromHigh)}</b> : null
  return (
    <span className="fg-hq__meta fg-num">
      <span className="fg-hq__gap">
        {ext?.high ? '52주 최고' : '52주 최고 대비'} {value ?? '—'}
      </span>
      {ext && ext.position !== null && (
        <span className="fg-hq__bar" aria-hidden="true">
          <i className={cn(ext.high && 'is-high')} style={{ left: `${(ext.position * 100).toFixed(1)}%` }} />
        </span>
      )}
      {extra}
    </span>
  )
}
