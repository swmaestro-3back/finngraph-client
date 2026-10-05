import type { IssueArticleRes, IssueCompanyRes, IssueDetailRes } from '@/lib/apiTypes'
import { pressName } from '@/lib/format'
import { issueHead, type IssueHead } from '@/lib/fg/issuePage'
import type { IssueArticleItem, IssueBook, IssueRecord, IssueStock } from '@/lib/fg/issueRecords'
import { week52Mark, type Week52Row } from '@/lib/fg/stockQuote'
import { kstDayTime } from '@/lib/fg/themeNews'
import { gapFromHigh, week52Position } from '@/lib/fg/week52'

export const KEYWORD_LIMIT = 6

export interface IssueQuote extends Week52Row {
  market: string | null
  price: number | null
  change: number | null
}

function quoteRange(
  quote: IssueQuote | null,
  basisDate: string | null,
): Pick<IssueStock, 'gapFromHigh' | 'position' | 'newHigh'> {
  const price = quote?.price ?? null
  const high = quote?.high52w ?? null
  const low = quote?.low52w ?? null
  if (price === null || high === null || low === null) return {}
  const range = { gapFromHigh: gapFromHigh(price, high), position: week52Position({ price, high, low }) }
  return week52Mark(quote, basisDate) === 'high' ? { ...range, newHigh: true } : range
}

interface IssueBase {
  id: string
  title: string
  media: number
  articleCount: number
  stocks: readonly IssueStock[]
  articles: readonly IssueArticleItem[]
  keywords: readonly string[]
  today: string
}

export interface MockIssue extends IssueBase {
  kind: 'mock'
  record: IssueRecord
  book: IssueBook
}

export interface LiveIssue extends IssueBase {
  kind: 'live'
  detail: IssueDetailRes
  representative: IssueArticleItem | null
}

export type IssueSubject = MockIssue | LiveIssue

export function dayWord(day: string, today: string): string {
  if (day === today) return '오늘'
  const text = `${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일`
  return day.slice(0, 4) === today.slice(0, 4) ? text : `${day.slice(0, 4)}년 ${text}`
}

export function periodLabel(first: string | null, last: string | null, today: string): string | null {
  const from = kstDayTime(first ?? last ?? '')
  const to = kstDayTime(last ?? first ?? '')
  if (!from || !to) return null
  if (from.day !== to.day) return `${dayWord(from.day, today)}~${dayWord(to.day, today)}`
  const day = dayWord(from.day, today)
  return from.time === to.time ? `${day} ${from.time}` : `${day} ${from.time}~${to.time}`
}

export function issueArticleItems(articles: readonly IssueArticleRes[]): IssueArticleItem[] {
  return articles.map((article) => {
    const at = article.publishedAt ? kstDayTime(article.publishedAt) : null
    return {
      id: String(article.id),
      title: article.title?.trim() || '제목 없는 기사',
      url: article.url,
      press: pressName(article.url ?? article.press),
      pressKey: article.press || null,
      day: at?.day ?? null,
      time: at?.time ?? null,
      summary: article.summary?.trim() || null,
      analyzed: article.tripleExtracted,
    }
  })
}

export function liveStocks(
  companies: readonly IssueCompanyRes[],
  quotes: ReadonlyMap<string, IssueQuote> | null,
  basisDate: string | null = null,
): IssueStock[] {
  return companies.map((company) => {
    const quote = quotes?.get(company.ticker) ?? null
    return {
      name: company.name,
      ticker: company.ticker,
      change: quote?.change ?? null,
      mentions: company.mentionCount,
      market: quote?.market ?? null,
      price: quote?.price ?? null,
      ...quoteRange(quote, basisDate),
    }
  })
}

export function mockSubject(record: IssueRecord, book: IssueBook): MockIssue {
  return {
    kind: 'mock',
    record,
    book,
    id: record.id,
    title: record.title,
    media: record.media,
    articleCount: record.articles,
    stocks: record.stocks,
    articles: record.articleList,
    keywords: [],
    today: book.today,
  }
}

export function liveSubject(
  detail: IssueDetailRes,
  quotes: ReadonlyMap<string, IssueQuote> | null,
  today: string,
  basisDate: string | null = null,
): LiveIssue {
  const articles = issueArticleItems(detail.articles)
  const representative = articles.find((a) => a.id === String(detail.representativeNewsId)) ?? null
  const fallback = (representative ?? articles[0])?.title ?? '제목 없는 이슈'
  return {
    kind: 'live',
    detail,
    representative,
    id: String(detail.id),
    title: detail.title?.trim() || fallback,
    media: detail.mediaCount,
    articleCount: detail.articleCount,
    stocks: liveStocks(detail.companies, quotes, basisDate),
    articles,
    keywords: [...new Set(detail.keywords.map((k) => k.trim()).filter(Boolean))].slice(0, KEYWORD_LIMIT),
    today,
  }
}

export function subjectHead(subject: IssueSubject): IssueHead {
  if (subject.kind === 'mock') return issueHead(subject.record, subject.book)
  const { detail } = subject
  return {
    badge: null,
    tone: 'neutral',
    media: `${subject.media}개 매체`,
    when: periodLabel(detail.firstPublishedAt, detail.lastPublishedAt, subject.today) ?? '',
    since: null,
    counts: {
      timeline: subject.articles.length,
      articles: subject.articleCount,
      stocks: subject.stocks.length,
    },
    keywords: subject.keywords,
  }
}

export function representativeCaption(subject: LiveIssue): string {
  const rep = subject.representative
  if (!rep) return `묶인 기사 ${subject.articleCount}건 · ${subject.media}개 매체`
  const when = rep.day && rep.time ? ` · ${dayWord(rep.day, subject.today)} ${rep.time}` : ''
  return `${rep.press}${when} 보도`
}

export function connectedCount(subject: IssueSubject): number {
  return subject.kind === 'mock' ? subject.stocks.length + subject.record.links.length : subject.stocks.length
}

export function articlesByTicker(
  articles: readonly IssueArticleItem[],
  companies: ReadonlyMap<string, readonly { ticker: string | null }[]>,
): Map<string, IssueArticleItem[]> {
  const result = new Map<string, IssueArticleItem[]>()
  for (const article of articles) {
    const tickers = new Set((companies.get(article.id) ?? []).flatMap((c) => (c.ticker ? [c.ticker] : [])))
    for (const ticker of tickers) {
      const list = result.get(ticker)
      if (list) list.push(article)
      else result.set(ticker, [article])
    }
  }
  return result
}
