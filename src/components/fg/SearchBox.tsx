import { Search } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'
import { searchKeyAction, searchOptions, type SearchOption } from '@/lib/fg/search'
import { fromState } from '@/lib/navigation'
import { loadStocks } from '@/lib/queries/useStocksCached'
import { loadThemes } from '@/lib/queries/useThemesCached'
import { cn } from '@/lib/utils'

interface SearchData {
  stocks: StockRowRes[]
  themes: ThemeRes[]
}

interface SearchBoxProps {
  className?: string
  inputRef?: RefObject<HTMLInputElement | null>
  autoFocus?: boolean
  onDone?: () => void
  onEscape?: () => void
}

const GROUPS = [
  { group: 'stock', label: '종목' },
  { group: 'theme', label: '테마' },
] as const

export function SearchBox({ className, inputRef, autoFocus = false, onDone, onEscape }: SearchBoxProps) {
  const baseId = useId()
  const listId = `${baseId}-list`
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [data, setData] = useState<SearchData | null>(null)
  const [failed, setFailed] = useState(false)

  const ensureData = () => {
    if (data) return
    Promise.all([loadStocks(), loadThemes()])
      .then(([stocks, themes]) => {
        setData({ stocks, themes })
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }

  const options = useMemo(() => searchOptions(query, data?.stocks ?? [], data?.themes ?? []), [query, data])
  const showPanel = open && query.trim().length > 0
  const optionId = (option: SearchOption) => `${baseId}-${option.key}`

  let status: string | null = null
  if (showPanel) {
    if (failed) status = '검색 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
    else if (data === null) status = '검색 데이터를 불러오는 중이에요'
    else if (options.length === 0) status = `'${query.trim()}'에 맞는 종목·테마가 없어요`
  }
  const listOpen = showPanel && status === null

  const go = (option: SearchOption) => {
    setOpen(false)
    setQuery('')
    onDone?.()
    navigate(option.to, { state: fromState(pathname) })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const action = searchKeyAction(
      { key: e.key, isComposing: e.nativeEvent.isComposing, keyCode: e.nativeEvent.keyCode },
      { open: listOpen, active, count: options.length },
    )
    if (action.type === 'none') return
    e.preventDefault()
    if (action.type === 'open') {
      setOpen(true)
      setActive(action.index)
    } else if (action.type === 'move') setActive(action.index)
    else if (action.type === 'go') go(options[action.index])
    else {
      setOpen(false)
      onEscape?.()
    }
  }

  let panel = null
  if (showPanel) {
    if (status !== null) {
      panel = <p className="fg-spanel__empty">{status}</p>
    } else {
      panel = (
        <div id={listId} role="listbox" aria-label="검색 결과">
          {GROUPS.map(({ group, label }) => {
            const items = options.filter((option) => option.group === group)
            if (items.length === 0) return null
            return (
              <div key={group} role="group" aria-label={label} className="fg-spanel__group">
                <span className="fg-spanel__label" aria-hidden="true">
                  {label}
                </span>
                {items.map((option) => {
                  const index = options.indexOf(option)
                  return (
                    <div
                      key={option.key}
                      id={optionId(option)}
                      role="option"
                      aria-selected={index === active}
                      className="fg-spanel__opt"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(option)}
                    >
                      <span>{option.label}</span>
                      <span className="fg-spanel__meta">{option.meta}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )
    }
  }

  return (
    <div role="search" className={cn('fg-searchbox', className)}>
      <label className="fg-gh__field">
        <Search size={18} strokeWidth={1.75} aria-hidden="true" />
        <span className="fg-sr">종목, 테마 검색</span>
        <input
          ref={inputRef}
          type="search"
          placeholder="종목, 테마 검색"
          autoFocus={autoFocus}
          value={query}
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={listOpen && options[active] ? optionId(options[active]) : undefined}
          onFocus={() => {
            ensureData()
            setOpen(true)
          }}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        <kbd aria-hidden="true">/</kbd>
      </label>
      {panel && <div className="fg-spanel">{panel}</div>}
      <p className="fg-sr" role="status">
        {status ?? ''}
      </p>
    </div>
  )
}
