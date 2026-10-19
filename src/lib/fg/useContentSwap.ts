import { useLayoutEffect, useRef, type RefObject } from 'react'
import { CONTENT_SWAP, MOTION_BASE_MS, MOTION_EASE, motionAllowed } from '@/lib/fg/motion'

export function useContentSwap(ref: RefObject<HTMLElement | null>, key: string): void {
  const last = useRef(key)
  useLayoutEffect(() => {
    if (last.current === key) return
    last.current = key
    if (!motionAllowed()) return
    const animation = ref.current?.animate(CONTENT_SWAP, { duration: MOTION_BASE_MS, easing: MOTION_EASE })
    return () => animation?.cancel()
  }, [ref, key])
}
