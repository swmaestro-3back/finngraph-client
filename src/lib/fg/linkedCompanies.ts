import type { StockRowRes } from '@/lib/apiTypes'
import { dartFilingUrl } from '@/lib/companyOverview'
import { rankItems } from '@/lib/edgeEvidence'
import { pressName } from '@/lib/format'
import { quoteExtOf } from '@/lib/fg/hub'
import type { IssueLink } from '@/lib/fg/issueRecords'
import type { LinkStrength } from '@/lib/fg/stockDetail'
import {
  compareLinks,
  linkEvidenceCount,
  type LinkDirection,
  type LinkedCompany,
  type LinkEvidence,
  type LinkHop,
  type LinkPair,
  type LinkRelType,
  type LinkType,
} from '@/lib/fg/stockLinks'
import { josa } from '@/lib/josa'
import type { KgCompanyNode, KgCompanyRes, KgSupplyChainRes, KgSupplyRelRes } from '@/lib/kgApiTypes'

export interface LinkGraph {
  overview: KgCompanyRes | null
  chain: KgSupplyChainRes | null
}

export const EMPTY_LINK_GRAPH: LinkGraph = { overview: null, chain: null }

export const LINK_REL_TYPES: readonly LinkRelType[] = ['SUPPLIES_TO', 'INVESTS_IN', 'ACQUIRES']

const KRX_MARKETS = new Set(['KOSPI', 'KOSDAQ'])
const KRX_CODE = /^[0-9][0-9A-Z]{5}$/
const ITEM_KIND = /^[^:：]{1,24}[:：]\s*/
const TITLE_ITEM_MAX = 16
const CHIP_ITEM_MAX = 10
const TAG_ITEM_MAX = 14
const TYPE_ORDER: readonly LinkType[] = ['supply', 'customer', 'invest', 'acquire', 'theme']

export const LINKED_PREVIEW_SIZE = 3
export const ISSUE_LINK_SOURCES = 10

type RelEdge = KgSupplyRelRes & { type: LinkRelType }

function isRelEdge(rel: { type: string }): rel is RelEdge {
  return LINK_REL_TYPES.some((type) => type === rel.type)
}

interface EdgeStats {
  newsCount: number
  disclosureCount: number
  strength: LinkStrength
  confirmed: boolean
  last: string | null
  items: string[]
}

function clip(text: string, max: number): string {
  const chars = [...text]
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text
}

function itemCandidates(rel: RelEdge): string[] {
  const disclosures = rel.disclosures.map((d) => d.item?.replace(ITEM_KIND, '').trim() ?? null)
  const pool = [...rel.news.map((n) => n.item), ...disclosures].map((item, i) => ({ news_id: String(i), item }))
  const ranked = rankItems({ news: pool })
  const specific = ranked.filter((item) => !item.generic)
  return (specific.length > 0 ? specific : ranked).map((item) => item.text)
}

export function strengthOf(newsCount: number, disclosureCount: number): LinkStrength {
  if (disclosureCount >= 1) return 3
  if (newsCount >= 2) return 2
  return 1
}

function edgeStats(rel: RelEdge): EdgeStats {
  const newsCount = Math.max(0, rel.news_mention_count)
  const disclosureCount = Math.max(0, rel.disclosure_count)
  return {
    newsCount,
    disclosureCount,
    strength: strengthOf(newsCount, disclosureCount),
    confirmed: disclosureCount > 0,
    last: rel.last_mentioned_at,
    items: itemCandidates(rel),
  }
}

function compareStats(a: EdgeStats, b: EdgeStats): number {
  return (
    b.strength - a.strength ||
    b.newsCount + b.disclosureCount - (a.newsCount + a.disclosureCount) ||
    (b.last ?? '').localeCompare(a.last ?? '')
  )
}

function nodeName(node: KgCompanyNode): string {
  return node.name?.trim() || node.ticker || node.id
}

function nodeKey(node: KgCompanyNode): string {
  return node.ticker || nodeName(node)
}

