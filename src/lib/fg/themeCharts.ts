const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
const STEP_FACTORS = [1, 2, 2.5, 5, 10] as const

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function round(value: number): number {
  return Number(value.toFixed(10))
}

export function minusMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const total = y * 12 + (m - 1) - months
  const year = Math.floor(total / 12)
  const month = total - year * 12 + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${pad(month)}-${pad(Math.min(d, lastDay))}`
}

export function periodStartIndex(dates: readonly string[], months: number): number {
  if (dates.length === 0) return 0
  const target = minusMonths(dates[dates.length - 1], months)
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= target) return i
  }
  return 0
}

export interface Axis {
  lo: number
  hi: number
  ticks: number[]
}

export function niceAxis(min: number, max: number, maxSteps: number): Axis {
  let low = min
  let high = max
  if (!(high > low)) {
    const spread = Math.abs(high) * 0.05 || 1
    low -= spread
    high += spread
  }
  const span = high - low
  const base = 10 ** Math.floor(Math.log10(span / maxSteps))
  const step = STEP_FACTORS.map((factor) => factor * base).find((s) => span / s <= maxSteps) ?? base * 10
  const lo = round(Math.floor(low / step) * step)
  const hi = round(Math.ceil(high / step) * step)
  const ticks: number[] = []
  for (let i = 0; round(lo + i * step) <= hi; i++) ticks.push(round(lo + i * step))
  return { lo, hi, ticks }
}

export function formatAxisPercent(value: number): string {
  const rounded = round(Math.round(value * 100) / 100)
  if (rounded === 0) return '0%'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)}%`
}

export interface DateTick {
  index: number
  label: string
}

export type DateTickMode = 'days' | 'months' | 'even-months'

export function dateTicks(dates: readonly string[], mode: DateTickMode): DateTick[] {
  if (mode === 'days') {
    return dates.flatMap((date, index) =>
      index > 0 && index % 5 === 0 ? [{ index, label: `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}` }] : [],
    )
  }
  return dates.flatMap((date, index) => {
    if (index === 0 || date.slice(0, 7) === dates[index - 1].slice(0, 7)) return []
    const month = Number(date.slice(5, 7))
    if (mode === 'even-months' && month % 2 !== 0) return []
    return [{ index, label: month === 1 ? `${date.slice(0, 4)}년 1월` : `${month}월` }]
  })
}

export function monthDayLabel(isoDate: string, refYear: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return `${y === refYear ? '' : `${y}년 `}${m}월 ${d}일`
}

export function dayLabel(isoDate: string, refYear: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return `${monthDayLabel(isoDate, refYear)}(${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`
}
