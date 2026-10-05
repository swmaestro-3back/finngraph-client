import { formatChange } from '@/lib/format'
import type { LinkStrength } from '@/lib/fg/stockDetail'
import { josa } from '@/lib/josa'

export type LinkType = 'supply' | 'customer' | 'invest' | 'acquire' | 'theme'
export type LinkFilter = 'all' | LinkType
export type LinkSort = 'strength' | 'change'
export type LinkDirection = 'out' | 'in'
export type LinkRelType = 'SUPPLIES_TO' | 'INVESTS_IN' | 'ACQUIRES'

export const LINK_TYPES: readonly LinkType[] = ['supply', 'customer', 'invest', 'acquire', 'theme']

export const LINK_TYPE_LABEL: Record<LinkType, string> = {
  supply: '공급',
  customer: '고객',
  invest: '투자',
  acquire: '인수',
  theme: '같은 테마',
}

export const LINK_SORTS: readonly { value: LinkSort; label: string }[] = [
  { value: 'strength', label: '근거 강도 순' },
  { value: 'change', label: '오늘 등락률 순' },
]

const VIA_NOUN: Record<LinkType, string> = {
  supply: '공급사',
  customer: '고객사',
  invest: '투자 관계 기업',
  acquire: '인수 관계 기업',
  theme: '같은 테마 기업',
}

export interface LinkEvidence {
  kind: 'news' | 'disclosure'
  quote: string
  source: string
  date: string
  url: string | null
  verbatim?: boolean
  tags?: readonly string[]
}

export interface LinkHop {
  edge: LinkType
  node: string
  dir?: LinkDirection
  confirmed?: boolean
}

export interface LinkPair {
  a: string
  b: string
  type: LinkRelType
}

export interface LinkedCompany {
  id: string
  code: string | null
  name: string
  market: string
  price: number | null
  change: number | null
  gapFromHigh: number | null
  position: number | null
  newHigh?: boolean
  type: LinkType
  relation: string
  tag: string
  title: string
  hops: readonly LinkHop[]
  strength: LinkStrength
  confirmed: boolean
  evidence: readonly LinkEvidence[]
  evidenceCount?: number
  lastMentioned?: string | null
  pair?: LinkPair
}

export interface LinkCounts {
  total: number
  byType: Partial<Record<LinkType, number>>
  confirmed: number
  second: number
  via: string | null
}

function isSecond(company: LinkedCompany): boolean {
  return company.hops.length > 1
}

export function typeCount(counts: LinkCounts, type: LinkType): number {
  return counts.byType[type] ?? 0
}

export function linkCounts(list: readonly LinkedCompany[]): LinkCounts {
  const byType: Partial<Record<LinkType, number>> = {}
  for (const company of list) byType[company.type] = (byType[company.type] ?? 0) + 1
  const second = list.filter(isSecond)
  const firstEdges = new Set(second.map((company) => company.hops[0].edge))
  const [edge] = [...firstEdges]
  return {
    total: list.length,
    byType,
    confirmed: list.filter((company) => company.confirmed).length,
    second: second.length,
    via: second.length === 0 ? null : firstEdges.size === 1 ? VIA_NOUN[edge] : '다른 기업',
  }
}

function typeParts(counts: LinkCounts): string {
  return LINK_TYPES.filter((type) => typeCount(counts, type) > 0)
    .map((type) => `${LINK_TYPE_LABEL[type]} ${typeCount(counts, type)}`)
    .join(' · ')
}

export function linkSummary(stockName: string, counts: LinkCounts): { lead: string; rest: string } {
  const confirmed = counts.confirmed > 0 ? `이고, ${counts.confirmed}곳은 공시로 관계가 확인됐어요.` : '이에요.'
  const second =
    counts.second > 0 && counts.via
      ? ` ${counts.second}곳은 ${counts.via}${josa(counts.via, '을/를')} 한 번 더 거쳐 2단계로 이어져요.`
      : ''
  return {
    lead: `${stockName}${josa(stockName, '와/과')} 관계로 이어진 기업 ${counts.total}곳`,
    rest: `이에요. ${typeParts(counts)}곳${confirmed}${second}`,
  }
}

export function gateScope(counts: LinkCounts): string {
  return `${typeParts(counts)} · 관계 경로와 원문 근거까지 볼 수 있어요`
}

export interface LinkMapGroups {
  supply: LinkedCompany[]
  customer: LinkedCompany[]
  invest: LinkedCompany[]
  acquire: LinkedCompany[]
  theme: LinkedCompany[]
  second: LinkedCompany[]
  via: string | null
}

export type MapGroupKey = 'supply' | 'customer' | 'invest' | 'acquire' | 'theme' | 'second'

export const MAP_MORE_KEYS: readonly Exclude<MapGroupKey, 'supply' | 'customer'>[] = ['invest', 'acquire', 'theme', 'second']

export function linkMapGroups(list: readonly LinkedCompany[]): LinkMapGroups {
  const first = list.filter((company) => !isSecond(company))
  const second = list.filter(isSecond)
  const vias = new Set(second.map((company) => company.hops[0].node))
  return {
    supply: first.filter((company) => company.type === 'supply'),
    customer: first.filter((company) => company.type === 'customer'),
    invest: first.filter((company) => company.type === 'invest'),
    acquire: first.filter((company) => company.type === 'acquire'),
    theme: first.filter((company) => company.type === 'theme'),
    second,
    via: vias.size === 1 ? [...vias][0] : null,
  }
}

