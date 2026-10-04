import type { CandleRes, InvestorFlowRes, NewsDetail, StockContractRes } from '@/lib/apiTypes'

export const MOVE_WINDOW = 60
export const MOVE_LIMIT = 20
export const MOVE_CHANGE_THRESHOLD = 5
export const MOVE_VOLUME_MULTIPLE = 3
export const VOLUME_BASE_DAYS = 20
export const LIMIT_THRESHOLD = 29.5

export const NO_ISSUE_TITLE = '확인된 이슈 없음'
export const NO_ISSUE_DETAIL = '수집된 뉴스·공시가 없습니다'
export const NO_MOVES_TEXT = '최근 60거래일 동안 큰 움직임이 없었습니다'
export const MOVE_CRITERIA_TEXT = '최근 60거래일 · 등락률 ±5% 이상, 거래량 평소의 3배 이상, 거래 정지'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export interface MoveFlows {
  foreign: number | null
  institution: number | null
  individual: number | null
}

export type MoveLimit = 'UP' | 'DOWN'

export interface NotableMove {
  date: string
  change: number | null
  volumeRatio: number | null
  halted: boolean
  limit: MoveLimit | null
  limitStreak: number
  flows: MoveFlows | null
  news: NewsDetail[]
  contracts: StockContractRes[]
}

function kstDayEnd(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d, 23, 59, 59, 999) - KST_OFFSET_MS
}

function limitOf(change: number | null): MoveLimit | null {
  if (change === null) return null
  if (change >= LIMIT_THRESHOLD) return 'UP'
  if (change <= -LIMIT_THRESHOLD) return 'DOWN'
  return null
}

function slotIndex(ends: number[], t: number): number {
  for (let i = 0; i < ends.length; i += 1) {
    const start = i === 0 ? ends[0] - DAY_MS : ends[i - 1]
    if (t > start && (t <= ends[i] || i === ends.length - 1)) return i
  }
  return -1
}

function dateSlotIndex(dates: string[], date: string): number {
  for (let i = 0; i < dates.length; i += 1) {
    const after = i === 0 ? '' : dates[i - 1]
    if (date > after && (date <= dates[i] || i === dates.length - 1)) return i
  }
  return -1
}

export function assignNewsToDays(dates: string[], news: NewsDetail[]): NewsDetail[][] {
  const ends = dates.map(kstDayEnd)
  const slots: NewsDetail[][] = dates.map(() => [])
  for (const item of news) {
    const t = new Date(item.collectedAt).getTime()
    if (Number.isNaN(t)) continue
    const i = slotIndex(ends, t)
    if (i !== -1) slots[i].push(item)
  }
  return slots
}

export function notableMoves(
  candles: CandleRes[],
  flows: InvestorFlowRes[],
  news: NewsDetail[],
  contracts: StockContractRes[],
): NotableMove[] {
  if (candles.length === 0) return []
  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date))
  const dates = sorted.map((c) => c.date)
  const newsBySlot = assignNewsToDays(dates, news)

  const contractsBySlot: StockContractRes[][] = dates.map(() => [])
  for (const row of contracts) {
    if (row.role !== 'FILER') continue
    const i = dateSlotIndex(dates, row.rceptDate)
    if (i !== -1) contractsBySlot[i].push(row)
  }

  const flowsByDate = new Map(flows.map((f) => [f.date, f]))

  const changes = sorted.map((c, i) => {
    if (i === 0) return null
    const prev = sorted[i - 1].close
    return prev > 0 ? ((c.close - prev) / prev) * 100 : null
  })

  const moves: NotableMove[] = []
  const from = Math.max(0, sorted.length - MOVE_WINDOW)
  for (let i = from; i < sorted.length; i += 1) {
    const candle = sorted[i]
    const change = changes[i]
    const halted = candle.volume === 0
    const base = sorted.slice(Math.max(0, i - VOLUME_BASE_DAYS), i)
    const average = base.length > 0 ? base.reduce((sum, c) => sum + c.volume, 0) / base.length : 0
    const volumeRatio = halted || average <= 0 ? null : candle.volume / average
    const big = change !== null && Math.abs(change) >= MOVE_CHANGE_THRESHOLD
    const heavy = volumeRatio !== null && volumeRatio >= MOVE_VOLUME_MULTIPLE
    if (!halted && !big && !heavy) continue

    const limit = halted ? null : limitOf(change)
    let limitStreak = limit === null ? 0 : 1
    for (let j = i - 1; limit !== null && j >= 0; j -= 1) {
      if (sorted[j].volume === 0 || limitOf(changes[j]) !== limit) break
      limitStreak += 1
    }

    const flow = flowsByDate.get(candle.date)
    moves.push({
      date: candle.date,
      change,
      volumeRatio,
      halted,
      limit,
      limitStreak,
      flows: flow
        ? { foreign: flow.foreignNet, institution: flow.institutionNet, individual: flow.individualNet }
        : null,
      news: newsBySlot[i],
      contracts: contractsBySlot[i],
    })
  }

  return moves.reverse().slice(0, MOVE_LIMIT)
}

export function volumeRatioText(ratio: number): string {
  return `거래량 평소의 ${ratio.toFixed(1)}배`
}

export function limitText(move: Pick<NotableMove, 'limit' | 'limitStreak'>): string | null {
  if (move.limit === null) return null
  const label = move.limit === 'UP' ? '상한가' : '하한가'
  return move.limitStreak > 1 ? `${label} ${move.limitStreak}일 연속` : label
}

function signedShares(value: number): string {
  const body = Math.abs(value).toLocaleString('ko-KR')
  if (value > 0) return `+${body}주`
  if (value < 0) return `−${body}주`
  return '0주'
}

export function flowText(flows: MoveFlows | null): string | null {
  if (!flows) return null
  const parts = [
    ['외국인', flows.foreign],
    ['기관', flows.institution],
    ['개인', flows.individual],
  ]
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .map(([who, value]) => `${who} ${signedShares(value)}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function evidenceCountText(move: Pick<NotableMove, 'news' | 'contracts'>): string {
  return `뉴스 ${move.news.length} · 공시 ${move.contracts.length}`
}
