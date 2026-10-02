import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { CATEGORY_COLORS, type GraphFocus } from '@/data/graphTypes'
import { StockLogo } from '@/components/stock/StockLogo'
import { Input } from '@/components/ui/input'
import { searchResults, type SearchableStock, type SearchableTheme } from '@/lib/searchResults'
import { cn } from '@/lib/utils'

interface Props {
  stocks: readonly SearchableStock[]
  /** 생략하면 종목만 검색한다(헤더) */
  themes?: readonly SearchableTheme[]
  /** 고른 항목 — 헤더는 상세 페이지로, 그래프는 원점 변경으로 이어 간다 */
  onSelect: (focus: GraphFocus) => void
  /** outline: 테두리 있는 rounded-lg(그래프 사이드바), pill: 테두리 없이 배경색만(헤더) — 모서리는 outline과 같다 */
  variant?: 'outline' | 'pill'
  placeholder?: string
  autoFocus?: boolean
  /** 첫 포커스에 데이터를 지연 로드하는 쪽(헤더)이 쓴다 */
  onFocus?: () => void
  /** 로드 실패 등 외부 사정 — 결과 목록 대신 이 문구를 드롭다운 자리에 띄운다 */
  notice?: string | null
  className?: string
  /** 드롭다운 폭·위치 — 기본은 입력창과 같은 폭 */
  dropdownClassName?: string
  /** 이 키를 누르면 어디서든 검색창으로 들어온다(헤더 '/') — 입력창 안에 키 표시도 띄운다 */
  shortcutKey?: string
}

/** 글을 쓰는 중인 곳 — 여기서 누른 단축키는 글자이지 명령이 아니다 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const LISTBOX_ID = 'search-results'

// 기본값을 인라인 []로 두면 렌더마다 새 배열이라 결과 메모가 깨진다
const NO_THEMES: readonly SearchableTheme[] = []

const INPUT_VARIANT = {
  outline: 'rounded-lg pl-11 text-sm',
  pill: 'rounded-lg border-0 bg-muted pr-5 pl-12 text-base focus-visible:ring-0 md:text-base dark:bg-muted',
} as const

const ICON_VARIANT = {
  outline: 'left-3.5',
  pill: 'left-5',
} as const

export function SearchBar({
  stocks,
  themes = NO_THEMES,
  onSelect,
  variant = 'outline',
  placeholder = '종목 · 테마 검색',
  autoFocus,
  onFocus,
  notice,
  className,
  dropdownClassName = 'right-0 left-0',
  shortcutKey,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  // Enter로 이동하지 못한 검색어 — 침묵시키면 검색창이 "고장난 것처럼" 보인다
  const [noMatch, setNoMatch] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!shortcutKey) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== shortcutKey || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const input = inputRef.current
      // 좁은 화면에서 숨겨진(display:none) 검색창은 포커스할 수 없다 — 키를 가로채지 않는다
      if (!input || input.offsetParent === null) return
      e.preventDefault()
      input.focus()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcutKey])

  const results = useMemo(() => searchResults(query, stocks, themes), [query, stocks, themes])

  const showList = open && !notice && results.length > 0
  const message = notice ?? (noMatch ? `'${noMatch}' 검색 결과가 없습니다.` : null)
  const showMessage = open && message !== null

  const select = useCallback(
    (focus: GraphFocus) => {
      onSelect(focus)
      setOpen(false)
      setQuery('')
      setActiveIndex(0)
      setNoMatch(null)
      inputRef.current?.blur()
    },
    [onSelect],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    // 한글 조합 중 Enter는 글자 확정이지 검색 확정이 아니다
    if (e.nativeEvent.isComposing) return

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!showList) return
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((i) => (i + delta + results.length) % results.length)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const target = results[activeIndex]
      if (target) {
        select(target.focus)
      } else if (query.trim()) {
        setNoMatch(query.trim())
        setOpen(true)
      }
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn(
          'pointer-events-none absolute top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground',
          ICON_VARIANT[variant],
        )}
        strokeWidth={2}
      />
      <Input
        ref={inputRef}
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(e.target.value.trim().length > 0)
          setActiveIndex(0)
          setNoMatch(null)
        }}
        onFocus={() => {
          onFocus?.()
          setOpen(query.trim().length > 0)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn('peer h-10', INPUT_VARIANT[variant], shortcutKey && 'pr-10')}
        role="combobox"
        aria-expanded={showList}
        aria-controls={LISTBOX_ID}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${LISTBOX_ID}-${activeIndex}` : undefined}
        aria-keyshortcuts={shortcutKey}
      />
      {/* 단축키 안내 — 입력 중에는 글자와 겹치지 않게 숨긴다 */}
      {shortcutKey && !query && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded border border-border bg-background font-mono text-caption text-muted-foreground peer-focus:hidden"
        >
          {shortcutKey}
        </kbd>
      )}

      {showMessage && (
        <p
          role="status"
          className={cn(
            'absolute top-[calc(100%+4px)] z-100 rounded-lg border border-border bg-background px-4 py-3 text-caption text-muted-foreground shadow-soft',
            dropdownClassName,
          )}
        >
          {message}
        </p>
      )}

      {showList && (
        <div
          id={LISTBOX_ID}
          role="listbox"
          className={cn(
            'absolute top-[calc(100%+4px)] z-100 max-h-80 overflow-y-auto rounded-lg border border-border bg-background shadow-soft',
            dropdownClassName,
          )}
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
              {/* 종목은 주식 목록의 종목명 칸과 같은 로고, 테마는 색 점 */}
              {r.focus.kind === 'company' ? (
                <StockLogo ticker={r.focus.ticker} size={24} reserveSpace />
              ) : (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: CATEGORY_COLORS[r.category] }}
                />
              )}
              <span className="truncate text-body font-semibold text-foreground">{r.label}</span>
              <span className="ml-auto shrink-0 font-mono text-caption text-muted-foreground">
                {r.meta}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
