import { useEffect, useState } from 'react'

export function useHubSelection(
  keys: readonly string[],
  pick: string | null,
  ready: boolean,
  onPick: (key: string | null) => void,
): string | null {
  const found = pick !== null && keys.includes(pick)
  const selected = found ? pick : (keys[0] ?? null)
  const stale = ready && pick !== null && !found
  useEffect(() => {
    if (stale) onPick(null)
  }, [stale, onPick])
  return selected
}

export function useSeen(selected: string | null): ReadonlySet<string> {
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set(selected === null ? [] : [selected]))
  if (selected !== null && !seen.has(selected)) {
    const next = new Set(seen)
    next.add(selected)
    setSeen(next)
    return next
  }
  return seen
}

export function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const sync = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  return hidden
}
