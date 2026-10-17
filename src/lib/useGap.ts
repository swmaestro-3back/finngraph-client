import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { GapId } from '@/lib/dataGaps'
import { GAP_STORAGE_KEY, nextStoredGapPref, resolveGapMode, type GapMode } from '@/lib/fg/gapMode'

function readStored(): string | null {
  try {
    return window.localStorage.getItem(GAP_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(pref: 'off' | 'on'): void {
  try {
    if (pref === 'off') window.localStorage.setItem(GAP_STORAGE_KEY, 'off')
    else window.localStorage.removeItem(GAP_STORAGE_KEY)
  } catch {
    return
  }
}

export function useGapMode(): GapMode {
  const { search } = useLocation()
  const isDev = import.meta.env.DEV
  const pref = isDev ? nextStoredGapPref(search) : null
  useEffect(() => {
    if (pref) writeStored(pref)
  }, [pref])
  return resolveGapMode(isDev, search, isDev ? readStored() : null)
}

export type GapState<T> =
  | { status: 'not-ready'; gap: GapId }
  | { status: 'loading'; gap: GapId }
  | { status: 'mock'; gap: GapId; data: T }

export function useGap<T>(gap: GapId, load: (() => Promise<T>) | null): GapState<T> {
  const mode = useGapMode()
  const active = mode === 'mock' && load !== null
  const [loaded, setLoaded] = useState<{ gap: GapId; value: T } | null>(null)
  useEffect(() => {
    if (!active || load === null) return
    let alive = true
    load().then((value) => {
      if (alive) setLoaded({ gap, value })
    })
    return () => {
      alive = false
    }
  }, [active, gap])
  if (!active) return { status: 'not-ready', gap }
  if (loaded === null || loaded.gap !== gap) return { status: 'loading', gap }
  return { status: 'mock', gap, data: loaded.value }
}
