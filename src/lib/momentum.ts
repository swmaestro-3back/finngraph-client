import {
  endId,
  type EntityType,
  type GraphLink,
  type GraphNode,
  type Predicate,
} from '@/data/graphTypes'
import type { ThemeItem } from '@/data/themes'
import type { ThemePerformance } from '@/data/themePerformance'

export type MomentumBadge = 'trend' | 'spike' | null

export interface MomentumEntry {
  themeId: string
  name: string
  change: number
  w1: number
  m1: number
  m3: number
  badge: MomentumBadge
}

export interface EvidenceEntry {
  sourceLabel: string
  sourceType: EntityType
  predicate: Predicate
  targetLabel: string
  targetType: EntityType
  mentionedCount: number
  newsId: string
}

export function momentumBadge(change: number, p: ThemePerformance): MomentumBadge {
  if (change === 0) return null
  const dir = Math.sign(change)
  if (Math.sign(p.w1) === dir && Math.sign(p.m1) === dir && Math.sign(p.m3) === dir) {
    return 'trend'
  }
  if (Math.sign(p.m1) !== dir) return 'spike'
  return null
}

export function rankMomentum(
  themes: ThemeItem[],
  performance: Record<string, ThemePerformance>,
  limit = 4,
): MomentumEntry[] {
  return themes
    .filter((t) => performance[t.id])
    .map((t) => {
      const p = performance[t.id]
      return {
        themeId: t.id,
        name: t.name,
        change: t.change,
        w1: p.w1,
        m1: p.m1,
        m3: p.m3,
        badge: momentumBadge(t.change, p),
      }
    })
    .sort((a, b) => b.m1 - a.m1)
    .slice(0, limit)
}

export function rankSignals(themes: ThemeItem[], limit = 3): ThemeItem[] {
  return [...themes]
    .sort(
      (a, b) =>
        Math.abs(b.change) - Math.abs(a.change) || b.tradingValue - a.tradingValue,
    )
    .slice(0, limit)
}

export function rankEvidence(
  nodes: GraphNode[],
  links: GraphLink[],
  limit = 3,
): EvidenceEntry[] {
  const nodeOf = new Map(nodes.map((n) => [n.id, n]))
  return links
    .filter((l) => !!l.news_id)
    .sort((a, b) => b.mentioned_count - a.mentioned_count)
    .slice(0, limit)
    .map((l) => {
      const source = nodeOf.get(endId(l.source))
      const target = nodeOf.get(endId(l.target))
      return {
        sourceLabel: source?.label ?? endId(l.source),
        sourceType: source?.type ?? 'company',
        predicate: l.type,
        targetLabel: target?.label ?? endId(l.target),
        targetType: target?.type ?? 'company',
        mentionedCount: l.mentioned_count,
        newsId: l.news_id!,
      }
    })
}