function groupDir(group: readonly LinkedCompany[]): LinkDirection | null {
  const dirs = new Set(group.map((company) => company.hops[0]?.dir ?? 'out'))
  return dirs.size === 1 ? [...dirs][0] : null
}

function investHead(stockName: string, group: readonly LinkedCompany[]): string {
  const dir = groupDir(group)
  if (dir === 'in') return `${stockName}에 투자했어요 · ${group.length}곳`
  if (dir === 'out') return `${stockName}${josa(stockName, '이/가')} 투자했어요 · ${group.length}곳`
  return `투자로 이어져요 · ${group.length}곳`
}

function acquireHead(stockName: string, group: readonly LinkedCompany[]): string {
  const dir = groupDir(group)
  if (dir === 'in') return `${stockName}${josa(stockName, '을/를')} 인수했어요 · ${group.length}곳`
  if (dir === 'out') return `${stockName}${josa(stockName, '이/가')} 인수했어요 · ${group.length}곳`
  return `인수로 이어져요 · ${group.length}곳`
}

export type MapHeads = Record<'supply' | 'customer', string> & Partial<Record<MapGroupKey, string>>

export function mapHeads(stockName: string, groups: LinkMapGroups): MapHeads {
  const via = groups.via ? `${groups.via}${josa(groups.via, '을/를')} 거쳐` : '한 번 더 거쳐'
  const heads: MapHeads = {
    supply: `${stockName}에 공급해요 · ${groups.supply.length}곳`,
    customer: `${stockName}에서 사 가요 · ${groups.customer.length}곳`,
  }
  if (groups.invest.length > 0) heads.invest = investHead(stockName, groups.invest)
  if (groups.acquire.length > 0) heads.acquire = acquireHead(stockName, groups.acquire)
  if (groups.theme.length > 0) heads.theme = `같은 테마로 묶여요 · ${groups.theme.length}곳`
  if (groups.second.length > 0) heads.second = `${via} 이어져요 · 2단계 ${groups.second.length}곳`
  return heads
}

export function filterLinks(list: readonly LinkedCompany[], filter: LinkFilter): LinkedCompany[] {
  return filter === 'all' ? [...list] : list.filter((company) => company.type === filter)
}

export function hasQuote(company: Pick<LinkedCompany, 'code' | 'price'>): boolean {
  return company.code !== null || company.price !== null
}

export function linkEvidenceCount(company: LinkedCompany): number {
  return company.evidenceCount ?? company.evidence.length
}

export function compareChange(a: LinkedCompany, b: LinkedCompany): number {
  if (a.change === null || b.change === null) return (a.change === null ? 1 : 0) - (b.change === null ? 1 : 0)
  return b.change - a.change
}

export function compareLinks(a: LinkedCompany, b: LinkedCompany): number {
  return (
    a.hops.length - b.hops.length ||
    b.strength - a.strength ||
    linkEvidenceCount(b) - linkEvidenceCount(a) ||
    (b.lastMentioned ?? '').localeCompare(a.lastMentioned ?? '') ||
    compareChange(a, b)
  )
}

export function sortLinks(list: readonly LinkedCompany[], sort: LinkSort): LinkedCompany[] {
  return [...list].sort(sort === 'change' ? (a, b) => compareChange(a, b) || compareLinks(a, b) : compareLinks)
}

export function linkChips(list: readonly LinkedCompany[]): { value: LinkFilter; label: string; count: number }[] {
  const counts = linkCounts(list)
  return [
    { value: 'all', label: '전체', count: counts.total },
    ...LINK_TYPES.filter((type) => typeCount(counts, type) > 0).map((type) => ({
      value: type,
      label: LINK_TYPE_LABEL[type],
      count: typeCount(counts, type),
    })),
  ]
}

export function linkCaption(filter: LinkFilter, count: number, sort: LinkSort): string {
  const scope = filter === 'all' ? '전체 ' : `${LINK_TYPE_LABEL[filter]} 관계 `
  return `${scope}${count}곳 · ${LINK_SORTS.find((s) => s.value === sort)?.label ?? ''}`
}

export function linkPath(stockName: string, company: LinkedCompany): string {
  const hops = company.hops.map((hop) => `${LINK_TYPE_LABEL[hop.edge]} → ${hop.node}`).join(' → ')
  return `${stockName} → ${hops} · ${company.hops.length}단계${company.confirmed ? ' · 공시 확인' : ''}`
}

export function nodeTag(company: LinkedCompany): string {
  return `${company.tag}${company.confirmed ? ' · 공시 확인' : ''}`
}

export function nodeAria(company: LinkedCompany): string {
  const today = company.change === null ? '' : `오늘 ${formatChange(company.change)}, `
  return `${company.name}, ${company.relation}, ${today}근거 보기`
}

export function evidenceCountLabel(company: LinkedCompany): string {
  return `근거 ${linkEvidenceCount(company)}건${company.confirmed ? ' · 공시로 확인' : ''}`
}

export function watchLabel(name: string, on: boolean): string {
  return `${name} 관심 종목${on ? '에서 빼기' : '에 추가'}`
}
