import { useCallback, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { NODE_COLORS } from '@/data/graphTypes'
import type { StockRowRes } from '@/lib/apiTypes'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  stocks: StockRowRes[]
  onSelectTicker: (ticker: string) => void
}

const MAX_RESULTS = 8
const LISTBOX_ID = 'graph-search-results'

export function SearchBar({ stocks, onSelectTicker }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return stocks
      .filter((s) => s.name.toLowerCase().includes(q) || s.ticker.includes(q))
      .slice(0, MAX_RESULTS)
  }, [query, stocks])

  const showList = open && results.length > 0

  const select = useCallback(
    (ticker: string) => {
      onSelectTicker(ticker)
      setOpen(false)
      setQuery('')
      setActiveIndex(0)
      inputRef.current?.blur()
    },
    [onSelectTicker],
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
      if (target) select(target.ticker)
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
        placeholder="종목 검색 (이름 · 코드)"
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
          {results.map((s, i) => (
            <div
              key={s.ticker}
              id={`${LISTBOX_ID}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown 시 input blur를 막아야 click이 살아남는다
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => select(s.ticker)}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3.5 py-2.5 not-last:border-b not-last:border-surface-inset',
                i === activeIndex && 'bg-surface-inset',
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: NODE_COLORS.company }}
              />
              <span className="text-body font-semibold text-foreground">{s.name}</span>
              <span className="ml-auto font-mono text-caption text-muted-foreground">
                {s.ticker}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
