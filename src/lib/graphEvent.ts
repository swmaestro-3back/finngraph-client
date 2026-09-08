// 이벤트(뉴스 클러스터) 노드의 data를 읽고 사람이 읽는 문자열로 바꾼다 — 캔버스 툴팁과 상세 패널이 함께 쓴다.

import type { GraphNode } from '@/data/graphTypes'

export interface EventInfo {
  keywords: string[]
  /** 이벤트에 언급된 기업명 */
  companies: string[]
  /** 뉴스 건수 */
  memberCount: number | null
  firstPublishedAt: string | null
  lastPublishedAt: string | null
  representativeNewsId: number | null
}

/** GraphNode.data의 선택 필드를 확정된 형태로 — 소비자가 undefined 분기를 반복하지 않도록 */
export function eventInfo(node: GraphNode): EventInfo {
  const d = node.data
  return {
    keywords: d.keywords ?? [],
    companies: d.companies ?? [],
    memberCount: d.memberCount ?? null,
    firstPublishedAt: d.firstPublishedAt ?? null,
    lastPublishedAt: d.lastPublishedAt ?? null,
    representativeNewsId: d.representativeNewsId ?? null,
  }
}

function toDate(iso: string): string {
  return iso.slice(0, 10)
}

/** 첫 보도 ~ 마지막 보도. 같은 날이면 하루만, 하나만 있으면 그것만 */
export function eventPeriod(first: string | null, last: string | null): string {
  const a = first ? toDate(first) : null
  const b = last ? toDate(last) : null
  if (a && b) return a === b ? a : `${a} ~ ${b}`
  return a ?? b ?? ''
}

/** 캔버스 툴팁 둘째 줄 */
export function eventSubtitle(node: GraphNode): string {
  const info = eventInfo(node)
  const parts: string[] = []
  if (info.memberCount != null) parts.push(`뉴스 ${info.memberCount}건`)
  const period = eventPeriod(info.firstPublishedAt, info.lastPublishedAt)
  if (period) parts.push(period)
  return parts.length ? parts.join(' · ') : '이벤트'
}