export function krxCode(node: Pick<KgCompanyNode, 'ticker' | 'market'>): string | null {
  return node.ticker && node.market && KRX_MARKETS.has(node.market) && KRX_CODE.test(node.ticker) ? node.ticker : null
}

export function linkMarket(node: Pick<KgCompanyNode, 'market' | 'is_listed'>): string {
  if (node.market) return node.market
  return node.is_listed ? '해외' : '비상장'
}

interface Step {
  edge: LinkType
  dir: LinkDirection
  rel: RelEdge
  stats: EdgeStats
}

function stepOf(rel: RelEdge, prevId: string): Step {
  const dir: LinkDirection = rel.start === prevId ? 'out' : 'in'
  let edge: LinkType
  if (rel.type === 'SUPPLIES_TO') edge = dir === 'in' ? 'supply' : 'customer'
  else edge = rel.type === 'INVESTS_IN' ? 'invest' : 'acquire'
  return { edge, dir, rel, stats: edgeStats(rel) }
}

function compareSteps(a: Step, b: Step): number {
  return compareStats(a.stats, b.stats) || TYPE_ORDER.indexOf(a.edge) - TYPE_ORDER.indexOf(b.edge)
}

function fits(items: readonly string[], max: number): string | null {
  return items.find((item) => [...item].length <= max) ?? null
}

interface Wording {
  relation: string
  tag: string
  title: string
}

export function linkWording(edge: LinkType, dir: LinkDirection, prev: string, target: string, items: readonly string[]): Wording {
  const neun = josa(target, '은/는')
  const prevGa = josa(prev, '이/가')
  const titleItem = fits(items, TITLE_ITEM_MAX)
  const chipItem = fits(items, CHIP_ITEM_MAX)
  const tagItem = titleItem ?? (items[0] ? clip(items[0], TAG_ITEM_MAX) : null)
  switch (edge) {
    case 'supply':
      return {
        relation: chipItem ? `${prev}의 ${chipItem} 공급사` : `${prev}의 공급사`,
        tag: tagItem ? `${tagItem} 공급` : '공급',
        title: titleItem
          ? `${target}${neun} ${prev}에 ${titleItem}${josa(titleItem, '을/를')} 공급해요`
          : `${target}${neun} ${prev}에 공급해요`,
      }
    case 'customer':
      return {
        relation: chipItem ? `${prev}의 ${chipItem} 고객사` : `${prev}의 고객사`,
        tag: tagItem ? `${tagItem} 구매` : '구매',
        title: titleItem ? `${target}${neun} ${prev}의 ${titleItem} 고객사예요` : `${target}${neun} ${prev}의 고객사예요`,
      }
    case 'invest':
      return dir === 'out'
        ? { relation: `${prev}${prevGa} 투자한 회사`, tag: '투자받은 회사', title: `${target}${neun} ${prev}${prevGa} 투자한 회사예요` }
        : { relation: `${prev}에 투자한 회사`, tag: '투자한 회사', title: `${target}${neun} ${prev}에 투자했어요` }
    case 'acquire':
      return dir === 'out'
        ? { relation: `${prev}${prevGa} 인수한 회사`, tag: '인수된 회사', title: `${target}${neun} ${prev}${prevGa} 인수한 회사예요` }
        : {
            relation: `${prev}${josa(prev, '을/를')} 인수한 회사`,
            tag: '인수한 회사',
            title: `${target}${neun} ${prev}${josa(prev, '을/를')} 인수했어요`,
          }
    case 'theme':
      return {
        relation: `${prev}${josa(prev, '와/과')} 같은 테마`,
        tag: '같은 테마',
        title: `${target}${neun} ${prev}${josa(prev, '와/과')} 같은 테마로 묶여요`,
      }
  }
}

function hopOf(step: Step, node: string): LinkHop {
  return { edge: step.edge, node, dir: step.dir, confirmed: step.stats.confirmed }
}

