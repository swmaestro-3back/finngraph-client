import type { AuthStatus } from '@/lib/auth'

export type MenuKey = 'home' | 'briefing' | 'themes' | 'stocks' | 'graph'

interface MenuItem {
  key: MenuKey
  label: string
  to: string
}

const HOME: MenuItem = { key: 'home', label: '홈', to: '/' }
const BRIEFING: MenuItem = { key: 'briefing', label: '브리핑', to: '/briefing' }
const THEMES: MenuItem = { key: 'themes', label: '테마', to: '/themes' }
const STOCKS: MenuItem = { key: 'stocks', label: '종목', to: '/stocks' }
const GRAPH: MenuItem = { key: 'graph', label: '관계 탐색', to: '/graph' }

export const MAIN_MENU: readonly MenuItem[] = [HOME, THEMES, STOCKS, GRAPH]

export const BOTTOM_TABS: readonly MenuItem[] = [HOME, BRIEFING, THEMES, STOCKS, GRAPH]

interface SideLink {
  label: string
  to: string
  wideOnly?: true
}

export const SIDE_LINKS: readonly SideLink[] = [
  { label: '브리핑', to: '/briefing', wideOnly: true },
  { label: '캘린더', to: '/calendar' },
]

function under(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function activeMenu(pathname: string): MenuKey | null {
  if (pathname === '/' || under(pathname, '/issues')) return 'home'
  if (under(pathname, '/briefing')) return 'briefing'
  if (under(pathname, '/themes') || under(pathname, '/theme')) return 'themes'
  if (under(pathname, '/stocks') || under(pathname, '/stock')) return 'stocks'
  if (under(pathname, '/graph')) return 'graph'
  return null
}

export type Canvas = 'page' | 'surface'

export const REDESIGNED_BASES: readonly string[] = ['/issues', '/themes', '/stocks', '/dev']

export function canvasFor(pathname: string): Canvas {
  return REDESIGNED_BASES.some((base) => under(pathname, base)) ? 'page' : 'surface'
}

export function outletKey(pathname: string): string {
  return REDESIGNED_BASES.find((base) => under(pathname, base)) ?? pathname
}

export type AuthSlot = 'pending' | 'login' | 'menu'

export function authSlot(status: AuthStatus, hasUser: boolean): AuthSlot {
  if (status === 'loading') return 'pending'
  return status === 'authenticated' && hasUser ? 'menu' : 'login'
}
