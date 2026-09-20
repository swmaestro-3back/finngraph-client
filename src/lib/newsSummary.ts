/** 뉴스 요약 렌더링용 순수 유틸 — 문장 분리와 종목명 조각 나누기 */

export type SummarySegment =
  | { kind: 'text'; text: string }
  | { kind: 'company'; text: string }

/**
 * 종결 부호(. ? !) 뒤에 공백·줄바꿈이 올 때만 문장을 나눈다.
 * "27.7%", "9.28일"처럼 숫자 안의 마침표는 뒤에 공백이 없어 경계로 보지 않는다.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 문장을 일반 텍스트와 종목명 조각으로 나눈다. 모든 등장을 종목 조각으로 잡고,
 * 긴 이름을 먼저 매칭해 "삼성전자우" 안의 "삼성전자"가 잘려 나가지 않게 한다.
 */
export function segmentByCompanies(sentence: string, names: string[]): SummarySegment[] {
  const candidates = [...new Set(names.filter((n) => n.length > 0))].sort(
    (a, b) => b.length - a.length,
  )
  if (candidates.length === 0) return [{ kind: 'text', text: sentence }]

  const pattern = new RegExp(candidates.map(escapeRegExp).join('|'), 'g')
  const segments: SummarySegment[] = []
  let cursor = 0
  for (const match of sentence.matchAll(pattern)) {
    const start = match.index
    if (start > cursor) segments.push({ kind: 'text', text: sentence.slice(cursor, start) })
    segments.push({ kind: 'company', text: match[0] })
    cursor = start + match[0].length
  }
  if (cursor < sentence.length) segments.push({ kind: 'text', text: sentence.slice(cursor) })
  return segments
}
