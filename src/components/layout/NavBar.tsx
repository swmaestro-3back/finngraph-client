import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SearchBar } from '@/components/search/SearchBar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { GraphFocus } from '@/data/graphTypes'
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

const LOAD_FAILED = '검색 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'

function focusPath(focus: GraphFocus): string {
  return focus.kind === 'company'
    ? `/stock/${focus.ticker}`
    : `/theme/${encodeURIComponent(focus.name)}`
}

export function NavBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // 검색 데이터는 첫 포커스에 한 번 받는다 — 헤더는 모든 페이지에 있으므로 마운트 시 부르면 낭비
  const [searchData, setSearchData] = useState<[ThemeRes[], StockRowRes[]] | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const ensureSearchData = () => {
    if (searchData || loading) return
    setLoading(true)
    loadSearchData()
      .then((data) => {
        setSearchData(data)
        setNotice(null)
      })
      // 실패는 캐시가 비워지므로 다음 포커스에 다시 시도한다
      .catch(() => setNotice(LOAD_FAILED))
      .finally(() => setLoading(false))
  }

  // 768px 미만에서 검색창을 숨기면 검색 기능 자체가 사라진다 — 아이콘으로 접어 두고 펼친다
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  // 라우트가 바뀌면(행·배지 클릭 포함) 모바일 패널을 접는다 — 검색어는 key={pathname}으로 비운다
  useEffect(() => {
    setMobileSearchOpen(false)
  }, [pathname])

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/'
    // 목록 탭은 각 상세 페이지(/theme/:id, /stock/:code)에서도 활성 유지
    if (to === '/themes') return pathname === '/themes' || pathname.startsWith('/theme/')
    if (to === '/stocks') return pathname === '/stocks' || pathname.startsWith('/stock/')
    return pathname.startsWith(to.split('/').slice(0, 2).join('/'))
  }

  const goTo = (focus: GraphFocus) => {
    navigate(focusPath(focus), { state: fromState(pathname) })
  }

  const [themes, stocks] = searchData ?? [[], []]

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

        <SearchBar
          key={pathname}
          variant="pill"
          stocks={stocks}
          themes={themes}
          notice={notice}
          onFocus={ensureSearchData}
          onSelect={goTo}
          className="hidden w-60 shrink-0 md:block"
          dropdownClassName="left-0 w-80"
        />

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
          <div className="absolute inset-x-0 top-full border-b border-border bg-background p-3 md:hidden">
            <SearchBar
              variant="pill"
              autoFocus
              stocks={stocks}
              themes={themes}
              notice={notice}
              onFocus={ensureSearchData}
              onSelect={goTo}
            />
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
