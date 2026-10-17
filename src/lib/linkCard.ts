import { PREDICATE_LABELS, endId, type GraphLink } from '@/data/graphTypes'

/**
 * 간선 호버 카드 — 세 줄 상한.
 * 1) 무엇이 일어났나: 출발 기업 [관계 →] 도착 기업  2) 무엇을: 품목  3) 얼마나 믿을 만한가: 출처·근거·기간.
 * 데이터가 없는 줄은 비워 두지 않고 뺀다 — 인수·투자는 품목이 없어 두 줄이 된다.
 */
export interface LinkCard {
  from: string
  /** 관계 태그 글자 — 화살표까지 태그 안에 있어 종류와 방향을 한 번에 읽는다 */
  relation: string
  to: string
  /** 품목 줄 — 없으면 undefined */
  items?: string
  evidence: string
}

const MAX_ITEMS = 3

/**
 * 뉴스마다 온 품목 문구를 합쳐 최대 3개 — 넘치면 "외 N".
 * 공백 차이는 무시하고, 한쪽이 다른 쪽을 품는 문구("테스트 핸들러" ⊂ "반도체 테스트 핸들러")는 먼저 온 것만 남긴다.
 */
export function summarizeItems(items: (string | null | undefined)[]): string | undefined {
  const kept: { key: string; text: string }[] = []
  items.forEach((raw) => {
    const text = raw?.trim()
    if (!text) return
    const key = text.replace(/\s+/g, '')
    if (kept.some((k) => k.key.includes(key) || key.includes(k.key))) return
    kept.push({ key, text })
  })
  const unique = kept.map((k) => k.text)
  if (unique.length === 0) return undefined
  const shown = unique.slice(0, MAX_ITEMS).join(', ')
  const rest = unique.length - MAX_ITEMS
  return rest > 0 ? `${shown} 외 ${rest}` : shown
}

/** "2026.09", 같은 해에 걸치면 "2026.04 – 08", 해가 다르면 "2025.11 – 2026.02" */
export function formatPeriod(first?: string | null, last?: string | null): string | undefined {
  const a = parseYearMonth(first)
  const b = parseYearMonth(last) ?? a
  if (!a || !b) return undefined
  if (a.y === b.y && a.m === b.m) return `${a.y}.${pad(a.m)}`
  if (a.y === b.y) return `${a.y}.${pad(a.m)} – ${pad(b.m)}`
  return `${a.y}.${pad(a.m)} – ${b.y}.${pad(b.m)}`
}

function parseYearMonth(iso?: string | null): { y: number; m: number } | undefined {
  const match = iso?.match(/^(\d{4})-(\d{2})/)
  if (!match) return undefined
  return { y: Number(match[1]), m: Number(match[2]) }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 근거 건수 — 0건은 말하지 않는다 */
function evidenceCounts(link: GraphLink): string[] {
  const parts: string[] = []
  const news = link.news_mention_count ?? link.news?.length ?? 0
  const disclosures = link.disclosure_count ?? link.disclosures?.length ?? 0
  if (news > 0) parts.push(`뉴스 ${news}건`)
  if (disclosures > 0) parts.push(`공시 ${disclosures}건`)
  return parts
}

/**
 * 간선 하나의 카드 내용.
 * @param tag 출처 꼬리표("이 기사에서 추출") — 있으면 근거 줄 맨 앞에 온다. 주변 관계는 null
 */
export function buildLinkCard(
  link: GraphLink,
  labelOf: (id: string) => string,
  tag: string | null = null,
): LinkCard {
  const from = labelOf(endId(link.source))
  const to = labelOf(endId(link.target))
  const relation = PREDICATE_LABELS[link.type] ?? link.type

  // 예전 스키마의 단일 item과 뉴스별 item을 같은 줄에 합친다
  const items = summarizeItems([link.item?.text, ...(link.news ?? []).map((n) => n.item)])

  const parts: string[] = []
  if (tag) parts.push(tag)
  parts.push(...evidenceCounts(link))
  const period = formatPeriod(link.first_mentioned_at, link.last_mentioned_at)
  if (period) parts.push(period)
  if (link.reason) parts.push(link.reason)

  return { from, relation, to, items, evidence: parts.join(' · ') }
}
