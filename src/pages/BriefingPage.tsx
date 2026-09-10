import { useMemo } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { MoverFeed } from '@/components/theme/MoverFeed'
import { Button } from '@/components/ui/button'
import type { ThemeRes } from '@/lib/apiTypes'
import {
  buildBriefingParagraph,
  pickMovers,
  pickSpotlightThemes,
  type BriefingParagraph,
} from '@/lib/briefing'
import { changeColorClass, formatChangeOrDash, formatCompactKrw } from '@/lib/format'
import { josa } from '@/lib/josa'
import { fromState } from '@/lib/navigation'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { useThemeNews } from '@/lib/queries/useThemeNews'
import { useThemes } from '@/lib/queries/useThemes'
import { cn } from '@/lib/utils'

function ThemeLink({ id, name }: { id: number; name: string }) {
  const { pathname } = useLocation()
  return (
    <Link
      to={`/theme/${id}`}
      state={fromState(pathname)}
      className="font-medium text-primary hover:underline"
    >
      {name}
    </Link>
  )
}

function ChangeNum({ value }: { value: number | null }) {
  return (
    <span className={cn('font-mono font-semibold', changeColorClass(value ?? 0))}>
      {formatChangeOrDash(value)}
    </span>
  )
}

function MarketParagraph({ briefing }: { briefing: BriefingParagraph }) {
  return (
    <div className="card-surface p-5">
      <p className="text-body leading-[1.8] text-foreground">
        전체{' '}
        <span className="font-mono font-semibold">
          {briefing.total.toLocaleString('ko-KR')}
        </span>
        개 종목 중 상승{' '}
        <span className="font-mono font-semibold text-stock-up">
          {briefing.up.toLocaleString('ko-KR')}
        </span>
        {' · '}하락{' '}
        <span className="font-mono font-semibold text-stock-down">
          {briefing.down.toLocaleString('ko-KR')}
        </span>
        {' · '}보합{' '}
        <span className="font-mono font-semibold">
          {briefing.flat.toLocaleString('ko-KR')}
        </span>
        {josa(String(briefing.flat), '으로/로')}, 상승 종목 비율은{' '}
        <span className="font-mono font-semibold">{briefing.upRatio.toFixed(1)}%</span>
        입니다.
        {briefing.topTheme && (
          <>
            {' '}오늘 가장 강한 테마는{' '}
            <ThemeLink id={briefing.topTheme.id} name={briefing.topTheme.name} />(
            <ChangeNum value={briefing.topTheme.change} />)
            {briefing.topTheme.leader ? (
              <>
                이며, {briefing.topTheme.leader}
                {josa(briefing.topTheme.leader, '이/가')} 상승을 주도했습니다.
              </>
            ) : (
              <>입니다.</>
            )}
          </>
        )}
        {briefing.bottomTheme && (
          <>
            {' '}가장 부진한 테마는{' '}
            <ThemeLink id={briefing.bottomTheme.id} name={briefing.bottomTheme.name} />(
            <ChangeNum value={briefing.bottomTheme.change} />)입니다.
          </>
        )}
        {briefing.topValueTheme && (
          <>
            {' '}거래대금은{' '}
            <ThemeLink id={briefing.topValueTheme.id} name={briefing.topValueTheme.name} /> 테마에{' '}
            <span className="font-mono font-semibold">
              {formatCompactKrw(briefing.topValueTheme.tradingValue)}
            </span>
            {josa(formatCompactKrw(briefing.topValueTheme.tradingValue), '으로/로')} 가장 많이
            몰렸습니다.
          </>
        )}
      </p>
    </div>
  )
}

function SpotlightCard({ theme }: { theme: ThemeRes }) {
  const { pathname } = useLocation()
  const { data: news, loading } = useThemeNews(theme.id)
  const headlines = (news ?? []).slice(0, 2)
  const leader = theme.topStocks[0]?.name ?? null

  return (
    <div className="card-surface flex flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          to={`/theme/${theme.id}`}
          state={fromState(pathname)}
          className="truncate text-body font-semibold text-foreground hover:text-primary"
        >
          {theme.name}
        </Link>
        <span
          className={cn(
            'shrink-0 font-mono text-body font-semibold',
            changeColorClass(theme.change ?? 0),
          )}
        >
          {formatChangeOrDash(theme.change)}
        </span>
      </div>
      {theme.description && (
        <p className="line-clamp-2 text-caption text-muted-foreground">
          {theme.description}
        </p>
      )}
      {leader && (
        <p className="text-caption text-muted-foreground">
          주도주 <span className="font-medium text-foreground">{leader}</span>
        </p>
      )}
      {loading ? (
        <div className="flex flex-col gap-1.5 border-t border-surface-inset pt-2">
          <div className="h-3.5 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      ) : headlines.length > 0 ? (
        <ul className="flex flex-col gap-1 border-t border-surface-inset pt-2">
          {headlines.map((n) => (
            <li key={n.id} className="line-clamp-1 text-caption text-muted-foreground">
              {n.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default function BriefingPage() {
  const {
    data: themes,
    loading: themesLoading,
    error: themesError,
    refetch: refetchThemes,
  } = useThemes()
  const {
    data: stocks,
    loading: stocksLoading,
    error: stocksError,
    refetch: refetchStocks,
  } = useStocksCached()

  const loading = themesLoading || stocksLoading
  const error = themesError ?? stocksError

  const briefing = useMemo(
    () => (themes && stocks ? buildBriefingParagraph(stocks, themes) : null),
    [themes, stocks],
  )
  const spotlight = useMemo(
    () => (themes ? pickSpotlightThemes(themes, 3) : []),
    [themes],
  )
  const movers = useMemo(() => (stocks ? pickMovers(stocks, 10) : []), [stocks])

  const retry = () => {
    refetchThemes()
    refetchStocks()
  }

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-5 flex items-baseline gap-[9px]">
        <h1 className="text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">
          데일리 브리핑
        </h1>
        <span className="text-body text-muted-foreground">2026-07-31 (금) 장마감 기준</span>
      </div>

      {loading && (
        <div className="flex flex-col gap-5">
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <CircleAlert className="size-8 text-muted-foreground" />
          <p className="text-body text-muted-foreground">
            {error.isRetryable
              ? '일시적으로 데이터를 불러올 수 없습니다.'
              : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
          {error.isRetryable && (
            <Button variant="outline" size="sm" onClick={retry}>
              <RotateCw data-icon="inline-start" />
              다시 시도
            </Button>
          )}
        </div>
      )}

      {!loading && !error && briefing && (
        <>
          <section>
            <h2 className="mb-3 text-lg font-medium tracking-[-0.4px] text-foreground">
              오늘의 시장
            </h2>
            <MarketParagraph briefing={briefing} />
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-medium tracking-[-0.4px] text-foreground">
              주목 테마
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {spotlight.map((theme) => (
                <SpotlightCard key={theme.name} theme={theme} />
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-lg font-medium tracking-[-0.4px] text-foreground">
              특징주 10선
            </h2>
            <MoverFeed movers={movers} />
          </section>
        </>
      )}

      <p className="mt-5 text-caption text-muted-foreground">
        표시된 시세·등락률·뉴스는 데모용 시드 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
