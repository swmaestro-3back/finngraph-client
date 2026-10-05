import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { MOTION_SLOW_MS, closesBelow, motionAllowed } from '@/lib/fg/motion'

export interface FoldSnapshot<K> {
  key: K | null
  node: ReactNode
}

export function useRowFold<K>(keys: readonly K[], selectedKey: K | null, expanded: ReactNode) {
  const anchor = useRef<{ key: K; el: HTMLElement; top: number } | null>(null)
  useLayoutEffect(() => {
    const held = anchor.current
    anchor.current = null
    if (!held || held.key !== selectedKey || !held.el.isConnected) return
    const shift = held.el.getBoundingClientRect().top - held.top
    if (Math.abs(shift) >= 1) window.scrollBy(0, shift)
  }, [selectedKey])
  const [opened, setOpened] = useState<K | null>(null)
  const [closing, setClosing] = useState<FoldSnapshot<K> | null>(null)
  const lastExpansion = useRef<FoldSnapshot<K>>({ key: null, node: null })
  useLayoutEffect(() => {
    const prev = lastExpansion.current
    lastExpansion.current = { key: selectedKey, node: expanded }
    if (prev.key === null || prev.key === selectedKey || !prev.node || selectedKey === null) return
    if (!motionAllowed() || !closesBelow(keys, prev.key, selectedKey)) return
    setClosing(prev)
  }, [selectedKey, expanded, keys])
  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => setClosing(null), MOTION_SLOW_MS)
    return () => window.clearTimeout(timer)
  }, [closing])
  const hold = (key: K, el: HTMLElement) => {
    if (key === selectedKey) return
    anchor.current = { key, el, top: el.getBoundingClientRect().top }
    setOpened(key)
  }
  return { hold, opened, closing }
}
