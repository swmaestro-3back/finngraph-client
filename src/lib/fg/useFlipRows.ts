// Lucian UX/UI Prompt #317 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#317
import { useLayoutEffect, useRef } from 'react'
import { motionAllowed } from '@/lib/fg/motion'

const FLIP_ID = 'fg-flip'
const FLIP_MS = 600
const FLIP_EASE = 'cubic-bezier(0.3, 1.1, 0.4, 1)'

interface Snapshot {
  order: string
  tops: Map<string, number>
}

export function useFlipRows<T extends HTMLElement>(order: string) {
  const ref = useRef<T>(null)
  const last = useRef<Snapshot | null>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const rows = [...root.querySelectorAll<HTMLElement>('[data-flip]')]
    const tops = new Map<string, number>()
    for (const row of rows) {
      const key = row.dataset.flip
      if (key) tops.set(key, row.offsetTop)
    }
    const prev = last.current
    last.current = { order, tops }
    if (!prev || prev.order === order || !motionAllowed()) return
    for (const row of rows) {
      const key = row.dataset.flip
      const from = key ? prev.tops.get(key) : undefined
      const to = key ? tops.get(key) : undefined
      if (from === undefined || to === undefined || from === to) continue
      for (const running of row.getAnimations()) {
        if (running.id === FLIP_ID) running.cancel()
        else if ('animationName' in running) running.finish()
      }
      row.dataset.flipDir = from > to ? 'up' : 'down'
      const move = row.animate([{ transform: `translateY(${from - to}px)` }, { transform: 'none' }], {
        id: FLIP_ID,
        duration: FLIP_MS,
        easing: FLIP_EASE,
      })
      move.onfinish = () => {
        delete row.dataset.flipDir
      }
    }
  })
  return ref
}
