import { useCallback, useMemo, type ReactNode } from 'react'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { MockBadge } from '@/components/fg/Gap'
import { ChangeText } from '@/components/fg/PriceChange'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { ThemeIndexRetry } from '@/components/fg/ThemeIndexRetry'
import { ThemeRatio } from '@/components/fg/ThemeRatio'
import {
  HubBody,
  HubFrame,
  HubGapLine,
  HubInline,
  HubItem,
  HubMore,
  HubPanel,
  HubQuoteRow,
  HubSoon,
  HubTimeline,
  HubTimelineSkeleton,
  type HubTabProps,
} from '@/components/fg/TimelineHub'
import type { ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { useRefreshTick } from '@/lib/autoRefresh'
import {
  HUB_THEME_LIMIT,
  HUB_THEME_STOCKS,
  hubCaption,
  monthDayWord,
  pickHubThemes,
  quoteExtOf,
  splitTimeline,
  themeMovers,
  type HubQuoteExt,
} from '@/lib/fg/hub'
import { issueTabPath } from '@/lib/fg/issuePage'
import { stockPath, themePath } from '@/lib/fg/paths'
import { themeLeader, weightedChangeOf } from '@/lib/fg/themes'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useHubSelection, useSeen } from '@/lib/fg/useHub'
import { fromState } from '@/lib/navigation'
import type { ApiState } from '@/lib/queries/useApi'
import { useThemeTimeline } from '@/lib/queries/useHubSlots'
import { useKeyed } from '@/lib/queries/useKeyed'
import { useStockIndex } from '@/lib/queries/useStocksCached'
import { fetchThemeStocks } from '@/lib/queries/useThemeStocks'
import { cn } from '@/lib/utils'

const HEADING = '움직인 테마에서 이슈 찾기'
const LIST_LABEL = '많이 움직인 테마, 오른 테마 다음 내린 테마'

function ThemeHead({ theme, open }: { theme: ThemeRes; open: boolean }) {
  const change = weightedChangeOf(theme)
  const leader = themeLeader(theme)
  const up = theme.upCount ?? 0
  const down = theme.downCount ?? 0
  return (
    <>
      <span className="fg-hh">
        <span className="fg-hh__who">
          <span className="fg-hh__name">{theme.name}</span>
          <span className="fg-hh__sub">
            {leader && (
              <>
                주도주{' '}
                <span className="fg-lg fg-lg--s">
                  <CompanyLogo name={leader.name} size={16} />
                  {leader.name}
                </span>
              </>
            )}
            {open && <span className="fg-num">{`${leader ? ' · ' : ''}종목 ${theme.stockCount}개`}</span>}
          </span>
        </span>
        <span className="fg-hh__ratio">
          <ThemeRatio up={up} down={down} caption={false} />
          <span className="fg-num">{`상승 ${up} · 하락 ${down}`}</span>
        </span>
      </span>
      <span className="fg-hh__px fg-num">
        {change === null ? <span className="fg-hh__chg">—</span> : <ChangeText value={change} className="fg-hh__chg" />}
      </span>
    </>
  )
}

interface ThemeBodyProps {
  theme: ThemeRes
  today: string
  from: string
  pane: ReactNode
}

function ThemeBody({ theme, today, from, pane }: ThemeBodyProps) {
  const timeline = useThemeTimeline(theme.id)
  const state = fromState(from)
  let content: ReactNode
  let more: ReactNode = null
  if (timeline.status === 'not-ready') {
    content = <HubSoon gap={timeline.gap} text="이 테마를 움직인 이슈는 준비 중이에요" />
  } else if (timeline.status === 'loading') {
    content = <HubTimelineSkeleton />
  } else if (timeline.status === 'error') {
    content = (
      <p className="fg-hubsoon">
        <span>이슈를 불러오지 못했어요</span>
        <RetryText subject="이슈" onRetry={timeline.retry} />
      </p>
    )
  } else {
    const split = splitTimeline(timeline.data.nodes)
    content = split ? (
      <HubTimeline
        label={`${theme.name} 이슈, 보도한 매체가 많은 순`}
        today={today}
        current={split.current}
        past={split.past}
        showTitle
        size="md"
        linkState={state}
      />
    ) : (
      <p className="fg-hubsoon">최근 이슈 중 이 테마 종목이 나온 이슈가 없어요</p>
    )
    if (split) {
      more = (
        <HubMore to={issueTabPath(split.current.id, 'timeline')} state={state}>
          타임라인 전체 보기
        </HubMore>
      )
    }
  }
  const day = timeline.status === 'ready' ? (timeline.data.nodes[0]?.day ?? null) : null
  const cap = day
    ? `${monthDayWord(day)} 테마 종목이 나온 이슈를 보도한 매체가 많은 순으로 모았어요`
    : '테마 종목이 나온 이슈를 보도한 매체가 많은 순으로 모았어요'
  return (
    <>
      <div className="fg-hubsec">
        <span className="fg-hubsec__title">
          이 테마를 움직인 이슈
          {timeline.status === 'ready' && timeline.mock && <MockBadge />}
        </span>
        <span className="fg-hubsec__cap">{cap}</span>
      </div>
      {content}
      {more}
      {pane && <HubInline>{pane}</HubInline>}
    </>
  )
}

interface ThemePaneProps {
  theme: ThemeRes
  stocks: readonly ThemeStockRes[] | null
  failed: boolean
  onRetry: () => void
  quoteOf: (row: ThemeStockRes) => HubQuoteExt | null
  basisShort: string | null
  from: string
}

