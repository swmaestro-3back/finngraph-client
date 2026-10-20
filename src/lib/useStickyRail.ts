import { useEffect, type RefObject } from 'react'

const BOTTOM_GAP = 16

export function useStickyRail(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let base = 0
    let height = 0
    let offset = 0
    let applied = Number.NaN
    let lastY = window.scrollY

    const place = () => {
      const floor = Math.min(base, window.innerHeight - height - BOTTOM_GAP)
      offset = Math.min(base, Math.max(floor, offset))
      if (offset === applied) return
      applied = offset
      el.style.top = `${offset}px`
    }
    const measure = () => {
      el.style.removeProperty('top')
      applied = Number.NaN
      base = parseFloat(getComputedStyle(el).top) || 0
      height = el.offsetHeight
    }
    const onScroll = () => {
      const y = window.scrollY
      offset -= y - lastY
      lastY = y
      place()
    }
    const onResize = () => {
      measure()
      place()
    }

    measure()
    offset = base
    place()
    const observer = new ResizeObserver(() => {
      height = el.offsetHeight
      place()
    })
    observer.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      el.style.removeProperty('top')
    }
  }, [ref])
}