function companyOf(target: KgCompanyNode, prev: { name: string; key: string }, steps: readonly Step[], names: readonly string[]): LinkedCompany {
  const last = steps[steps.length - 1]
  const name = nodeName(target)
  const wording = linkWording(last.edge, last.dir, prev.name, name, last.stats.items)
  const subjectIsPrev = last.dir === 'out'
  return {
    id: target.id,
    code: krxCode(target),
    name,
    market: linkMarket(target),
    price: null,
    change: null,
    gapFromHigh: null,
    position: null,
    type: last.edge,
    ...wording,
    tag: steps.length > 1 ? wording.relation : wording.tag,
    hops: steps.map((step, i) => hopOf(step, names[i])),
    strength: Math.min(...steps.map((step) => step.stats.strength)) as LinkStrength,
    confirmed: steps.every((step) => step.stats.confirmed),
    evidence: [],
    evidenceCount: last.stats.newsCount + last.stats.disclosureCount,
    lastMentioned: last.stats.last,
    pair: {
      a: subjectIsPrev ? prev.key : nodeKey(target),
      b: subjectIsPrev ? nodeKey(target) : prev.key,
      type: last.rel.type,
    },
  }
}

function centerOf(graph: LinkGraph, ticker: string): KgCompanyNode | null {
  const nodes = [...(graph.overview?.companies ?? []), ...(graph.chain?.companies ?? [])]
  return nodes.find((node) => node.ticker === ticker) ?? null
}

function nodeIndex(graph: LinkGraph): Map<string, KgCompanyNode> {
  const index = new Map<string, KgCompanyNode>()
  for (const node of [...(graph.overview?.companies ?? []), ...(graph.chain?.companies ?? [])]) if (!index.has(node.id)) index.set(node.id, node)
  return index
}

function relEdges(graph: LinkGraph): RelEdge[] {
  const seen = new Set<string>()
  const edges: RelEdge[] = []
  for (const rel of [...(graph.overview?.relationships ?? []), ...(graph.chain?.relationships ?? [])]) {
    if (!isRelEdge(rel) || rel.start === rel.end || seen.has(rel.id)) continue
    seen.add(rel.id)
    edges.push(rel)
  }
  return edges
}

function otherEnd(rel: RelEdge, id: string): string | null {
  if (rel.start === id) return rel.end
  if (rel.end === id) return rel.start
  return null
}

function bestBy<K, V>(entries: Iterable<[K, V]>, compare: (a: V, b: V) => number): Map<K, V> {
  const best = new Map<K, V>()
  for (const [key, value] of entries) {
    const held = best.get(key)
    if (held === undefined || compare(value, held) < 0) best.set(key, value)
  }
  return best
}

export function firstHopIds(graph: LinkGraph, ticker: string): Set<string> {
  const center = centerOf(graph, ticker)
  const ids = new Set<string>()
  if (!center) return ids
  const nodes = nodeIndex(graph)
  for (const rel of relEdges(graph)) {
    const other = otherEnd(rel, center.id)
    if (other !== null && nodes.has(other)) ids.add(other)
  }
  return ids
}

export function firstHopCount(graph: LinkGraph, ticker: string): number {
  return firstHopIds(graph, ticker).size
}

