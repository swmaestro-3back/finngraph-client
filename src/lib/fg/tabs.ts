export function nextTabIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null
  const last = count - 1
  const from = current < 0 ? 0 : current
  if (key === 'ArrowRight') return from === last ? 0 : from + 1
  if (key === 'ArrowLeft') return from === 0 ? last : from - 1
  if (key === 'Home') return 0
  if (key === 'End') return last
  return null
}
