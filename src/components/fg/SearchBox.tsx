import { Search } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { kstToday } from '@/lib/calendar'
import {
  narrowSearch,
  remoteSearchOptions,
  SEARCH_GROUPS,
  searchKeyAction,
  searchOptions,
  type SearchOption,
} from '@/lib/fg/search'
import { fromState } from '@/lib/navigation'
import { useKeyed } from '@/lib/queries/useKeyed'
import { loadLocalSearch, useRemoteSearch, type SearchDone } from '@/lib/queries/useSearch'
import { cn } from '@/lib/utils'

const LOCAL_KEY = 'all'
const LOADING = '검색 데이터를 불러오는 중이에요'

interface SearchBoxProps {
  className?: string
  inputRef?: RefObject<HTMLInputElement | null>
  autoFocus?: boolean
  onDone?: () => void
  onEscape?: () => void
}

function related(done: SearchDone | null, query: string): boolean {
  return done !== null && (query.startsWith(done.query) || done.query.startsWith(query))
}

export function SearchBox({ className, inputRef, autoFocus = false, onDone, onEscape }: SearchBoxProps) {
  const baseId = useId()
  const listId = `${baseId}-list`
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [today] = useState(() => kstToday(new Date()))
  const remote = useRemoteSearch(query)
  const trimmed = query.trim()
  const showPanel = open && trimmed.length > 0
  const current = remote.done !== null && remote.done.query === remote.query ? remote.done : null
  const fallback = remote.query === null || (remote.done !== null && remote.done.data === null)
  const local = useKeyed(showPanel && fallback ? LOCAL_KEY : null, loadLocalSearch)
  const previous = !fallback && current === null && related(remote.done, trimmed) ? (remote.done?.data ?? null) : null
  const shownRemote = useMemo(
    () => current?.data ?? (previous ? narrowSearch(previous, trimmed) : null),
    [current, previous, trimmed],
  )

  const options = useMemo(() => {
    if (fallback) return local.data ? searchOptions(query, local.data.stocks, local.data.themes) : []
    return shownRemote ? remoteSearchOptions(shownRemote, today) : []
  }, [fallback, local.data, query, shownRemote, today])

  let status: string | null = null
  if (showPanel) {
    if (fallback) {
      if (local.error) status = '검색 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
      else if (local.data === null) status = LOADING
      else if (options.length === 0) status = `'${trimmed}'에 맞는 종목·테마가 없어요`
    } else if (options.length === 0) {
      status = current === null ? `'${trimmed}' 찾는 중이에요` : `'${trimmed}'에 맞는 종목·테마·이슈가 없어요`
    }
  }
  const searching = showPanel && !fallback && current === null && options.length === 0
  const listOpen = showPanel && status === null
  const activeIndex = Math.min(active, Math.max(0, options.length - 1))
  const optionId = (option: SearchOption) => `${baseId}-${option.key}`

  const go = (option: SearchOption) => {
    setOpen(false)
    setQuery('')
    onDone?.()
    navigate(option.to, { state: fromState(pathname) })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const pressed = { key: e.key, isComposing: e.nativeEvent.isComposing, keyCode: e.nativeEvent.keyCode }
    if (searching && pressed.key === 'Enter' && !pressed.isComposing && pressed.keyCode !== 229) {
      e.preventDefault()
      remote.rush((data) => {
        const first = remoteSearchOptions(data, today)[0]
        if (first) go(first)
      })
      return
    }
    const action = searchKeyAction(pressed, { open: listOpen, active: activeIndex, count: options.length })
    if (action.type === 'none') return
    e.preventDefault()
    if (action.type === 'open') {
      setOpen(true)
      setActive(action.index)
    } else if (action.type === 'move') setActive(action.index)
    else if (action.type === 'go') go(options[action.index])
    else {
      remote.cancel()
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
          {SEARCH_GROUPS.map(({ group, label }) => {
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
                      aria-selected={index === activeIndex}
                      className="fg-spanel__opt"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(option)}
                    >
                      <span className="fg-spanel__name">
                        <span className="fg-spanel__text">{option.label}</span>
                        {option.alias && <span className="fg-spanel__alias">{option.alias}</span>}
                      </span>
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
        <span className="fg-sr">종목, 테마, 이슈 검색</span>
        <input
          ref={inputRef}
          type="search"
          placeholder="종목, 테마, 이슈 검색"
          autoFocus={autoFocus}
          value={query}
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={listOpen && options[activeIndex] ? optionId(options[activeIndex]) : undefined}
          onFocus={() => setOpen(true)}
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
