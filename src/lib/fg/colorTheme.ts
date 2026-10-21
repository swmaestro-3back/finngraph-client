import { useSyncExternalStore } from 'react'

export type ColorScheme = 'light' | 'dark'

export const COLOR_THEME_KEY = 'fg.colorTheme'

export function otherScheme(scheme: ColorScheme): ColorScheme {
  return scheme === 'dark' ? 'light' : 'dark'
}

function readScheme(): ColorScheme {
  try {
    return window.localStorage.getItem(COLOR_THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

const listeners = new Set<() => void>()
let scheme: ColorScheme = typeof window === 'undefined' ? 'light' : readScheme()

function apply() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', scheme === 'dark')
  root.style.colorScheme = scheme
}

function refresh(next: ColorScheme) {
  scheme = next
  apply()
  listeners.forEach((listener) => listener())
}

export function setColorScheme(next: ColorScheme) {
  try {
    if (next === 'dark') window.localStorage.setItem(COLOR_THEME_KEY, 'dark')
    else window.localStorage.removeItem(COLOR_THEME_KEY)
  } catch {
    return refresh(next)
  }
  refresh(next)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === COLOR_THEME_KEY) refresh(readScheme())
  })
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, () => scheme, () => 'light')
}
