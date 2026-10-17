import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/me', label: '관심', end: true },
  { to: '/me/account', label: '계정 설정', end: false },
] as const

export function MyPageLayout() {
  return (
    <div className="page-container pt-7 pb-12">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="mb-5 text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">
          마이페이지
        </h1>
        <div className="flex flex-col gap-6 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:items-start md:gap-10">
          <nav aria-label="마이페이지 메뉴" className="flex gap-1 md:flex-col">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-foreground-secondary hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="min-w-0 max-w-3xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
