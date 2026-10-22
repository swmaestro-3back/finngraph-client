// Lucian UX/UI Prompt #228 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#228
import { useCallback, useEffect, useRef, type PointerEvent } from 'react'
import { motionAllowed } from '@/lib/fg/motion'

export interface CursorGlow<T extends HTMLElement> {
  onPointerMove: (event: PointerEvent<T>) => void
  onPointerLeave: (event: PointerEvent<T>) => void
}

export function useCursorGlow<T extends HTMLElement = HTMLElement>(): CursorGlow<T> {
  const frame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    if (event.pointerType !== 'mouse') return
    const el = event.currentTarget
    const { clientX, clientY } = event
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      if (!motionAllowed()) return
      const box = el.getBoundingClientRect()
      el.style.setProperty('--cx', `${Math.round(clientX - box.left)}px`)
      el.style.setProperty('--cy', `${Math.round(clientY - box.top)}px`)
      el.setAttribute('data-lit', '')
    })
  }, [])
  const onPointerLeave = useCallback((event: PointerEvent<T>) => {
    cancelAnimationFrame(frame.current)
    event.currentTarget.removeAttribute('data-lit')
  }, [])
  return { onPointerMove, onPointerLeave }
}
