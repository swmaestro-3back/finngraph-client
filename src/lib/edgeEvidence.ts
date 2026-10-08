// 간선 상세가 근거(뉴스·공시)를 읽는 방법 — 품목 순위, 날짜별 기사 묶음, 월별 언급 수.
// d3나 DOM에 의존하지 않는 순수 계산.

import type { GraphLink } from '@/data/graphTypes'
import type { KgRelationshipEvidenceRes } from '@/lib/kgApiTypes'

/** 품목 한 줄 — 같은 문구는 하나로 합치고 언급 횟수를 센다 */
export interface RankedItem {
  text: string
  count: number
  /** "장비"·"부품"처럼 무엇인지 알 수 없는 문구 — 순위 아래로 내려 흐리게 그린다 */
  generic: boolean
}

const GENERIC_ITEMS = new Set(['장비', '부품', '제품', '소재', '설비', '솔루션', '서비스', '기술'])

/**
 * 뉴스마다 온 품목 문구를 언급 횟수순으로 줄 세운다. 공백 차이는 같은 문구로 본다("TC본더" = "TC 본더").
 * 구체적인 품목이 먼저, 뭉뚱그린 품목은 횟수가 많아도 그 아래다 — "무엇을"에 답하지 못하기 때문이다.
 * 횟수가 같으면 먼저 온 순서를 지킨다.
 */
export function rankItems(link: Pick<GraphLink, 'news'>): RankedItem[] {
  const rows = new Map<string, RankedItem>()
  link.news?.forEach((n) => {
    const text = n.item?.trim()
    if (!text) return
    const key = text.replace(/\s+/g, '')
    const row = rows.get(key)
    if (row) row.count += 1
    else rows.set(key, { text, count: 1, generic: GENERIC_ITEMS.has(key) })
  })
  // Array.prototype.sort는 안정 정렬이라 동률의 삽입 순서가 유지된다
  return [...rows.values()].sort(
    (a, b) => Number(a.generic) - Number(b.generic) || b.count - a.count,
  )
}

/**
 * 이웃 행의 한 줄 요약 — 많이 언급된 구체적인 품목부터 max개, 넘치면 "외 N".
 * 구체적인 품목이 하나도 없을 때만 뭉뚱그린 품목("장비")이라도 보인다. 품목이 없으면 undefined
 */
export function itemsLine(link: Pick<GraphLink, 'news'>, max = 2): string | undefined {
  const ranked = rankItems(link)
  if (ranked.length === 0) return undefined
  const specific = ranked.filter((i) => !i.generic)
  const pool = specific.length > 0 ? specific : ranked
  const shown = pool.slice(0, max).map((i) => i.text).join(', ')
  const rest = pool.length - max
  return rest > 0 ? `${shown} 외 ${rest}` : shown
}

/** 근거 기사 한 건 — 간선의 뉴스 언급에 기사 제목·발행 시각을 붙인 것 */
export interface EvidenceNews {
  id: string
  /** 기사 제목 — 아직 못 불러왔거나 불러오지 못했으면 null */
  title: string | null
  publishedAt: string | null
  item: string | null
}

export interface EvidenceDay {
  /** YYYY-MM-DD — 발행 시각을 모르는 기사 묶음은 null */
  date: string | null
  news: EvidenceNews[]
}

/**
 * 기사를 최신순으로 세우고 같은 날 기사끼리 묶는다 — 한 사건을 여러 매체가 받아쓴 날이 목록을 채우지 않도록.
 * 발행 시각을 모르는 기사는 맨 뒤 한 묶음이다.
 */
export function groupNewsByDay(news: EvidenceNews[]): EvidenceDay[] {
  const time = (n: EvidenceNews) => (n.publishedAt ? Date.parse(n.publishedAt) : NaN)
  const dated = news.filter((n) => !Number.isNaN(time(n))).sort((a, b) => time(b) - time(a))
  const undated = news.filter((n) => Number.isNaN(time(n)))

  const days: EvidenceDay[] = []
  dated.forEach((n) => {
    const date = n.publishedAt!.slice(0, 10)
    const last = days.at(-1)
    if (last?.date === date) last.news.push(n)
    else days.push({ date, news: [n] })
  })
  if (undated.length > 0) days.push({ date: null, news: undated })
  return days
}

export interface MonthCount {
  /** YYYY-MM */
  key: string
  month: number
  count: number
}

/** 서버 월별 건수를 첫 달부터 마지막 달까지 빈 달도 0으로 채워 돌려준다 — 막대가 끊긴 구간을 그대로 보여준다 */
export function monthlyCounts(rows: { month: string; count: number }[]): MonthCount[] {
  const counts = new Map(rows.map((r) => [r.month, r.count]))
  const keys = [...counts.keys()].sort()
  if (keys.length === 0) return []

  const months: MonthCount[] = []
  let [y, m] = keys[0].split('-').map(Number)
  const lastKey = keys.at(-1)!
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    months.push({ key, month: m, count: counts.get(key) ?? 0 })
    if (key === lastKey) break
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months
}

/** 간선 근거 경로 — elementId에는 콜론이 들어 있다 */
export function evidencePath(linkId: string): string {
  return `/v1/relationships/${encodeURIComponent(linkId)}/evidence`
}

/** evidence 응답의 기사 → 목록 행. 한 기사에서 품목이 여러 개 나오면 쉼표로 잇는다 */
export function evidenceNews(res: KgRelationshipEvidenceRes): EvidenceNews[] {
  return res.news.map((n) => ({
    id: n.news_id,
    title: n.title ?? '(제목 없음)',
    publishedAt: n.published_at,
    item: n.items.length > 0 ? n.items.join(', ') : null,
  }))
}
