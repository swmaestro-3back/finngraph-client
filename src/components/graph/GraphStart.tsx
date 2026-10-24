import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { ChevronRight, Lock, X } from 'lucide-react'
import { ChangeText } from '@/components/graph/DetailParts'
import { GraphBackdrop } from '@/components/graph/GraphBackdrop'
import { SearchBar } from '@/components/search/SearchBar'
import type { GraphFocus } from '@/data/graphTypes'
import { useIsMobile } from '@/hooks/use-mobile'
import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'
import { useFavorites } from '@/lib/favorites'
import {
  fallbackPick,
  favoritePicks,
  loadRecentPicks,
  moverPicks,
  pickKey,
  STARTER_PICKS,
  type GraphPick,
} from '@/lib/graphStart'
import { loadStocks } from '@/lib/queries/useStocksCached'
import { loadThemes } from '@/lib/queries/useThemesCached'
import { cn } from '@/lib/utils'

interface Props {
  ready: boolean
  guest: boolean
  onSelect: (focus: GraphFocus) => void
  onExample: () => void
}

interface PickGroup {
  label: string
  picks: GraphPick[]
}

const NO_STOCKS: readonly StockRowRes[] = []
const NO_THEMES: readonly ThemeRes[] = []

export function GraphStart({ ready, guest, onSelect, onExample }: Props) {
  const isMobile = useIsMobile()
  const titleId = useId()
  const [recent] = useState(loadRecentPicks)
  const fallback = fallbackPick(recent)
  const { items } = useFavorites()
  const [stocks, setStocks] = useState<readonly StockRowRes[]>(NO_STOCKS)
  const [themes, setThemes] = useState<readonly ThemeRes[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    loadStocks().then(
      (rows) => alive && setStocks(rows),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [])

  const ensureThemes = () => {
    if (themes) return
    loadThemes().then(setThemes, () => setFailed(true))
  }

  const dismiss = useCallback(() => (guest ? onExample() : onSelect(fallback.focus)), [guest, onExample, onSelect, fallback])

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const target = e.target as HTMLInputElement | null
      if (target?.tagName === 'INPUT' && target.value) return
      dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, dismiss])

  const groups = useMemo<PickGroup[]>(() => {
    const movers = moverPicks(stocks)
    const favorites = favoritePicks(items)
    const list: PickGroup[] =
      recent.length > 0
        ? [
            { label: '최근 본 기업·테마', picks: recent },
            favorites.length > 0
              ? { label: '관심 목록', picks: favorites }
              : { label: '오늘 많이 움직인 종목', picks: movers },
          ]
        : [
            { label: '이런 기업부터 볼 수 있어요', picks: [...STARTER_PICKS] },
            { label: '오늘 많이 움직인 종목', picks: movers },
          ]
    return list.filter((group) => group.picks.length > 0)
  }, [recent, items, stocks])

  return (
    <GraphBackdrop dim live={ready && !guest}>
      {ready && (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className={cn(
            'absolute z-10 flex flex-col gap-5 bg-background text-foreground',
            isMobile
              ? 'inset-x-0 bottom-0 rounded-t-[28px] px-4 pt-3 pb-5 shadow-[0_-12px_28px_-8px_rgb(0_0_0/0.25)] animate-in fade-in-0 slide-in-from-bottom-6 duration-300 motion-reduce:animate-none'
              : 'fg-gcard top-1/2 left-1/2 w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] p-6 shadow-[0_0_0_1px_var(--border-divider),0_30px_60px_-30px_var(--shadow-strong-color)]',
          )}
        >
          {isMobile && <span aria-hidden className="mx-auto -mb-2 h-1 w-9 rounded-full bg-border" />}
          <button
            type="button"
            onClick={dismiss}
            aria-label={guest ? '닫고 예시 그래프 보기' : `닫고 ${fallback.label} 보기`}
            className={cn(
              'fg-gclose absolute right-3 grid size-8 cursor-pointer place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground',
              isMobile ? 'top-4' : 'top-3',
            )}
          >
            <X className="size-[18px]" strokeWidth={2} />
          </button>
          <div className="flex flex-col gap-1 pr-8">
            <p className="m-0 text-micro font-semibold tracking-[0.5px] text-primary">관계 탐색</p>
            <h2 id={titleId} className="m-0 text-lg leading-[1.4] font-semibold tracking-[-0.3px]">
              어떤 기업의 관계를 볼까요?
            </h2>
            <p className="m-0 text-body text-muted-foreground">
              고른 기업을 가운데 두고 공급·투자·이벤트로 이어진 곳을 보여 드려요.
            </p>
            {guest && (
              <p className="m-0 mt-0.5 flex items-center gap-1.5 text-caption text-muted-foreground">
                <Lock className="size-3.5 shrink-0" strokeWidth={2} />
                회원 전용 · 고른 뒤 로그인하면 바로 이어져요
              </p>
            )}
          </div>
          <SearchBar
            stocks={stocks}
            themes={themes ?? NO_THEMES}
            onSelect={onSelect}
            onFocus={ensureThemes}
            notice={failed ? '검색 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' : null}
            placeholder="기업명, 종목코드, 테마"
            autoFocus={!isMobile}
            className="[&_input]:h-11"
          />
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <p className="m-0 text-caption font-medium text-muted-foreground">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.picks.map((pick) => (
                  <PickChip key={pickKey(pick.focus)} pick={pick} onSelect={onSelect} />
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={dismiss} className="fg-sdmore self-start">
            {guest ? '예시 그래프로 먼저 둘러보기' : `${fallback.label}로 바로 보기`}
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}
    </GraphBackdrop>
  )
}

function PickChip({ pick, onSelect }: { pick: GraphPick; onSelect: (focus: GraphFocus) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pick.focus)}
      className="fg-gpick inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-background px-3 text-body font-medium text-foreground hover:border-border-strong hover:bg-muted"
    >
      {pick.focus.kind === 'theme' && <span className="text-micro text-muted-foreground">테마</span>}
      {pick.label}
      {pick.change != null && <ChangeText value={pick.change} className="text-caption" />}
    </button>
  )
}
