import { useEffect, useState } from 'react'
import { Menu, Search, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { SearchBar } from '@/components/search/SearchBar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { GraphFocus } from '@/data/graphTypes'
import type { StockRowRes } from '@/lib/apiTypes'
import { useAuth } from '@/lib/auth'
import { isBareKey } from '@/lib/keyboard'
import { fromState } from '@/lib/navigation'
import { loadStocks } from '@/lib/queries/useStocksCached'
import { logoutLanding } from '@/lib/memberGate'
import { cn } from '@/lib/utils'

const MENU_ITEMS = [
  { label: '테마 대시보드', to: '/' },
  { label: '테마 목록', to: '/themes' },
  { label: '주식 목록', to: '/stocks' },
  { label: '기업 그래프', to: '/graph' },
  { label: '데일리 브리핑', to: '/briefing' },
  { label: '캘린더', to: '/calendar' },
]

const SEARCH_PLACEHOLDER = '종목 검색'

const LOAD_FAILED = '검색 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'

export function NavBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // 검색 데이터는 첫 포커스에 한 번 받는다 — 헤더는 모든 페이지에 있으므로 마운트 시 부르면 낭비
  const [searchData, setSearchData] = useState<StockRowRes[] | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const ensureSearchData = () => {
    if (searchData || loading) return
    setLoading(true)
    loadStocks()
      .then((data) => {
        setSearchData(data)
        setNotice(null)
      })
      // 실패는 캐시가 비워지므로 다음 포커스에 다시 시도한다
      .catch(() => setNotice(LOAD_FAILED))
      .finally(() => setLoading(false))
  }

  // 768~1279px은 메뉴를 정중앙에 두느라 검색창 자리가 없다 — 아이콘으로 접어 두고 헤더 아래로 펼친다
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 라우트가 바뀌면(행·배지 클릭 포함) 펼친 패널을 접는다 — 검색어는 key={pathname}으로 비운다
  useEffect(() => {
    setSearchPanelOpen(false)
    setMobileMenuOpen(false)
  }, [pathname])

  // '/' — 넓은 화면은 SearchBar가 직접 검색창으로 들어가고, 아이콘 구간에서는 패널을 연다
  useEffect(() => {
    const iconRange = window.matchMedia('(min-width: 768px) and (max-width: 1279.98px)')
    const handler = (e: KeyboardEvent) => {
      if (!iconRange.matches || !isBareKey(e, '/')) return
      e.preventDefault()
      setSearchPanelOpen(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/'
    // 목록 탭은 각 상세 페이지(/theme/:id, /stock/:code)에서도 활성 유지
    if (to === '/themes') return pathname === '/themes' || pathname.startsWith('/theme/')
    if (to === '/stocks') return pathname === '/stocks' || pathname.startsWith('/stock/')
    return pathname.startsWith(to.split('/').slice(0, 2).join('/'))
  }

  const stocks = searchData ?? []

  // 헤더 검색은 종목만 다룬다 — 테마를 넘기지 않으므로 focus는 항상 company
  const goTo = (focus: GraphFocus) => {
    if (focus.kind !== 'company') return
    navigate(`/stock/${focus.ticker}`, { state: fromState(pathname) })
  }

  const searchBarProps = {
    variant: 'pill',
    stocks,
    placeholder: SEARCH_PLACEHOLDER,
    notice,
    onFocus: ensureSearchData,
    onSelect: goTo,
  } as const

  // 다이얼로그·시트 오버레이(z-50)보다 아래 — 모달이 뜨면 헤더도 함께 흐려진다
  // 3칸 그리드 — 데스크톱은 좌우 칸을 같은 폭(1fr)으로 두어 메뉴가 화면 정중앙에 온다.
  // 모바일은 가운데 칸이 남는 폭을 모두 가져가 검색창이 늘 보이게 한다
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background">
      <div className="relative grid h-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 md:grid-cols-[1fr_auto_1fr] md:gap-5 md:px-5">
        <Link to="/" className="shrink-0 justify-self-start text-foreground">
          <LogoMark className="md:hidden" />
          <Logo height={24} className="hidden md:block" />
        </Link>

        {/* 가운데 — 모바일은 검색창, 데스크톱은 메뉴 */}
        <SearchBar key={`m-${pathname}`} {...searchBarProps} className="min-w-0 md:hidden" />
        <nav className="hidden h-full items-center gap-4 md:flex">
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

        {/* 오른쪽 — 검색·계정(도구) */}
        <div className="flex items-center justify-end gap-5">
          <SearchBar
            key={pathname}
            {...searchBarProps}
            shortcutKey="/"
            className="hidden w-56 shrink-0 transition-[width] duration-200 focus-within:w-64 motion-reduce:transition-none xl:block"
            dropdownClassName="right-0 w-80"
          />
          <button
            type="button"
            aria-label="검색"
            aria-expanded={searchPanelOpen}
            aria-keyshortcuts="/"
            onClick={() => setSearchPanelOpen((v) => !v)}
            className="hidden shrink-0 cursor-pointer p-3 -m-3 text-muted-foreground hover:text-foreground md:block xl:hidden"
          >
            <Search className="size-5" />
          </button>
          <button
            type="button"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="shrink-0 cursor-pointer p-3 -m-3 text-muted-foreground md:hidden"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          {/* 모바일은 자리를 검색창에 내주고 계정은 ☰ 메뉴 안으로 옮긴다 */}
          <div className="hidden md:block">
            <AuthSection />
          </div>
        </div>

        {searchPanelOpen && (
          <div
            className="absolute inset-x-0 top-full hidden border-b border-border bg-background p-3 md:block xl:hidden"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchPanelOpen(false)
            }}
          >
            <div className="mx-auto max-w-xl">
              <SearchBar {...searchBarProps} autoFocus />
            </div>
          </div>
        )}

        {mobileMenuOpen && (
          <nav
            aria-label="주요 메뉴"
            className="absolute inset-x-0 top-full border-b border-border bg-background p-2 md:hidden"
          >
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  'flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted',
                  isActive(item.to) && 'bg-muted text-primary',
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mx-3 my-1.5 h-px bg-border" />
            <MobileAuthLinks />
          </nav>
        )}
      </div>
    </header>
  )
}

