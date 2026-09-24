import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ThemeBadge } from '@/components/theme/ThemeBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getData } from '@/lib/api'
import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
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
  // 무매치·로드 실패를 침묵시키면 검색창이 "고장난 것처럼" 보인다 — 드롭다운 자리에 이유를 띄운다
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setMatches(null)
      setNotice(null)
      return
    }
    let alive = true
    loadSearchData()
      .then(([themes, stocks]) => {
        if (!alive) return
        setMatches(searchMatches(query, themes, stocks))
        setNotice(null)
      })
      .catch(() => {
        if (!alive) return
        setMatches(null)
        setNotice('검색 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      })
    return () => {
      alive = false
    }
  }, [query])

  // 768px 미만에서 검색창을 숨기면 검색 기능 자체가 사라진다 — 아이콘으로 접어 두고 펼친다
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // 라우트가 바뀌면(행·배지 클릭 포함) 검색 상태를 정리한다
  useEffect(() => {
    setQuery('')
    setOpen(false)
    setNotice(null)
    setMobileSearchOpen(false)
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
          return
        }
        // 이동하지 못한 Enter는 반드시 이유를 말한다 — 쿼리는 지우지 않아 수정해서 재시도할 수 있게
        setNotice(`'${rawQuery.trim()}' 검색 결과가 없습니다.`)
        setOpen(true)
      })
      .catch(() => {
        setNotice('검색 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
        setOpen(true)
      })
  }

  /** 제안·안내 드롭다운 — 데스크톱 검색창과 모바일 패널이 같은 목록을 공유한다 */
  const renderDropdown = (positionClass: string) => (
    <>
      {open && notice && (
        <p
          role="status"
          className={cn(
            'absolute rounded-xl border border-border bg-background px-4 py-3 text-caption text-muted-foreground shadow-soft',
            positionClass,
          )}
        >
          {notice}
        </p>
      )}
      {open && !notice && matches && (matches.themes.length > 0 || matches.stocks.length > 0) && (
        <div
          className={cn(
            'absolute overflow-hidden rounded-xl border border-border bg-background py-1 shadow-soft',
            positionClass,
          )}
        >
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
    </>
  )

  // 다이얼로그·시트 오버레이(z-50)보다 아래 — 모달이 뜨면 헤더도 함께 흐려진다
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background">
      <div className="relative flex h-full items-center gap-5 px-5">
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
            aria-label="테마 · 종목 검색"
            className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          {renderDropdown('left-0 top-11 w-80')}
        </div>

        <div className="flex-1" />

        {/* 모바일 검색 진입점 — 데스크톱 검색창이 hidden 되는 구간의 유일한 대체 경로 */}
        <button
          type="button"
          aria-label="검색"
          aria-expanded={mobileSearchOpen}
          onClick={() => setMobileSearchOpen((v) => !v)}
          className="shrink-0 cursor-pointer p-2 -m-2 text-muted-foreground md:hidden"
        >
          <Search className="size-5" />
        </button>

        {mobileSearchOpen && (
          <div
            className="absolute inset-x-0 top-full border-b border-border bg-background p-3 md:hidden"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
            }}
          >
            <div className="relative flex h-10 items-center gap-2 rounded-full bg-surface-inset px-5">
              <Search className="size-[18px] shrink-0 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearch}
                onFocus={() => setOpen(true)}
                placeholder="테마 · 종목 검색"
                aria-label="테마 · 종목 검색"
                className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              {renderDropdown('inset-x-0 top-12')}
            </div>
          </div>
        )}

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

        <AuthSection />
      </div>
    </header>
  )
}

// 인증 상태별 우측 영역 — Design Ref: §5.3 NavBar (loading 스켈레톤 / 로그인 버튼 / 유저 메뉴)
function AuthSection() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  if (status === 'loading') {
    return <Skeleton className="h-9 w-20 shrink-0 rounded-full" />
  }

  if (status === 'anonymous' || !user) {
    return (
      <Button
        className="h-9 shrink-0 rounded-full px-5 font-semibold active:bg-primary-pressed"
        onClick={() => navigate('/login', { state: { next: location.pathname } })}
      >
        로그인
      </Button>
    )
  }

  return (
    <div className="relative shrink-0">
      <Button
        variant="outline"
        className="h-9 rounded-full px-4 font-semibold"
        onClick={() => setMenuOpen((v) => !v)}
      >
        {user.nickname}
      </Button>
      {menuOpen && (
        <>
          {/* 바깥 클릭으로 닫기 — 전용 드롭다운 부품 없이 백드롭 한 장으로 해결 */}
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1.5 w-36 rounded-lg border border-border bg-background py-1 shadow-md">
            <Link
              to="/me"
              className="block px-3.5 py-2 text-sm text-foreground hover:bg-muted"
              onClick={() => setMenuOpen(false)}
            >
              마이페이지
            </Link>
            <button
              type="button"
              className="block w-full px-3.5 py-2 text-left text-sm text-foreground hover:bg-muted"
              onClick={() => {
                setMenuOpen(false)
                void logout()
              }}
            >
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  )
}
