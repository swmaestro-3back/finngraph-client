import type { IssueArticleRes, IssueCompanyRes, IssueDetailRes, IssueTimelineRes } from '@/lib/apiTypes'
import { pressName } from '@/lib/format'
import { issueHead, type IssueHead } from '@/lib/fg/issuePage'
import type { IssueArticleItem, IssueBook, IssueLink, IssueRecord, IssueStock } from '@/lib/fg/issueRecords'
import { storyChain, storySince } from '@/lib/fg/issueTimeline'
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
      tickers: article.tickers,
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
    const role = company.role?.trim()
    return {
      name: company.name,
      ticker: company.ticker,
      change: quote?.change ?? null,
      mentions: company.mentionCount,
      market: quote?.market ?? null,
      price: quote?.price ?? null,
      ...(role ? { role } : {}),
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

export const MARKET_REACTION_BADGE = '주가 반응'
export const MARKET_REACTION_NOTE = '주가 움직임을 다룬 이슈라 앞선 이슈와 잇지 않아요'

export function isMarketReaction(subject: IssueSubject): boolean {
  return subject.kind === 'live' && subject.detail.kind === 'market_reaction'
}

export interface SubjectExtras {
  story: IssueTimelineRes | null
  links: readonly IssueLink[] | null
}

export function subjectHead(subject: IssueSubject, { story, links }: SubjectExtras): IssueHead {
  if (subject.kind === 'mock') return issueHead(subject.record, subject.book)
  const { detail } = subject
  const chain = story ? storyChain(subject, story) : null
  const reaction = isMarketReaction(subject)
  return {
    badge: reaction ? MARKET_REACTION_BADGE : null,
    tone: 'neutral',
    media: `${subject.media}개 매체`,
    when: periodLabel(detail.firstPublishedAt, detail.lastPublishedAt, subject.today) ?? '',
    since: chain && !reaction ? storySince(chain) : null,
    counts: {
      timeline: chain ? chain.length : null,
      articles: subject.articleCount,
      stocks: connectedCount(subject, links),
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

export function connectedCount(subject: IssueSubject, links: readonly IssueLink[] | null): number | null {
  if (subject.kind === 'mock') return subject.stocks.length + subject.record.links.length
  return links === null ? null : subject.stocks.length + links.length
}

export function connectedLabel(count: number | null): string {
  return count === null ? '연결된 종목 모두 보기' : `연결된 종목 ${count} 모두 보기`
}

export function articlesByTicker(articles: readonly IssueArticleItem[]): Map<string, IssueArticleItem[]> {
  const result = new Map<string, IssueArticleItem[]>()
  for (const article of articles) {
    const tickers = new Set((article.tickers ?? []).filter(Boolean))
    for (const ticker of tickers) {
      const list = result.get(ticker)
      if (list) list.push(article)
      else result.set(ticker, [article])
    }
  }
  return result
}
