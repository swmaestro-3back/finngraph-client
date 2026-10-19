import { CalendarDays, ChartLine, House, LayoutGrid, Share2, type LucideIcon } from 'lucide-react'
import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { activeMenu, BOTTOM_TABS, type MenuKey } from '@/lib/fg/nav'
import { useSlidingMark } from '@/lib/fg/useSlidingMark'

const ICONS: Record<MenuKey, LucideIcon> = {
  home: House,
  themes: LayoutGrid,
  stocks: ChartLine,
  graph: Share2,
  calendar: CalendarDays,
}

export function BottomTabBar() {
  const { pathname } = useLocation()
  const active = activeMenu(pathname)
  const nav = useRef<HTMLElement>(null)
  const mark = useRef<HTMLSpanElement>(null)
  useSlidingMark(nav, mark, BOTTOM_TABS.findIndex((item) => item.key === active), { items: 'a' })
  return (
    <nav ref={nav} className="fg-btabs" aria-label="주 메뉴(하단)">
      <span ref={mark} className="fg-btabs__mark" aria-hidden="true" />
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
