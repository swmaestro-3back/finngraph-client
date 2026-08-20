import { useState } from 'react'
import { Search } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { themes } from '@/data/themes'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const MENU_ITEMS = [
  { label: '테마 트리맵', to: '/' },
  { label: '테마 목록', to: '/themes' },
  { label: '주식 목록', to: '/stocks' },
  { label: '기업 그래프', to: '/graph' },
]

/** 검색어로 테마/종목 매칭 → 이동 경로 (종목 우선 완전일치, 이후 부분일치) */
function searchTarget(rawQuery: string): string | null {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return null

  for (const theme of themes) {
    for (const stock of theme.stocks) {
      if (stock.name.toLowerCase() === query || stock.code === query) {
        return `/stock/${stock.code}`
      }
    }
  }
  const theme = themes.find((t) => t.name.toLowerCase().includes(query))
  if (theme) return `/theme/${theme.id}`
  for (const t of themes) {
    const stock = t.stocks.find(
      (s) => s.name.toLowerCase().includes(query) || s.code.includes(query),
    )
    if (stock) return `/stock/${stock.code}`
  }
  return null
}

export function NavBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/'
    // 목록 탭은 각 상세 페이지(/theme/:id, /stock/:code)에서도 활성 유지
    if (to === '/themes') return pathname === '/themes' || pathname.startsWith('/theme/')
    if (to === '/stocks') return pathname === '/stocks' || pathname.startsWith('/stock/')
    return pathname.startsWith(to.split('/').slice(0, 2).join('/'))
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const target = searchTarget(query)
    if (target) {
      navigate(target, { state: fromState(pathname) })
      setQuery('')
    }
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

        <div className="hidden h-10 w-60 shrink-0 items-center gap-2 rounded-full bg-surface-inset px-5 md:flex">
          <Search className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="테마 · 종목 검색"
            className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
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
