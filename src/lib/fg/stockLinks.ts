import { formatChange } from '@/lib/format'
import type { LinkStrength } from '@/lib/fg/stockDetail'
import { josa } from '@/lib/josa'

export type LinkType = 'supply' | 'customer' | 'invest' | 'theme'
export type LinkFilter = 'all' | LinkType
export type LinkSort = 'strength' | 'change'

export const LINK_TYPES: readonly LinkType[] = ['supply', 'customer', 'invest', 'theme']

export const LINK_TYPE_LABEL: Record<LinkType, string> = {
  supply: '공급',
  customer: '고객',
  invest: '투자',
  theme: '같은 테마',
}

export const LINK_SORTS: readonly { value: LinkSort; label: string }[] = [
  { value: 'strength', label: '근거 강도 순' },
  { value: 'change', label: '오늘 등락률 순' },
]

const VIA_NOUN: Record<LinkType, string> = {
  supply: '공급사',
  customer: '고객사',
  invest: '투자한 회사',
  theme: '같은 테마 기업',
}

export interface LinkEvidence {
  kind: 'news' | 'disclosure'
  quote: string
  source: string
  date: string
  url: string | null
}

export interface LinkHop {
  edge: LinkType
  node: string
}

export interface LinkedCompany {
  id: string
  code: string | null
  name: string
  market: string
  price: number
  change: number
  gapFromHigh: number
  position: number
  type: LinkType
  relation: string
  tag: string
  title: string
  hops: readonly LinkHop[]
  strength: LinkStrength
  confirmed: boolean
  evidence: readonly LinkEvidence[]
}

export interface LinkCounts {
  total: number
  byType: Record<LinkType, number>
  confirmed: number
  second: number
  via: string | null
}

function isSecond(company: LinkedCompany): boolean {
  return company.hops.length > 1
}

export function linkCounts(list: readonly LinkedCompany[]): LinkCounts {
  const byType: Record<LinkType, number> = { supply: 0, customer: 0, invest: 0, theme: 0 }
  for (const company of list) byType[company.type] += 1
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
  return LINK_TYPES.filter((type) => counts.byType[type] > 0)
    .map((type) => `${LINK_TYPE_LABEL[type]} ${counts.byType[type]}`)
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
  theme: LinkedCompany[]
  second: LinkedCompany[]
  via: string | null
}

export function linkMapGroups(list: readonly LinkedCompany[]): LinkMapGroups {
  const first = list.filter((company) => !isSecond(company))
  const second = list.filter(isSecond)
  const vias = new Set(second.map((company) => company.hops[0].node))
  return {
    supply: first.filter((company) => company.type === 'supply'),
    customer: first.filter((company) => company.type === 'customer'),
    invest: first.filter((company) => company.type === 'invest'),
    theme: first.filter((company) => company.type === 'theme'),
    second,
    via: vias.size === 1 ? [...vias][0] : null,
  }
}

export function mapHeads(stockName: string, groups: LinkMapGroups): Record<'supply' | 'customer' | 'invest' | 'theme' | 'second', string> {
  const via = groups.via ? `${groups.via}${josa(groups.via, '을/를')} 거쳐` : '한 번 더 거쳐'
  return {
    supply: `${stockName}에 공급해요 · ${groups.supply.length}곳`,
    customer: `${stockName}에서 사 가요 · ${groups.customer.length}곳`,
    invest: `${stockName}${josa(stockName, '이/가')} 투자했어요 · ${groups.invest.length}곳`,
    theme: `같은 테마로 묶여요 · ${groups.theme.length}곳`,
    second: `${via} 이어져요 · 2단계 ${groups.second.length}곳`,
  }
}

export function filterLinks(list: readonly LinkedCompany[], filter: LinkFilter): LinkedCompany[] {
  return filter === 'all' ? [...list] : list.filter((company) => company.type === filter)
}

export function sortLinks(list: readonly LinkedCompany[], sort: LinkSort): LinkedCompany[] {
  return [...list].sort(
    sort === 'change' ? (a, b) => b.change - a.change : (a, b) => b.strength - a.strength || b.change - a.change,
  )
}

export function linkChips(list: readonly LinkedCompany[]): { value: LinkFilter; label: string; count: number }[] {
  const counts = linkCounts(list)
  return [
    { value: 'all', label: '전체', count: counts.total },
    ...LINK_TYPES.filter((type) => counts.byType[type] > 0).map((type) => ({
      value: type,
      label: LINK_TYPE_LABEL[type],
      count: counts.byType[type],
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
  return `${company.name}, ${company.relation}, 오늘 ${formatChange(company.change)}, 근거 보기`
}

export function evidenceCountLabel(company: LinkedCompany): string {
  return `근거 ${company.evidence.length}건${company.confirmed ? ' · 공시로 확인' : ''}`
}

export function watchLabel(name: string, on: boolean): string {
  return `${name} 관심 종목${on ? '에서 빼기' : '에 추가'}`
}
