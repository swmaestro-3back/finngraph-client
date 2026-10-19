import { useLayoutEffect, useRef, type RefObject } from 'react'
import { MOTION_BASE_MS, MOTION_EASE, motionAllowed, sameSpan, slideFrom, spanTransform, type Span } from '@/lib/fg/motion'

interface SlidingMarkOptions {
  items?: string
  active?: string
  memory?: string
  fit?: boolean
}

const remembered = new Map<string, Span>()

function visibleSpan(list: HTMLElement, mark: HTMLElement): Span {
  const box = list.getBoundingClientRect()
  const rect = mark.getBoundingClientRect()
  return { left: rect.left - box.left - list.clientLeft + list.scrollLeft, width: rect.width }
}

export function useSlidingMark(
  listRef: RefObject<HTMLElement | null>,
  markRef: RefObject<HTMLElement | null>,
  selection: number | string | null,
  { items = '[role="tab"]', active, memory, fit = false }: SlidingMarkOptions = {},
): void {
  const shown = useRef<Span | null>(null)
  const row = useRef<number | null>(null)
  useLayoutEffect(() => {
    const list = listRef.current
    const mark = markRef.current
    if (!list || !mark) return
    const tabsOf = () => Array.from(list.querySelectorAll<HTMLElement>(items))
    const targetOf = () => {
      const tabs = tabsOf()
      if (active) return tabs.find((tab) => tab.matches(active))
      return typeof selection === 'number' ? tabs[selection] : undefined
    }
    const place = (slide: boolean) => {
      const tab = targetOf()
      if (!tab || tab.offsetWidth === 0) {
        list.removeAttribute('data-mark')
        shown.current = null
        row.current = null
        return
      }
      const next = { left: tab.offsetLeft, width: tab.offsetWidth }
      const moved = fit && row.current !== null && row.current !== tab.offsetTop
      if (fit) {
        mark.style.top = `${tab.offsetTop}px`
        mark.style.height = `${tab.offsetHeight}px`
        row.current = tab.offsetTop
      }
      list.setAttribute('data-mark', 'on')
      if (sameSpan(shown.current, next)) return
      const running = mark.getAnimations()
      const before = shown.current ?? (memory ? (remembered.get(memory) ?? null) : null)
      const prev = running.length > 0 ? visibleSpan(list, mark) : before
      running.forEach((animation) => animation.cancel())
      shown.current = next
      if (memory) remembered.set(memory, next)
      mark.style.width = `${next.width}px`
      mark.style.transform = spanTransform(next)
      if (!slide || moved || prev === null || sameSpan(prev, next) || !motionAllowed()) return
      mark.animate([{ transform: slideFrom(prev, next) }, { transform: spanTransform(next) }], {
        duration: MOTION_BASE_MS,
        easing: MOTION_EASE,
      })
    }
    place(true)
    const observer = new ResizeObserver(() => place(false))
    observer.observe(list)
    tabsOf().forEach((tab) => observer.observe(tab))
    return () => observer.disconnect()
  }, [listRef, markRef, selection, items, active, memory, fit])
}
