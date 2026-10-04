import { useLayoutEffect, useRef, type RefObject } from 'react'
import { MOTION_BASE_MS, MOTION_EASE, motionAllowed, sameSpan, slideFrom, spanTransform, type Span } from '@/lib/fg/motion'

function visibleSpan(list: HTMLElement, mark: HTMLElement): Span {
  const box = list.getBoundingClientRect()
  const rect = mark.getBoundingClientRect()
  return { left: rect.left - box.left - list.clientLeft, width: rect.width }
}

export function useSlidingMark(
  listRef: RefObject<HTMLElement | null>,
  markRef: RefObject<HTMLElement | null>,
  index: number,
): void {
  const shown = useRef<Span | null>(null)
  useLayoutEffect(() => {
    const list = listRef.current
    const mark = markRef.current
    if (!list || !mark) return
    const tabsOf = () => Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'))
    const place = (slide: boolean) => {
      const tab = tabsOf()[index]
      if (!tab || tab.offsetWidth === 0) {
        list.removeAttribute('data-mark')
        shown.current = null
        return
      }
      const next = { left: tab.offsetLeft, width: tab.offsetWidth }
      list.setAttribute('data-mark', 'on')
      if (sameSpan(shown.current, next)) return
      const running = mark.getAnimations()
      const prev = running.length > 0 ? visibleSpan(list, mark) : shown.current
      running.forEach((animation) => animation.cancel())
      shown.current = next
      mark.style.width = `${next.width}px`
      mark.style.transform = spanTransform(next)
      if (!slide || prev === null || !motionAllowed()) return
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
  }, [listRef, markRef, index])
}
