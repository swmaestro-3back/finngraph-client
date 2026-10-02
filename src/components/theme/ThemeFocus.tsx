import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { LeaderStockCard } from '@/components/theme/LeaderStockCard'
import { Breadth, CloseDate, ThemeMetricCaption } from '@/components/theme/ThemeMetricSummary'
import type { ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { changeColorClass, formatChange, formatChangeOrDash, formatCompactKrw } from '@/lib/format'
import { countLabel, hasBreadth, turnoverFact } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

interface ThemeFocusProps {
  theme: ThemeRes
  /** 선택한 테마의 구성 종목 — 대장주 비교에 쓴다 */
  stocks: ThemeStockRes[]
  from: string
}

interface FactProps {
  label: string
  tone?: string
  children: ReactNode
}

/** 명세표 한 줄 — 라벨은 왼쪽, 값은 오른쪽 끝에 맞춘다 */
function Fact({ label, tone, children }: FactProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-surface-inset py-1.5 last:border-b-0">
      <dt className="shrink-0 text-caption text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-right font-mono text-sm font-medium tabular-nums text-foreground',
          tone,
        )}
      >
        {children}
      </dd>
    </div>
  )
}

/**
 * 설명은 테마마다 1줄에서 7줄까지 들쭉날쭉하다 — 4줄에서 접어 옆의 지표 칸과 높이를 맞추고,
 * 넘칠 때만 펼치기 버튼을 둔다.
 */
function Description({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  const measure = () => {
    const el = ref.current
    // 펼친 동안에는 넘침을 잴 수 없으니 접힌 상태에서 잰 값을 그대로 둔다
    if (!el || expanded) return
    setOverflowing(el.scrollHeight - el.clientHeight > 1)
  }

  useLayoutEffect(measure, [text, expanded])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [expanded])

  return (
    <div className="mt-1.5 max-w-[72ch]">
      <p
        ref={ref}
        id="theme-focus-description"
        className={cn(
          'text-body leading-relaxed text-foreground-secondary break-keep [text-wrap:pretty]',
          !expanded && 'line-clamp-4',
        )}
      >
        {text}
      </p>
      {overflowing && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="theme-focus-description"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 flex min-h-11 cursor-pointer items-center rounded text-caption font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-0"
        >
          {expanded ? '설명 접기' : '설명 더 보기'}
        </button>
      )}
    </div>
  )
}

const PERIODS: readonly { key: 'w1' | 'm1' | 'm3'; label: string }[] = [
  { key: 'w1', label: '1주' },
  { key: 'm1', label: '1개월' },
  { key: 'm3', label: '3개월' },
]

const TEXT_LINK = 'flex min-h-11 items-center hover:underline md:min-h-0'

export function ThemeFocus({ theme, stocks, from }: ThemeFocusProps) {
  const state = { from }
  const periods = PERIODS.filter((p) => theme[p.key] !== null)
  const changeTone = theme.change === null ? 'text-muted-foreground' : changeColorClass(theme.change)
  const turnover = turnoverFact(theme.tradingValueRatio)

  return (
    <section aria-labelledby="theme-focus-title" className="card-surface p-5">
      <div className="flex flex-col gap-x-6 gap-y-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2
            id="theme-focus-title"
            className="text-title font-semibold tracking-[-0.4px] text-foreground"
          >
            {theme.name}
          </h2>
          <span className="inline-flex items-baseline gap-1.5">
            <span className={cn('font-mono text-base font-medium tabular-nums', changeTone)}>
              {formatChangeOrDash(theme.change)}
            </span>
            <CloseDate baseDate={theme.baseDate} />
          </span>
          <FavoriteStar type="THEME" targetKey={String(theme.id)} label={theme.name} size="sm" />
        </div>
        <div className="flex shrink-0 items-center gap-4 text-xs font-semibold text-primary sm:pt-1">
          <Link to={`/theme/${theme.id}`} state={state} className={TEXT_LINK}>
            테마 상세 →
          </Link>
          <Link
            to={`/graph/theme/${encodeURIComponent(theme.name)}`}
            state={state}
            className={TEXT_LINK}
          >
            기업 그래프 →
          </Link>
        </div>
      </div>

      {/* 넓은 화면에서는 설명 옆 빈자리에 지표를 세운다 — 좁으면 설명 아래로 내려간다.
          칸 나눔은 아래 대장주(목록 5 : 차트 7)와 같아 지표가 차트 바로 위에 놓인다 */}
      <div className="mt-1 grid gap-x-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0">
          <ThemeMetricCaption theme={theme} />
          {theme.description && <Description text={theme.description} />}
        </div>

        {/* 왼쪽은 오늘의 규모, 오른쪽은 기간 수익률 — 설명 길이와 상관없이 늘 같은 자리·같은 높이 */}
        <div className="mt-4 grid content-start gap-x-8 border-t border-border pt-2.5 sm:grid-cols-[1.4fr_1fr] xl:mt-0 xl:border-t-0 xl:pt-0">
          <dl>
            {hasBreadth(theme) ? (
              <>
                <Fact label="집계">{countLabel(theme.pricedCount, theme.stockCount)}</Fact>
                <Fact label="등락 현황">
                  <Breadth
                    up={theme.upCount}
                    flat={
                      theme.flatCount ??
                      Math.max(0, theme.pricedCount - theme.upCount - theme.downCount)
                    }
                    down={theme.downCount}
                  />
                </Fact>
                {(theme.suspendedCount ?? 0) > 0 && (
                  <Fact label="거래정지">{theme.suspendedCount}</Fact>
                )}
              </>
            ) : (
              <Fact label="구성 종목">{theme.stockCount}개</Fact>
            )}
            <Fact label="거래대금">
              {formatCompactKrw(theme.tradingValue)}
              {turnover && (
                <>
                  <span className="mx-1.5 text-foreground-tertiary" aria-hidden>
                    ·
                  </span>
                  <span
                    className={cn(
                      'font-normal',
                      turnover.emphasized ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {turnover.multiple}
                  </span>
                </>
              )}
            </Fact>
            <Fact label="시가총액">{formatCompactKrw(theme.marketCap)}</Fact>
          </dl>
          {periods.length > 0 && (
            <dl>
              {periods.map((p) => {
                const value = theme[p.key] as number
                return (
                  <Fact key={p.key} label={p.label} tone={changeColorClass(value)}>
                    {formatChange(value)}
                  </Fact>
                )
              })}
            </dl>
          )}
        </div>
      </div>

      <LeaderStockCard themeName={theme.name} stocks={stocks} embedded />
    </section>
  )
}
