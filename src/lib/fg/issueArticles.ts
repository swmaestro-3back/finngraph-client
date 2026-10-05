import type { IssueArticleItem } from '@/lib/fg/issueRecords'
import { dayWord } from '@/lib/fg/issueSubject'
import { byPublished } from '@/lib/fg/issueTimeline'
import { shortDate } from '@/lib/fg/stockIssues'

export type ArticleSort = 'time' | 'media'

export const ARTICLE_SORTS: readonly { value: ArticleSort; label: string }[] = [
  { value: 'time', label: '최신순' },
  { value: 'media', label: '매체 이름순' },
]

export const ARTICLE_LIMIT = 12
export const MEDIA_TOP = 8

const collator = new Intl.Collator('ko')

export function sortArticles(items: readonly IssueArticleItem[], sort: ArticleSort): IssueArticleItem[] {
  const latest = [...items].sort(byPublished)
  const dated = latest.filter((a) => a.day && a.time).reverse()
  const undated = latest.filter((a) => !(a.day && a.time))
  const byTime = [...dated, ...undated]
  if (sort === 'time') return byTime
  const rank = new Map(byTime.map((a, i) => [a.id, i]))
  return [...byTime].sort((a, b) => collator.compare(a.press, b.press) || (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
}

function multiDay(items: readonly IssueArticleItem[]): boolean {
  return new Set(items.flatMap((a) => (a.day ? [a.day] : []))).size > 1
}

export interface ArticleRow {
  item: IssueArticleItem
  date: string | null
  time: string
}

export function articleRows(items: readonly IssueArticleItem[], sort: ArticleSort): ArticleRow[] {
  const spread = multiDay(items)
  return sortArticles(items, sort).map((item) => ({
    item,
    date: spread && item.day ? shortDate(item.day) : null,
    time: item.time ?? '—',
  }))
}

function stamp(article: IssueArticleItem, today: string): string {
  return `${dayWord(article.day ?? '', today)} ${article.time}`
}

export function articlesSubtitle(items: readonly IssueArticleItem[], media: number, today: string): string {
  const hint = items.some((a) => a.analyzed)
    ? '제목을 누르면 기사 분석을, 원문 아이콘을 누르면 매체 원문을 봐요.'
    : '제목을 누르면 매체 원문으로 가요.'
  const dated = [...items].filter((a) => a.day && a.time).sort(byPublished)
  const who = `${media}개 매체가`
  if (dated.length === 0) return `${who} 썼어요. ${hint}`
  const first = dated[0]
  const last = dated[dated.length - 1]
  if (first.day === last.day && first.time === last.time) return `${who} ${stamp(first, today)}에 썼어요. ${hint}`
  const end = first.day === last.day ? last.time : stamp(last, today)
  return `${who} ${stamp(first, today)}부터 ${end}까지 썼어요. ${hint}`
}

export interface MediaRow {
  key: string
  name: string
  count: number
  pct: number
}

export interface MediaTally {
  total: number
  rows: MediaRow[]
  caption: string
  rest: string | null
}

export function mediaTally(items: readonly IssueArticleItem[], today: string): MediaTally {
  const groups = new Map<string, { name: string; count: number }>()
  for (const item of items) {
    if (!item.pressKey) continue
    const group = groups.get(item.pressKey)
    if (group) group.count += 1
    else groups.set(item.pressKey, { name: item.press, count: 1 })
  }
  const ranked = [...groups.entries()]
    .map(([key, g]) => ({ key, name: g.name, count: g.count }))
    .sort((a, b) => b.count - a.count || collator.compare(a.name, b.name))
  const top = ranked.slice(0, MEDIA_TOP)
  const max = Math.max(...top.map((r) => r.count), 1)
  const rest = ranked.slice(MEDIA_TOP)
  const restSum = rest.reduce((sum, r) => sum + r.count, 0)
  let restText: string | null = null
  if (rest.length > 0) {
    restText = restSum === rest.length ? `나머지 ${rest.length}곳은 1건씩 썼어요` : `나머지 ${rest.length}곳이 기사 ${restSum}건을 썼어요`
  }
  const first = items.filter((a) => a.pressKey && a.day && a.time).sort(byPublished)[0]
  const firstWhen = first ? (multiDay(items) ? stamp(first, today) : first.time) : null
  return {
    total: ranked.length,
    rows: top.map((r) => ({ ...r, pct: Math.round((r.count / max) * 100) })),
    caption: first ? `기사 수가 많은 순 · 가장 먼저 보도한 곳은 ${first.press}(${firstWhen})` : '기사 수가 많은 순',
    rest: restText,
  }
}
