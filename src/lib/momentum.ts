import {
  endId,
  type EntityType,
  type GraphLink,
  type GraphNode,
  type Predicate,
} from '@/data/graphTypes'
import type { ThemeRes } from '@/lib/apiTypes'

export type MomentumBadge = 'trend' | 'spike' | null

export interface MomentumEntry {
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

export function momentumBadge(
  change: number,
  w1: number,
  m1: number,
  m3: number,
): MomentumBadge {
  if (change === 0) return null
  const dir = Math.sign(change)
  if (Math.sign(w1) === dir && Math.sign(m1) === dir && Math.sign(m3) === dir) {
    return 'trend'
  }
  if (Math.sign(m1) !== dir) return 'spike'
  return null
}

export function rankMomentum(themes: ThemeRes[], limit = 4): MomentumEntry[] {
  return themes
    .flatMap((t) => {
      if (t.change === null || t.w1 === null || t.m1 === null || t.m3 === null) return []
      return [
        {
          name: t.name,
          change: t.change,
          w1: t.w1,
          m1: t.m1,
          m3: t.m3,
          badge: momentumBadge(t.change, t.w1, t.m1, t.m3),
        },
      ]
    })
    .sort((a, b) => b.m1 - a.m1)
    .slice(0, limit)
}

export function rankSignals(themes: ThemeRes[], limit = 3): ThemeRes[] {
  return themes
    .filter((t) => t.change !== null)
    .sort(
      (a, b) =>
        Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0) ||
        (b.tradingValue ?? 0) - (a.tradingValue ?? 0),
    )
    .slice(0, limit)
}

export function selectTreemapThemes(themes: ThemeRes[], count: number): ThemeRes[] {
  const ups = themes
    .filter((t) => (t.change ?? 0) > 0)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
  const downs = themes
    .filter((t) => (t.change ?? 0) < 0)
    .sort((a, b) => (a.change ?? 0) - (b.change ?? 0))
  return [...ups.slice(0, Math.ceil(count / 2)), ...downs.slice(0, Math.floor(count / 2))]
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
