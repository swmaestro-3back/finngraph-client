import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ThemeBadge } from '@/components/theme/ThemeBadge'
import { Button } from '@/components/ui/button'
import { getData } from '@/lib/api'
import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'
import { fromState } from '@/lib/navigation'
import { loadStocks } from '@/lib/queries/useStocksCached'
import { cn } from '@/lib/utils'

const MENU_ITEMS = [
  { label: '테마 트리맵', to: '/' },
  { label: '테마 목록', to: '/themes' },
  { label: '주식 목록', to: '/stocks' },
  { label: '기업 그래프', to: '/graph' },
  { label: '데일리 브리핑', to: '/briefing' },
]

// 종목 쪽은 useStocksCached의 모듈 캐시를 재사용한다 — 별도 캐시를 두면 /v1/stocks가 세션 내 2회 나간다
let themesCache: Promise<ThemeRes[]> | null = null

function loadThemes(): Promise<ThemeRes[]> {
  themesCache ??= getData<ThemeRes[]>('/v1/themes').catch((err: unknown) => {
    themesCache = null
    throw err
  })
  return themesCache
}

function loadSearchData(): Promise<[ThemeRes[], StockRowRes[]]> {
  return Promise.all([loadThemes(), loadStocks()])
}

function searchTarget(
  rawQuery: string,
  themes: ThemeRes[],
  stocks: StockRowRes[],
): string | null {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return null

  const exact = stocks.find((s) => s.name.toLowerCase() === query || s.ticker === query)
  if (exact) return `/stock/${exact.ticker}`

  const theme = themes.find((t) => t.name.toLowerCase().includes(query))
  if (theme) return `/theme/${encodeURIComponent(theme.name)}`

  const partial = stocks.find(
    (s) => s.name.toLowerCase().includes(query) || s.ticker.includes(query),
  )
  if (partial) return `/stock/${partial.ticker}`

  return null
}

interface SearchMatches {
  themes: ThemeRes[]
  stocks: StockRowRes[]
}

function searchMatches(
  rawQuery: string,
  themes: ThemeRes[],
  stocks: StockRowRes[],
): SearchMatches {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return { themes: [], stocks: [] }
  return {
    themes: themes.filter((t) => t.name.toLowerCase().includes(query)).slice(0, 3),
    stocks: stocks
      .filter((s) => s.name.toLowerCase().includes(query) || s.ticker.includes(query))
      .slice(0, 5),
  }
}

export function NavBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<SearchMatches | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setMatches(null)
      return
    }
    let alive = true
    loadSearchData()
      .then(([themes, stocks]) => {
        if (alive) setMatches(searchMatches(query, themes, stocks))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [query])

  // 라우트가 바뀌면(행·배지 클릭 포함) 검색 상태를 정리한다
  useEffect(() => {
    setQuery('')
    setOpen(false)
  }, [pathname])

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/'
    // 목록 탭은 각 상세 페이지(/theme/:id, /stock/:code)에서도 활성 유지
    if (to === '/themes') return pathname === '/themes' || pathname.startsWith('/theme/')
    if (to === '/stocks') return pathname === '/stocks' || pathname.startsWith('/stock/')
    return pathname.startsWith(to.split('/').slice(0, 2).join('/'))
  }

  const goTo = (target: string) => {
    navigate(target, { state: fromState(pathname) })
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const rawQuery = query
    loadSearchData()
      .then(([themes, stocks]) => {
        const target = searchTarget(rawQuery, themes, stocks)
        if (target) {
          navigate(target, { state: fromState(pathname) })
          setQuery('')
        }
      })
      .catch(() => {})
  }

  return (
    <header className="sticky top-0 z-[60] h-14 border-b border-border bg-background">
      <div className="flex h-full items-center gap-5 px-5">
        <Link
          to="/"
          className="shrink-0 font-wordmark text-lg font-extrabold leading-tight tracking-[-0.05em] text-foreground"
        >
          Finn<span className="text-primary">graph</span>
        </Link>

        <div
          className="relative hidden h-10 w-60 shrink-0 items-center gap-2 rounded-full bg-surface-inset px-5 md:flex"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
          }}
        >
          <Search className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
            onFocus={() => setOpen(true)}
            placeholder="테마 · 종목 검색"
            className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          {open && matches && (matches.themes.length > 0 || matches.stocks.length > 0) && (
            <div className="absolute left-0 top-11 w-80 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-soft">
              {matches.themes.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => goTo(`/theme/${encodeURIComponent(theme.name)}`)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-surface-inset"
                >
                  <span className="truncate text-body font-medium text-foreground">
                    {theme.name}
                  </span>
                  <span className="ml-auto shrink-0 text-caption text-muted-foreground">
                    테마
                  </span>
                </button>
              ))}
              {matches.stocks.map((stock) => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => goTo(`/stock/${stock.ticker}`)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-surface-inset"
                >
                  <span className="truncate text-body font-medium text-foreground">
                    {stock.name}
                  </span>
                  <span className="shrink-0 font-mono text-caption text-muted-foreground">
                    {stock.ticker}
                  </span>
                  {stock.themeId !== null && stock.themeName !== null && (
                    <ThemeBadge id={stock.themeId} name={stock.themeName} className="ml-auto max-w-28" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <nav className="flex h-full items-center gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                'flex h-full items-center whitespace-nowrap px-0.5 text-sm font-medium text-foreground',
                isActive(item.to) &&
                  'text-primary shadow-[inset_0_-2px_0_0_var(--primary)]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button className="h-9 shrink-0 rounded-full px-5 font-semibold active:bg-primary-pressed">
          로그인
        </Button>
      </div>
    </header>
  )
}
