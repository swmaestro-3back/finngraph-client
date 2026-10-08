import { CalendarDays, ChartLine, House, LayoutGrid, Newspaper, Share2, type LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { activeMenu, BOTTOM_TABS, type MenuKey } from '@/lib/fg/nav'

const ICONS: Record<MenuKey, LucideIcon> = {
  home: House,
  briefing: Newspaper,
  themes: LayoutGrid,
  stocks: ChartLine,
  graph: Share2,
  calendar: CalendarDays,
}

export function BottomTabBar() {
  const { pathname } = useLocation()
  const active = activeMenu(pathname)
  return (
    <nav className="fg-btabs" aria-label="주 메뉴(하단)">
      {BOTTOM_TABS.map((item) => {
        const Icon = ICONS[item.key]
        return (
          <Link key={item.key} to={item.to} aria-current={active === item.key ? 'page' : undefined}>
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
