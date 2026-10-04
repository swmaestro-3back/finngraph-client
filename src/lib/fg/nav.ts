import type { AuthStatus } from '@/lib/auth'

export type MenuKey = 'home' | 'news' | 'themes' | 'stocks' | 'graph'

interface MenuItem {
  key: MenuKey
  label: string
  to: string
}

export const MAIN_MENU: readonly MenuItem[] = [
  { key: 'home', label: '홈', to: '/' },
  { key: 'news', label: '뉴스', to: '/news' },
  { key: 'themes', label: '테마', to: '/themes' },
  { key: 'stocks', label: '종목', to: '/stocks' },
  { key: 'graph', label: '관계 탐색', to: '/graph' },
]

function under(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

export function activeMenu(pathname: string): MenuKey | null {
  if (pathname === '/') return 'home'
  if (under(pathname, '/news')) return 'news'
  if (under(pathname, '/themes') || under(pathname, '/theme')) return 'themes'
  if (under(pathname, '/stocks') || under(pathname, '/stock')) return 'stocks'
  if (under(pathname, '/graph')) return 'graph'
  return null
}

export type Canvas = 'page' | 'surface'

export const REDESIGNED_BASES: readonly string[] = ['/news', '/themes', '/dev']

export function canvasFor(pathname: string): Canvas {
  return REDESIGNED_BASES.some((base) => under(pathname, base)) ? 'page' : 'surface'
}

export function outletKey(pathname: string): string {
  return REDESIGNED_BASES.find((base) => under(pathname, base)) ?? pathname
}

export const KEEP_SCROLL = { keepScroll: true } as const

export function keepsScroll(state: unknown, navigationType: string): boolean {
  if (navigationType === 'POP' || typeof state !== 'object' || state === null) return false
  return 'keepScroll' in state && state.keepScroll === true
}

export type AuthSlot = 'pending' | 'login' | 'menu'

export function authSlot(status: AuthStatus, hasUser: boolean): AuthSlot {
  if (status === 'loading') return 'pending'
  return status === 'authenticated' && hasUser ? 'menu' : 'login'
}
