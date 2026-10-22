// Lucian UX/UI Prompt #041 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#041
import type { CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LucianIcon } from '@/components/fg/LucianIcon'
import { activeMenu, BOTTOM_TABS, type MenuKey } from '@/lib/fg/nav'
import type { LucianIconName } from '@/vendor/lucian-icons'

const ICONS: Record<MenuKey, LucianIconName> = {
  home: 'home',
  themes: 'grid',
  stocks: 'linechart',
  graph: 'share',
  calendar: 'calendar',
  favorites: 'star',
}

export function BottomTabBar() {
  const { pathname } = useLocation()
  const active = activeMenu(pathname)
  const index = BOTTOM_TABS.findIndex((item) => item.key === active)
  const notch =
    index >= 0 ? ({ '--fg-btab-x': `${((index + 0.5) * 100) / BOTTOM_TABS.length}%` } as CSSProperties) : undefined
  return (
    <nav
      className="fg-btabs fg-btabs--notch"
      aria-label="주 메뉴(하단)"
      data-active={index >= 0 ? '' : undefined}
      style={notch}
    >
      <span className="fg-btabs__bar" aria-hidden="true" />
      <span className="fg-btabs__bub" aria-hidden="true" />
      {BOTTOM_TABS.map((item) => {
        return (
          <Link key={item.key} to={item.to} aria-current={active === item.key ? 'page' : undefined}>
            <span className="fg-btabs__ic">
              <LucianIcon name={ICONS[item.key]} size={22} />
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