export function buildLinkedCompanies(graph: LinkGraph, ticker: string, centerName: string): LinkedCompany[] {
  const center = centerOf(graph, ticker)
  if (!center) return []
  const nodes = nodeIndex(graph)
  const edges = relEdges(graph)
  const centerRef = { name: centerName, key: ticker }

  const firstSteps = bestBy(
    edges.flatMap((rel): [string, Step][] => {
      const other = otherEnd(rel, center.id)
      return other !== null && nodes.has(other) ? [[other, stepOf(rel, center.id)]] : []
    }),
    compareSteps,
  )

  const chainVia = bestBy(
    edges.flatMap((rel): [string, Step][] => {
      const other = otherEnd(rel, center.id)
      return other !== null && rel.type === 'SUPPLIES_TO' && firstSteps.has(other) ? [[other, stepOf(rel, center.id)]] : []
    }),
    compareSteps,
  )

  const first: LinkedCompany[] = []
  for (const [id, step] of firstSteps) {
    const node = nodes.get(id)
    if (node) first.push(companyOf(node, centerRef, [step], [nodeName(node)]))
  }

  interface Path {
    via: KgCompanyNode
    steps: [Step, Step]
  }
  const comparePaths = (a: Path, b: Path) => {
    const strength = (path: Path) => Math.min(path.steps[0].stats.strength, path.steps[1].stats.strength)
    return (
      strength(b) - strength(a) ||
      compareSteps(a.steps[1], b.steps[1]) ||
      compareSteps(a.steps[0], b.steps[0]) ||
      nodeName(a.via).localeCompare(nodeName(b.via))
    )
  }
  const secondPaths = bestBy(
    (graph.chain?.relationships ?? []).filter(isRelEdge).flatMap((rel): [string, Path][] => {
      if (rel.type !== 'SUPPLIES_TO' || rel.start === rel.end) return []
      const viaId = chainVia.has(rel.start) ? rel.start : chainVia.has(rel.end) ? rel.end : null
      if (viaId === null) return []
      const targetId = rel.start === viaId ? rel.end : rel.start
      if (targetId === center.id || firstSteps.has(targetId) || !nodes.has(targetId)) return []
      const via = nodes.get(viaId)
      const firstStep = chainVia.get(viaId)
      if (!via || !firstStep) return []
      return [[targetId, { via, steps: [firstStep, stepOf(rel, viaId)] }]]
    }),
    comparePaths,
  )

  const second: LinkedCompany[] = []
  for (const [id, path] of secondPaths) {
    const node = nodes.get(id)
    if (!node) continue
    const viaName = nodeName(path.via)
    second.push(companyOf(node, { name: viaName, key: nodeKey(path.via) }, path.steps, [viaName, nodeName(node)]))
  }

  return [...first, ...second].sort(compareLinks)
}

export function withQuotes(
  list: readonly LinkedCompany[],
  quotes: ReadonlyMap<string, StockRowRes> | null,
  basisDate: string | null | undefined,
): LinkedCompany[] {
  return list
    .map((company) => {
      if (company.code === null) return company
      const row = quotes?.get(company.code) ?? null
      if (quotes !== null && row === null) return { ...company, code: null }
      if (row === null) return company
      const ext = quoteExtOf(row, basisDate)
      return {
        ...company,
        price: row.price,
        change: row.change,
        gapFromHigh: ext?.gapFromHigh ?? null,
        position: ext?.position ?? null,
        newHigh: ext?.high === true,
      }
    })
    .sort(compareLinks)
}

export function isFirstHop(company: LinkedCompany): boolean {
  return company.hops.length <= 1
}

export function firstHopOf(list: readonly LinkedCompany[]): LinkedCompany[] {
  return list.filter(isFirstHop)
}

export interface LinkedPreview {
  total: number
  rows: LinkedCompany[]
}

export function linkedPreview(list: readonly LinkedCompany[], size = LINKED_PREVIEW_SIZE): LinkedPreview {
  const first = firstHopOf(list)
  return { total: first.length, rows: [...first].sort(compareLinks).slice(0, size) }
}

export interface LinkSource {
  name: string
  ticker: string | null
  list: readonly LinkedCompany[]
}

export interface LinkExclusion {
  tickers: ReadonlySet<string>
  names: ReadonlySet<string>
}

function compareUnion(a: LinkedCompany, b: LinkedCompany): number {
  return (
    b.strength - a.strength ||
    a.hops.length - b.hops.length ||
    linkEvidenceCount(b) - linkEvidenceCount(a) ||
    (b.lastMentioned ?? '').localeCompare(a.lastMentioned ?? '')
  )
}

export interface IssueLinkStock {
  name: string
  ticker: string | null
}

export function issueStockTickers(stocks: readonly IssueLinkStock[]): string[] {
  return [...new Set(stocks.flatMap((stock) => (stock.ticker ? [stock.ticker] : [])))]
}

export function issueLinkTickers(stocks: readonly IssueLinkStock[]): string[] {
  return issueStockTickers(stocks).slice(0, ISSUE_LINK_SOURCES)
}

