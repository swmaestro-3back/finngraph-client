import type { SummaryPointRes } from '@/lib/apiTypes'
import type { LinkedCompany } from '@/lib/fg/stockLinks'

export interface IssueStock {
  name: string
  ticker: string | null
  change: number | null
  mentions?: number
  market?: string | null
  price?: number | null
  gapFromHigh?: number | null
  position?: number | null
  newHigh?: boolean
  role?: string | null
  mentionIds?: readonly string[]
}

export interface IssueArticleItem {
  id: string
  title: string
  url: string | null
  press: string
  pressKey: string | null
  day: string | null
  time: string | null
  summary: string | null
  analyzed: boolean
}

export interface IssueStep {
  date: string
  title: string
}

export interface IssueSeed {
  id: string
  title: string
  media: number
  articles: number
  minutesAgo: number
  theme: string
  steps: readonly IssueStep[]
  summary: string
  stocks: readonly IssueStock[]
  inferred: number
}

export interface IssueDaySeed {
  date: string
  issues: readonly IssueSeed[]
}

export interface IssuePoint {
  label: string
  text: string
}

const POINT_LABELS: Readonly<Record<string, string>> = {
  CHANGE: '무엇이 바뀌었나요?',
  AFFECTED: '어떤 영향이 있나요?',
  CAUSE: '무엇이 원인인가요?',
  SCALE: '얼마나 큰가요?',
  RIPPLE: '어디로 이어지나요?',
}

export function summaryPointItems(points: readonly SummaryPointRes[] | undefined): IssuePoint[] {
  return (points ?? []).flatMap((point) => {
    const label = POINT_LABELS[point.kind]
    const text = point.text.trim()
    return label && text ? [{ label, text }] : []
  })
}

export interface IssueLink {
  from: string
  company: LinkedCompany
}

export interface IssueExtra {
  shortTitle?: string
  flowTitle?: string
  detail?: string
  points?: readonly IssuePoint[]
}

export interface IssueRecord {
  id: string
  date: string
  updated: string
  title: string
  shortTitle: string
  flowTitle: string
  media: number
  articles: number
  theme: string
  summary: string
  detail: string
  points: readonly IssuePoint[]
  stocks: readonly IssueStock[]
  links: readonly IssueLink[]
  chain: readonly string[]
  articleList: readonly IssueArticleItem[]
}

export interface IssueBook {
  today: string
  snapshot: string
  records: readonly IssueRecord[]
  aliases: Readonly<Record<string, string>>
}

export interface IssueBookInput {
  snapshot: string
  days: readonly IssueDaySeed[]
  archive: readonly IssueDaySeed[]
  extras: Readonly<Record<string, IssueExtra>>
  links: (seed: IssueSeed) => readonly IssueLink[]
  aliases: Readonly<Record<string, string>>
  titleAliases?: Readonly<Record<string, string>>
  articles?: (record: Omit<IssueRecord, 'articleList'>) => readonly IssueArticleItem[]
}

export function clockOf(snapshot: string, minutesAgo: number): string {
  const [h, m] = snapshot.split(':').map(Number)
  const total = Math.max(0, h * 60 + m - minutesAgo)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

interface Dated {
  date: string
  seed: IssueSeed
}

function lineages(items: readonly Dated[], titleAliases: Readonly<Record<string, string>>): string[][] {
  const byTitle = new Map<string, string>()
  for (const { seed } of items) if (!byTitle.has(seed.title)) byTitle.set(seed.title, seed.id)
  return items.map(({ seed }) => {
    const prior = seed.steps.flatMap((step) => {
      const id = titleAliases[step.title] ?? byTitle.get(step.title)
      return id && id !== seed.id ? [id] : []
    })
    return [...prior, seed.id]
  })
}

function chainOf(id: string, all: readonly string[][]): string[] {
  let best: string[] = [id]
  for (const line of all) if (line.includes(id) && line.length > best.length) best = line
  return best
}

export function buildIssueBook(input: IssueBookInput): IssueBook {
  const items: Dated[] = [...input.days, ...input.archive].flatMap((day) =>
    day.issues.map((seed) => ({ date: day.date, seed })),
  )
  const all = lineages(items, input.titleAliases ?? {})
  const titleOf = new Map(items.map(({ seed }) => [seed.id, seed.title]))
  const records = items.map(({ date, seed }): IssueRecord => {
    const extra = input.extras[seed.id] ?? {}
    const chain = chainOf(seed.id, all)
    const flowExtra = chain.map((id) => input.extras[id]?.flowTitle).find((title) => title !== undefined)
    const base: Omit<IssueRecord, 'articleList'> = {
      id: seed.id,
      date,
      updated: clockOf(input.snapshot, seed.minutesAgo),
      title: seed.title,
      shortTitle: extra.shortTitle ?? seed.title,
      flowTitle: extra.flowTitle ?? flowExtra ?? titleOf.get(chain[0]) ?? seed.title,
      media: seed.media,
      articles: seed.articles,
      theme: seed.theme,
      summary: seed.summary,
      detail: extra.detail ?? seed.summary,
      points: extra.points ?? [],
      stocks: seed.stocks,
      links: input.links(seed),
      chain,
    }
    return { ...base, articleList: input.articles?.(base) ?? [] }
  })
  return {
    today: input.days[0]?.date ?? '',
    snapshot: input.snapshot,
    records,
    aliases: input.aliases,
  }
}

export function findIssue(book: IssueBook, id: string): IssueRecord | null {
  return book.records.find((record) => record.id === id) ?? null
}

export function resolveIssueId(book: IssueBook, id: string): string | null {
  if (!id) return null
  if (findIssue(book, id)) return id
  const target = book.aliases[id]
  return target && findIssue(book, target) ? target : null
}
