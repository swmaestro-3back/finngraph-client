import type { IssueDay } from '@/lib/apiTypes'

export function defaultIssueIndex(days: IssueDay[], lockedCount = 0): number | null {
  if (days.length === 0) return null
  for (let i = days.length - 1; i >= Math.max(0, lockedCount); i -= 1) {
    if (days[i].items.length > 0) return i
  }
  return days.length - 1
}