export function issueExclusion(stocks: readonly IssueLinkStock[]): LinkExclusion {
  return { tickers: new Set(issueStockTickers(stocks)), names: new Set(stocks.map((stock) => stock.name)) }
}

export function issueLinkUnion(sources: readonly LinkSource[], exclude: LinkExclusion): IssueLink[] {
  const picked = new Map<string, IssueLink>()
  for (const source of sources.slice(0, ISSUE_LINK_SOURCES)) {
    for (const company of source.list) {
      if (company.code !== null && exclude.tickers.has(company.code)) continue
      if (exclude.names.has(company.name)) continue
      const held = picked.get(company.id)
      if (!held || compareUnion(company, held.company) < 0) picked.set(company.id, { from: source.name, company })
    }
  }
  return [...picked.values()].sort((a, b) => compareLinks(a.company, b.company))
}

export interface RelationEvidenceRes {
  type: LinkRelType
  subjectName: string
  subjectTicker: string | null
  objectName: string
  objectTicker: string | null
  sourceType: 'news' | 'disclosure'
  mentionedAt: string
  evidence: string | null
  sourceSentence?: string | null
  item: string | null
  polarity?: string | null
  tense?: string | null
  newsId?: number | string | null
  title?: string | null
  url?: string | null
  press?: string | null
  rceptNo?: string | null
  subjectImpact?: string | null
  objectImpact?: string | null
}

export function evidenceDate(date: string, today: string): string {
  const [y, m, d] = date.slice(0, 10).split('-')
  if (!y || !m || !d) return date
  return y === today.slice(0, 4) ? `${m}.${d}` : `${y}.${m}.${d}`
}

function sameEnd(key: string, ticker: string | null, name: string): boolean {
  return key === ticker || key === name
}

export function pairRows(rows: readonly RelationEvidenceRes[], pair: LinkPair): RelationEvidenceRes[] {
  return rows.filter(
    (row) =>
      row.type === pair.type &&
      sameEnd(pair.a, row.subjectTicker, row.subjectName) &&
      sameEnd(pair.b, row.objectTicker, row.objectName),
  )
}

const POLARITY_TAG: Readonly<Record<string, string>> = { denied: '부인', terminated: '종료' }
const TENSE_TAG: Readonly<Record<string, string>> = { future_or_planned: '계획', modal_possibility: '가능성' }

export function evidenceTags(polarity: string | null | undefined, tense: string | null | undefined): string[] {
  return [polarity ? POLARITY_TAG[polarity] : undefined, tense ? TENSE_TAG[tense] : undefined].filter(
    (tag): tag is string => tag !== undefined,
  )
}

function clean(text: string | null | undefined): string | null {
  const trimmed = text?.trim()
  return trimmed ? trimmed : null
}

function disclosureQuote(row: RelationEvidenceRes): string | null {
  const parts = [clean(row.title), clean(row.item)].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' — ') : clean(row.evidence)
}

export function toLinkEvidence(rows: readonly RelationEvidenceRes[], today: string): LinkEvidence[] {
  return [...rows]
    .sort((a, b) => b.mentionedAt.localeCompare(a.mentionedAt))
    .flatMap((row): LinkEvidence[] => {
      const disclosure = row.sourceType === 'disclosure'
      const original = disclosure ? null : clean(row.sourceSentence)
      const quote = disclosure ? disclosureQuote(row) : (original ?? clean(row.evidence))
      if (!quote) return []
      return [
        {
          kind: disclosure ? 'disclosure' : 'news',
          quote,
          source: disclosure ? '전자공시' : row.press ? pressName(row.press) : '출처 미상',
          date: evidenceDate(row.mentionedAt, today),
          url: row.url ?? (disclosure && row.rceptNo ? dartFilingUrl(row.rceptNo) : null),
          verbatim: original !== null,
          tags: evidenceTags(row.polarity, row.tense),
        },
      ]
    })
}

export function evidencePairKey(pair: LinkPair): string {
  return `${pair.type}|${pair.a}|${pair.b}`
}
