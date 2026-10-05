import { rankLinks } from '@/lib/fg/issuePage'
import type { IssueArticleItem, IssueLink, IssueStock } from '@/lib/fg/issueRecords'
import {
  compareChange,
  LINK_SORTS,
  LINK_TYPE_LABEL,
  LINK_TYPES,
  linkChips,
  type LinkFilter,
  type LinkSort,
  type LinkType,
} from '@/lib/fg/stockLinks'
import { josa } from '@/lib/josa'

export interface NewsStockCard {
  key: string
  name: string
  ticker: string | null
  market: string | null
  price: number | null
  change: number | null
  gapFromHigh: number | null
  position: number | null
  newHigh?: boolean
  role: string | null
  articles: number
  mentionIds: readonly string[] | null
  links: number | null
  picks?: number
}

export function stockKey(stock: Pick<IssueStock, 'name' | 'ticker'>): string {
  return stock.ticker ?? stock.name
}

function fromCount(links: readonly IssueLink[], name: string): number {
  return links.filter((link) => link.from === name).length
}

function newsStockCard(stock: IssueStock): Omit<NewsStockCard, 'links'> {
  return {
    key: stockKey(stock),
    name: stock.name,
    ticker: stock.ticker,
    market: stock.market ?? null,
    price: stock.price ?? null,
    change: stock.change,
    gapFromHigh: stock.gapFromHigh ?? null,
    position: stock.position ?? null,
    newHigh: stock.newHigh,
    role: stock.role ?? null,
    articles: stock.mentions ?? stock.mentionIds?.length ?? 0,
    mentionIds: stock.mentionIds ?? null,
  }
}

export function newsStockCards(
  stocks: readonly IssueStock[],
  links: readonly IssueLink[] | null,
  firstHops?: ReadonlyMap<string, number> | null,
): NewsStockCard[] {
  if (firstHops === undefined) {
    return stocks.map((stock) => ({ ...newsStockCard(stock), links: links ? fromCount(links, stock.name) : null }))
  }
  return stocks.map((stock) => ({
    ...newsStockCard(stock),
    links: stock.ticker && firstHops ? (firstHops.get(stock.ticker) ?? null) : null,
    picks: links ? fromCount(links, stock.name) : 0,
  }))
}

export function cardPicks(card: Pick<NewsStockCard, 'links' | 'picks'>): number {
  return card.picks ?? card.links ?? 0
}

export const SCOPE_FROM = 'from'
export const SCOPE_TYPE = 'type'

export interface LinkScope {
  source: NewsStockCard | null
  filter: LinkFilter
}

function isLinkType(value: string | null): value is LinkType {
  return LINK_TYPES.some((type) => type === value)
}

export function scopeLinks(links: readonly IssueLink[], sourceName: string | null): IssueLink[] {
  return sourceName === null ? [...links] : links.filter((link) => link.from === sourceName)
}

export function readLinkScope(search: string, cards: readonly NewsStockCard[], links: readonly IssueLink[]): LinkScope {
  const params = new URLSearchParams(search)
  const from = params.get(SCOPE_FROM)
  const source = cards.find((card) => card.key === from && cardPicks(card) > 0) ?? null
  const type = params.get(SCOPE_TYPE)
  const scoped = scopeLinks(links, source?.name ?? null)
  const filter = isLinkType(type) && scoped.some((link) => link.company.type === type) ? type : 'all'
  return { source, filter }
}

