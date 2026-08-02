import { useEffect, useRef, useState } from 'react'

export interface CanvasSize {
  w: number
  h: number
}

/**
 * 컨테이너의 실제 픽셀 크기를 관측한다.
 *
 * 마운트 직후에는 컨테이너가 0x0인 경우가 있어(스타일 적용 전 첫 페인트, 숨겨진 탭, 사이드바 전환 등)
 * 그 크기로 레이아웃하면 그래프가 원점에 몰린다. 유효 크기를 얻기 전까지 `sized`는 false로 남는다.
 *
 * @param onResize 최초 크기 이후의 리사이즈 콜백 — 이미 배치된 요소를 새 크기에 맞출 때 사용
 */
export function useCanvasSize(onResize?: (next: CanvasSize, prev: CanvasSize) => void) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef<CanvasSize>({ w: 0, h: 0 })
  const [sized, setSized] = useState(false)

  // 콜백 교체가 관측을 다시 시작시키지 않도록 ref로 들고 있는다
  const onResizeRef = useRef(onResize)
  onResizeRef.current = onResize

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const apply = (w: number, h: number) => {
      if (w === 0 || h === 0) return
      const prev = sizeRef.current
      if (prev.w === w && prev.h === h) return
      sizeRef.current = { w, h }

      // 최초 유효 크기 → 소비하는 쪽이 이 크기로 레이아웃한다
      if (prev.w === 0 || prev.h === 0) {
        setSized(true)
        return
      }
      onResizeRef.current?.({ w, h }, prev)
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      apply(Math.round(width), Math.round(height))
    })
    observer.observe(container)
    apply(container.clientWidth, container.clientHeight)

    return () => observer.disconnect()
  }, [])

  return { containerRef, sizeRef, sized }
}
