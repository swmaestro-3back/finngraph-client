import type { GraphLink } from '@/data/graphTypes'

export type EvidenceKind = 'news' | 'disclosure'

/** 근거 한 행 — 같은 품목 텍스트는 한 행으로 합치고 횟수만 센다 */
export interface EvidenceRow {
  kind: EvidenceKind
  text: string
  count: number
  /** 공시 접수번호들 (뉴스는 비어 있다) */
  ids: string[]
}

/**
 * 뉴스·공시 근거를 한 목록으로 합친다.
 * 같은 품목이 여러 기사에 나오면 행 하나에 ×N으로 접는다 — "부품" 카드가 두 장 나란히 서는 것을 막는다.
 * 많이 언급된 품목이 위로 오도록 횟수 내림차순이고, 횟수가 같으면 뉴스 먼저·공시 나중의 원래 순서를 지킨다.
 */
export function buildEvidenceRows(link: Pick<GraphLink, 'news' | 'disclosures'>): EvidenceRow[] {
  const rows = new Map<string, EvidenceRow>()
  const add = (kind: EvidenceKind, text: string, id?: string) => {
    const key = `${kind}:${text}`
    const row = rows.get(key)
    if (row) {
      row.count += 1
      if (id) row.ids.push(id)
      return
    }
    rows.set(key, { kind, text, count: 1, ids: id ? [id] : [] })
  }
  link.news?.forEach((n) => add('news', n.item ?? '품목 정보 없음'))
  link.disclosures?.forEach((d) => add('disclosure', d.item ?? '공시 항목 정보 없음', d.rcept_no))
  // Array.prototype.sort는 안정 정렬이라 동률의 삽입 순서가 유지된다
  return [...rows.values()].sort((a, b) => b.count - a.count)
}