export function linkScopeSearch(search: string, from: string | null, filter: LinkFilter): string {
  const params = new URLSearchParams(search)
  if (from === null) params.delete(SCOPE_FROM)
  else params.set(SCOPE_FROM, from)
  if (filter === 'all') params.delete(SCOPE_TYPE)
  else params.set(SCOPE_TYPE, filter)
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function sortIssueLinks(links: readonly IssueLink[], sort: LinkSort): IssueLink[] {
  if (sort === 'strength') return rankLinks(links)
  return [...links].sort((a, b) => compareChange(a.company, b.company))
}

export function issueLinkChips(links: readonly IssueLink[]) {
  return linkChips(links.map((link) => link.company))
}

export function issueLinkCaption(sourceName: string | null, filter: LinkFilter, count: number, sort: LinkSort): string {
  const scope = sourceName ? `${sourceName}에서 이어진 ` : ''
  const type = filter === 'all' ? (sourceName ? '' : '전체 ') : `${LINK_TYPE_LABEL[filter]} `
  return `${scope}${type}${count}곳 · ${LINK_SORTS.find((s) => s.value === sort)?.label ?? ''}`
}

export function issueLinkSortOptions(narrow: boolean): { value: LinkSort; label: string }[] {
  return LINK_SORTS.map((option) =>
    narrow && option.value === 'change' ? { value: option.value, label: '등락률 순' } : { ...option },
  )
}

export interface SummaryPart {
  text: string
  strong: boolean
}

const TYPE_PHRASE: Record<LinkType, string> = {
  supply: '공급망으로',
  customer: '고객 관계로',
  invest: '지분 투자로',
  acquire: '인수 관계로',
  theme: '같은 테마로',
}

const NAMED_SOURCES = 3

function sourceParts(links: readonly IssueLink[], cards: readonly NewsStockCard[]): SummaryPart[] {
  const order = new Map(cards.map((card, i) => [card.name, i]))
  const counts = new Map<string, number>()
  for (const link of links) counts.set(link.from, (counts.get(link.from) ?? 0) + 1)
  const sources = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || (order.get(a[0]) ?? Infinity) - (order.get(b[0]) ?? Infinity),
  )
  const total = links.length
  const tail = { text: ' 거쳐 이 이슈와 이어져요.', strong: false }
  if (sources.length === 1) {
    const [name] = sources[0]
    return [
      { text: total === 1 ? '1곳이 ' : `${total}곳 모두 `, strong: false },
      { text: name, strong: true },
      { text: josa(name, '을/를'), strong: false },
      tail,
    ]
  }
  const named = sources.length > NAMED_SOURCES ? sources.slice(0, NAMED_SOURCES) : sources
  const rest = sources.slice(named.length).reduce((sum, [, n]) => sum + n, 0)
  const parts: SummaryPart[] = [{ text: `${total}곳 중 `, strong: false }]
  named.forEach(([name, n], i) => {
    parts.push({ text: `${i === 0 ? '' : ', '}${n}곳은 `, strong: false })
    parts.push({ text: name, strong: true })
    parts.push({ text: josa(name, '을/를'), strong: false })
  })
  if (rest > 0) parts.push({ text: `, 나머지 ${rest}곳은 다른 종목을`, strong: false })
  parts.push(tail)
  return parts
}

function typeSentence(links: readonly IssueLink[]): string {
  const counts = LINK_TYPES.map((type) => ({ type, n: links.filter((link) => link.company.type === type).length })).filter(
    (entry) => entry.n > 0,
  )
  if (counts.length === 1) {
    const phrase = TYPE_PHRASE[counts[0].type]
    return links.length === 1 ? `${phrase} 이어졌어요.` : `모두 ${phrase} 이어졌어요.`
  }
  const max = Math.max(...counts.map((entry) => entry.n))
  const top = counts.filter((entry) => entry.n === max)
  if (top.length === 1) return `${TYPE_PHRASE[top[0].type]} 이어진 곳이 ${max}곳으로 가장 많아요.`
  return `${top.map((entry) => LINK_TYPE_LABEL[entry.type]).join('·')} 관계로 이어진 곳이 ${max}곳씩으로 가장 많아요.`
}

function merge(parts: readonly SummaryPart[]): SummaryPart[] {
  const result: SummaryPart[] = []
  for (const part of parts) {
    const last = result[result.length - 1]
    if (last && !last.strong && !part.strong) last.text += part.text
    else result.push({ ...part })
  }
  return result
}

export function issueLinkSummary(links: readonly IssueLink[], cards: readonly NewsStockCard[]): SummaryPart[] {
  if (links.length === 0) return []
  return merge([...sourceParts(links, cards), { text: ` ${typeSentence(links)}`, strong: false }])
}

export function newsStocksCaption(kind: 'mock' | 'live', narrow: boolean): string {
  const parts = [...(narrow ? [] : ['기사에 이름이 나온 종목이에요']), '많이 나온 순']
  if (kind === 'mock') parts.push('뉴스 속 역할은 AI가 요약했어요')
  return parts.join(' · ')
}

export function stockSheetTitle(name: string, count: number): string {
  return `${name}${josa(name, '이/가')} 나온 기사 ${count}건이에요`
}

export function cardArticles(
  card: NewsStockCard,
  articles: readonly IssueArticleItem[],
  byTicker: ReadonlyMap<string, readonly IssueArticleItem[]> | null,
): IssueArticleItem[] | null {
  if (card.mentionIds) {
    const ids = new Set(card.mentionIds)
    return articles.filter((article) => ids.has(article.id))
  }
  if (!card.ticker || !byTicker) return null
  return [...(byTicker.get(card.ticker) ?? [])]
}
