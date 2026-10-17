import { useState } from 'react'

export function useChanged<T>(value: T): boolean {
  const [seen, setSeen] = useState({ value, changed: false })
  const differs = !Object.is(seen.value, value)
  if (differs) setSeen({ value, changed: true })
  return seen.changed || differs
}
