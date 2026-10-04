export type GapMode = 'mock' | 'not-ready'

export const GAP_STORAGE_KEY = 'fg-gaps'

export function resolveGapMode(isDev: boolean, search: string, stored: string | null): GapMode {
  if (!isDev) return 'not-ready'
  const param = new URLSearchParams(search).get('gaps')
  if (param === 'off') return 'not-ready'
  if (param === 'on') return 'mock'
  return stored === 'off' ? 'not-ready' : 'mock'
}

export function nextStoredGapPref(search: string): 'off' | 'on' | null {
  const param = new URLSearchParams(search).get('gaps')
  return param === 'off' || param === 'on' ? param : null
}