function ThemePane({ theme, stocks, failed, onRetry, quoteOf, basisShort, from }: ThemePaneProps) {
  const change = weightedChangeOf(theme)
  const timeline = useThemeTimeline(theme.id)
  const split = timeline.status === 'ready' ? splitTimeline(timeline.data.nodes) : null
  const state = fromState(from)
  const rows = useMemo(() => (stocks ? themeMovers(stocks, change, HUB_THEME_STOCKS) : []), [stocks, change])
  const order = (change ?? 0) < 0 ? '하락률이 큰 순' : '등락률이 큰 순'
  const caption = [`테마 종목 ${theme.stockCount}개 중 ${order}`, basisShort].filter(Boolean).join(' · ')
  let list: ReactNode
  if (failed) {
    list = <ThemeIndexRetry message="테마 종목을 불러오지 못했어요" onRetry={onRetry} className="fg-hubp__retry" />
  } else if (stocks === null) {
    list = (
      <div className="fg-hubp__rows" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height={56} />
        ))}
      </div>
    )
  } else if (rows.length === 0) {
    list = <p className="fg-hubp__empty">오늘 시세가 있는 테마 종목이 없어요</p>
  } else {
    list = (
      <div className="fg-hubp__rows">
        {rows.map((row) => (
          <HubQuoteRow
            key={row.ticker}
            to={stockPath(row.ticker)}
            state={state}
            name={row.name}
            market={row.market}
            price={row.price}
            change={row.change}
          >
            <HubGapLine ext={quoteOf(row)} />
          </HubQuoteRow>
        ))}
      </div>
    )
  }
  return (
    <>
      <div className="fg-hubp__head">
        <span className="fg-hubp__title">많이 움직인 테마 종목</span>
        <span className="fg-hubp__cap fg-num">{caption}</span>
      </div>
      {list}
      <div className="fg-hubp__acts">
        <ButtonLink to={themePath(theme.id)} state={state}>{`테마 종목 ${theme.stockCount}개 보기`}</ButtonLink>
        {split && (
          <ButtonLink to={issueTabPath(split.current.id, 'timeline')} state={state}>
            타임라인 전체 보기
          </ButtonLink>
        )}
      </div>
    </>
  )
}

interface HubThemesProps extends HubTabProps {
  hot: ApiState<ThemeRes[] | null>
}

export function HubThemes({ layout, tabs, basis, basisShort, market, pick, onPick, today, from, refreshKey, hot }: HubThemesProps) {
  const wide = layout === 'wide'
  const themes = useMemo(() => (hot.data ? pickHubThemes(hot.data) : null), [hot.data])
  const keys = useMemo(() => (themes ?? []).map((theme) => String(theme.id)), [themes])
  const selected = useHubSelection(keys, pick, themes !== null, onPick)
  const theme = themes?.find((row) => String(row.id) === selected) ?? null
  const stocks = useKeyed(theme?.id ?? null, fetchThemeStocks)
  const index = useStockIndex()
  const baseDate = market?.baseDate ?? null
  const quoteOf = useCallback(
    (row: ThemeStockRes) => {
      const quote = index?.get(row.ticker)
      return quote
        ? quoteExtOf({ ...quote, changeStatus: row.changeStatus, tradingSuspended: row.tradingSuspended }, baseDate)
        : null
    },
    [index, baseDate],
  )
  const seen = useSeen(selected)
  const { refresh: refreshStocks, retry: retryStocks } = stocks
  useRefreshTick(refreshKey, refreshStocks)
  const skeleton = useDelayed(themes === null && !hot.error)

  const base = hubCaption('themes', { day: null, autoSec: null })
  const caption = layout === 'mobile' && basis ? `${base} · ${basis}` : base

  let body: ReactNode
  if (hot.error && themes === null) {
    body = (
      <StateBlock
        kind="error"
        title="데이터를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={hot.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (themes === null) {
    body = skeleton ? (
      <div className={cn('fg-hubskel', wide && 'fg-hubskel--wide')} aria-hidden="true">
        <div className="fg-hubskel__list">
          {Array.from({ length: HUB_THEME_LIMIT }, (_, i) => (
            <Skeleton key={i} height={72} />
          ))}
        </div>
        {wide && <Skeleton height={360} shape="card" />}
      </div>
    ) : (
      <div className="fg-hubskel" />
    )
  } else if (themes.length === 0 || theme === null) {
    body = (
      <StateBlock
        kind="empty"
        title="움직인 테마를 아직 고르지 못했어요"
        description="시세가 충분히 모이면 여기에 보여 드려요"
      />
    )
  } else {
    const pane = (
      <ThemePane
        key={theme.id}
        theme={theme}
        stocks={stocks.loading ? null : (stocks.data ?? [])}
        failed={stocks.error !== null}
        onRetry={retryStocks}
        quoteOf={quoteOf}
        basisShort={basisShort}
        from={from}
      />
    )
    body = (
      <HubBody
        layout={layout}
        listLabel={LIST_LABEL}
        items={themes.map((row) => {
          const key = String(row.id)
          const open = key === selected
          return (
            <HubItem
              key={key}
              open={open}
              bodyId={`fg-hub-theme-${key}`}
              head={<ThemeHead theme={row} open={open} />}
              onPick={() => onPick(key)}
            >
              {seen.has(key) && <ThemeBody theme={row} today={today} from={from} pane={!wide && open ? pane : null} />}
            </HubItem>
          )
        })}
        panel={
          <HubPanel label={`${theme.name} 테마 종목`} paneKey={String(theme.id)} live="polite">
            {pane}
          </HubPanel>
        }
      />
    )
  }

  return (
    <HubFrame heading={HEADING} tab="themes" tabs={tabs} basis={basis} caption={caption} layout={layout}>
      {body}
    </HubFrame>
  )
}