/** 로그아웃 — 회원 전용 화면에 있었다면 비회원이 볼 수 있는 곳으로 옮긴다 */
function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    logout()
    toast.success('로그아웃했어요')
    const landing = logoutLanding(location.pathname)
    if (landing) navigate(landing, { replace: true })
  }
}

/** 모바일 ☰ 메뉴 아래 계정 항목 — 헤더에서 빠진 로그인 버튼·유저 메뉴를 대신한다 */
function MobileAuthLinks() {
  const { status, user } = useAuth()
  const location = useLocation()
  const logout = useLogout()
  const item =
    'flex min-h-11 w-full cursor-pointer items-center rounded-lg px-3 text-left text-sm font-medium hover:bg-muted'

  if (status === 'loading') return <Skeleton className="mx-3 my-2 h-7 w-24 rounded-lg" />

  if (status === 'anonymous' || !user) {
    return (
      <Link to="/login" state={{ next: location.pathname }} className={cn(item, 'text-primary')}>
        로그인
      </Link>
    )
  }

  return (
    <>
      <Link to="/me" className={cn(item, 'text-foreground')}>
        마이페이지 <span className="ml-1.5 text-muted-foreground">{user.nickname}</span>
      </Link>
      <button type="button" onClick={logout} className={cn(item, 'text-foreground')}>
        로그아웃
      </button>
    </>
  )
}

// 인증 상태별 우측 영역 — Design Ref: §5.3 NavBar (loading 스켈레톤 / 로그인 버튼 / 유저 메뉴)
function AuthSection() {
  const { status, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useLogout()
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
                logout()
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
