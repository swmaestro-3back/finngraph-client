import { useEffect, useState } from 'react'

const HEADER_SELECTOR = '.fg-gh'

export function usePinned(el: HTMLElement | null): boolean {
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    const header = document.querySelector<HTMLElement>(HEADER_SELECTOR)
    let observer: IntersectionObserver | null = null
    let height = -1
    const watch = () => {
      const next = header?.offsetHeight ?? 0
      if (next === height) return
      height = next
      observer?.disconnect()
      observer = new IntersectionObserver(
        ([entry]) => setPinned(!entry.isIntersecting && entry.boundingClientRect.top < height),
        { rootMargin: `-${height}px 0px 0px 0px` },
      )
      observer.observe(el)
    }
    watch()
    const resize = header && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(watch) : null
    if (header) resize?.observe(header)
    return () => {
      observer?.disconnect()
      resize?.disconnect()
    }
  }, [el])
  return el !== null && pinned
}
