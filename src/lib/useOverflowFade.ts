import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * 가로 스크롤 컨테이너 오른쪽에 아직 볼 내용이 남았는지 관측한다.
 * 스크롤바를 숨긴 표에서 "더 있다"는 단서는 이 값으로 그리는 페이드뿐이다.
 *
 * @param deps 내용 폭이 바뀌는 신호(예: 열 개수) — 컨테이너 자체 크기는 안 변해도 scrollWidth는 변하므로 따로 받는다
 */
export function useOverflowFade<T extends HTMLElement>(
  deps: readonly unknown[] = [],
): {
  scrollRef: RefObject<T | null>
  /** 오른쪽에 더 있음 */
  showFade: boolean
  /** 왼쪽에 더 있음 — 오른쪽 끝에서 시작하는 표는 이쪽이 먼저 켜진다 */
  showLeftFade: boolean
} {
  const scrollRef = useRef<T>(null)
  const [showFade, setShowFade] = useState(false)
  const [showLeftFade, setShowLeftFade] = useState(false)

  const recompute = () => {
    const el = scrollRef.current
    if (!el) return
    setShowFade(el.scrollWidth - el.clientWidth - el.scrollLeft > 1)
    setShowLeftFade(el.scrollLeft > 1)
  }

  // 내용이 바뀐 직후 페인트 전에 판정 — 페이드가 한 프레임 늦게 깜빡이지 않도록
  useLayoutEffect(recompute, deps)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', recompute, { passive: true })
    const observer = new ResizeObserver(recompute)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', recompute)
      observer.disconnect()
    }
  }, [])

  return { scrollRef, showFade, showLeftFade }
}
