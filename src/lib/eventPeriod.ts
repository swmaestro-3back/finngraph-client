// 이벤트(뉴스 클러스터) 노드의 기간 필터 — 마지막 보도가 오늘로부터 얼마 안에 있는 이벤트만 남긴다.
// 서버에 다시 묻지 않고 받아 온 그래프에서 숨긴다 (범례 필터와 같은 층).

import type { GraphNode } from '@/data/graphTypes'

export type EventPeriod = 'all' | '1w' | '1m' | '3m' | '6m'

export const EVENT_PERIOD_VALUES: EventPeriod[] = ['all', '1w', '1m', '3m', '6m']

export const EVENT_PERIOD_LABELS: Record<EventPeriod, string> = {
  all: '전체',
  '1w': '1주',
  '1m': '1달',
  '3m': '3개월',
  '6m': '6개월',
}

export function isEventPeriod(v: string | null | undefined): v is EventPeriod {
  return (EVENT_PERIOD_VALUES as string[]).includes(v ?? '')
}

/** 'YYYY-MM-DD'를 UTC 자정 Date로 — 달력 셈만 하므로 시간대는 무관하다 */
function fromDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** 달 단위로 되감되, 그 달에 없는 날(예: 3/31 → 2/31)은 그 달의 말일로 당긴다 */
function monthsBefore(date: Date, months: number): Date {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay))
  return target
}

/**
 * 기간의 시작일('YYYY-MM-DD', 포함). 전체면 null.
 * today는 KST 기준 오늘(kstToday) — 1주는 7일 전, 달 단위는 같은 날짜의 n달 전이다.
 */
export function eventPeriodCutoff(period: EventPeriod, today: string): string | null {
  if (period === 'all') return null
  const base = fromDay(today)
  if (period === '1w') {
    base.setUTCDate(base.getUTCDate() - 7)
    return toDay(base)
  }
  const months = { '1m': 1, '3m': 3, '6m': 6 }[period]
  return toDay(monthsBefore(base, months))
}

/**
 * 기간 안의 노드인가. 이벤트가 아닌 노드는 기간과 무관하게 남는다.
 * 이벤트는 마지막 보도일이 시작일 이후면 남는다 — 그 전에 시작한 이벤트라도 최근에 움직임이 있었으면 보여 준다.
 * 보도일이 없는 이벤트는 숨긴다 — 언제 것인지 알 수 없어 기간 필터에 걸 수 없다.
 * 타임스탬프는 소수점 9자리까지 오므로 Date로 읽지 않고 앞 10자리(날짜)만 비교한다. KST(+09:00)로 온다.
 */
export function eventInPeriod(node: GraphNode, cutoff: string | null): boolean {
  if (cutoff === null || node.type !== 'event') return true
  const last = node.data.lastPublishedAt
  if (!last) return false
  return last.slice(0, 10) >= cutoff
}
