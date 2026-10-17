import { useEffect, useState } from 'react'

function secondsLeft(deadline: number | null): number {
  if (deadline === null) return 0
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

export function useCountdown(deadline: number | null): number {
  const [left, setLeft] = useState(() => secondsLeft(deadline))

  useEffect(() => {
    setLeft(secondsLeft(deadline))
    if (deadline === null) return
    const id = setInterval(() => {
      const next = secondsLeft(deadline)
      setLeft(next)
      if (next === 0) clearInterval(id)
    }, 250)
    return () => clearInterval(id)
  }, [deadline])

  return left
}
