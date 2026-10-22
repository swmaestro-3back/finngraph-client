// Lucian UX/UI Prompt #022 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#022
import { useCallback, useEffect, useRef, useState } from 'react'
import { motionAllowed } from '@/lib/fg/motion'

export const BURST_MS = 900

export function useBurst(): [boolean, () => void] {
  const [pop, setPop] = useState(false)
  const frame = useRef(0)
  const timer = useRef(0)
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      window.clearTimeout(timer.current)
    },
    [],
  )
  const fire = useCallback(() => {
    if (!motionAllowed()) return
    cancelAnimationFrame(frame.current)
    window.clearTimeout(timer.current)
    setPop(false)
    frame.current = requestAnimationFrame(() => {
      setPop(true)
      timer.current = window.setTimeout(() => setPop(false), BURST_MS)
    })
  }, [])
  return [pop, fire]
}

export function useBurstOnRise(on: boolean | null): [boolean, () => void] {
  const [pop, fire] = useBurst()
  const armed = useRef(false)
  const last = useRef(on)
  useEffect(() => {
    if (armed.current && last.current === false && on === true) fire()
    if (last.current !== on) armed.current = false
    last.current = on
  }, [on, fire])
  const arm = useCallback(() => {
    armed.current = true
  }, [])
  return [pop, arm]
}
