import { useCallback, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import {
  CATEGORY_COLORS,
  marketCategory,
  type GraphFocus,
  type NodeCategory,
} from '@/data/graphTypes'
import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  stocks: StockRowRes[]
  themes: ThemeRes[]
  /** 고른 항목을 그래프의 원점으로 — 기업은 공급망, 테마는 소속 기업을 그린다 */
  onSelect: (focus: GraphFocus) => void
}

/** 드롭다운 한 줄 — 종목과 테마를 같은 목록에 섞어 보이되 색 점으로 구분한다 */
interface SearchResult {
  key: string
  label: string
  /** 우측 보조 표기 — 종목은 코드, 테마는 '테마' */
  meta: string
  category: NodeCategory
  focus: GraphFocus
}

const MAX_RESULTS = 8
/** 결과 8칸 중 테마에 내주는 최대 칸 — 종목이 훨씬 많아 테마가 밀려나지 않도록 */
const THEME_SLOTS = 3
const LISTBOX_ID = 'graph-search-results'

export function SearchBar({ stocks, themes, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const themeHits = themes.filter((t) => t.name.toLowerCase().includes(q)).slice(0, THEME_SLOTS)
    const stockHits = stocks
      .filter((s) => s.name.toLowerCase().includes(q) || s.ticker.includes(q))
      .slice(0, MAX_RESULTS - themeHits.length)
    return [
      ...stockHits.map(
        (s): SearchResult => ({
          key: `company:${s.ticker}`,
          label: s.name,
          meta: s.ticker,
          category: marketCategory(s.market),
          focus: { kind: 'company', ticker: s.ticker },
        }),
      ),
      ...themeHits.map(
        (t): SearchResult => ({
          key: `theme:${t.name}`,
          label: t.name,
          meta: '테마',
          category: 'theme',
          focus: { kind: 'theme', name: t.name },
        }),
      ),
    ]
  }, [query, stocks, themes])

  const showList = open && results.length > 0

  const select = useCallback(
    (focus: GraphFocus) => {
      onSelect(focus)
      setOpen(false)
      setQuery('')
      setActiveIndex(0)
      inputRef.current?.blur()
    },
    [onSelect],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!showList) return

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((i) => (i + delta + results.length) % results.length)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const target = results[activeIndex]
      if (target) select(target.focus)
    }
  }

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
      />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(e.target.value.trim().length > 0)
          setActiveIndex(0)
        }}
        onFocus={() => setOpen(query.trim().length > 0)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder="종목 · 테마 검색"
        className="h-10 rounded-xl pl-11 text-sm"
        role="combobox"
        aria-expanded={showList}
        aria-controls={LISTBOX_ID}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${LISTBOX_ID}-${activeIndex}` : undefined}
      />

      {showList && (
        <div
          id={LISTBOX_ID}
          role="listbox"
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-100 max-h-80 overflow-y-auto rounded-xl border border-border bg-background shadow-soft"
        >
          {results.map((r, i) => (
            <div
              key={r.key}
              id={`${LISTBOX_ID}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown 시 input blur를 막아야 click이 살아남는다
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => select(r.focus)}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3.5 py-2.5 not-last:border-b not-last:border-surface-inset',
                i === activeIndex && 'bg-surface-inset',
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: CATEGORY_COLORS[r.category] }}
              />
              <span className="text-body font-semibold text-foreground">{r.label}</span>
              <span className="ml-auto font-mono text-caption text-muted-foreground">
                {r.meta}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
