import { useCallback, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { NODE_COLORS, ENTITY_LABELS, type GraphNode } from '@/data/graphTypes'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  onSelectResult: (nodeId: string) => void
  nodes: GraphNode[]
}

const MAX_RESULTS = 8
const LISTBOX_ID = 'graph-search-results'

/** 엔티티(기업·제품·원자재·국가)를 라벨/별칭으로 검색 */
export function SearchBar({ onSelectResult, nodes }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return nodes
      .filter((n) => {
        if (n.label.toLowerCase().includes(q)) return true
        const aliases = n.data.aliases ?? []
        return aliases.some((a) => a.toLowerCase().includes(q))
      })
      .slice(0, MAX_RESULTS)
  }, [query, nodes])

  const showList = open && results.length > 0

  const select = useCallback(
    (id: string) => {
      onSelectResult(id)
      setOpen(false)
      setQuery('')
      setActiveIndex(0)
      inputRef.current?.blur()
    },
    [onSelectResult],
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
      if (target) select(target.id)
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
        placeholder="기업 · 제품 · 원자재 검색"
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
          {results.map((n, i) => (
            <div
              key={n.id}
              id={`${LISTBOX_ID}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown 시 input blur를 막아야 click이 살아남는다
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => select(n.id)}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3.5 py-2.5 not-last:border-b not-last:border-surface-inset',
                i === activeIndex && 'bg-surface-inset',
              )}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: NODE_COLORS[n.type] }}
              />
              <span className="text-body font-semibold text-foreground">{n.label}</span>
              <span className="ml-auto text-caption text-muted-foreground">
                {ENTITY_LABELS[n.type]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
