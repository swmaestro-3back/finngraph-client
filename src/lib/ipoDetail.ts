import type { IpoDetailRes, IpoOfferingRes, IpoPriceBasis, IpoPutbackRes, IpoRes } from '@/lib/apiTypes'
import { ipoCountdown, parseDateParam } from '@/lib/calendar'
import { describeSource } from '@/lib/companyOverview'
import { formatPercent, formatWon } from '@/lib/format'

export const IPO_NOTICE =
  '공모 정보는 DART 증권신고서와 예탁원(KSD) 공모 일정 기준이며 정정 공시로 바뀔 수 있습니다. 참고용이며 투자 결과에 대한 책임은 지지 않습니다.'

export const PLANNED_PRICE_HINT = '희망 공모가 범위가 아니라 증권신고서에 적힌 예정가입니다'

export interface IpoDetailTarget {
  corpCode: string | null
  ticker: string | null
}

export function ipoTarget(item: Pick<IpoRes, 'corpCode' | 'ticker'>): IpoDetailTarget | null {
  if (item.corpCode) return { corpCode: item.corpCode, ticker: null }
  if (item.ticker) return { corpCode: null, ticker: item.ticker }
  return null
}

export function ipoTargetKey(target: IpoDetailTarget): string {
  return `${target.corpCode ?? ''}|${target.ticker ?? ''}`
}

export function ipoKey(item: Pick<IpoRes, 'corpCode' | 'ticker' | 'subscrStart'>): string {
  return `${item.corpCode ?? ''}|${item.ticker ?? ''}|${item.subscrStart}`
}

export function ipoDetailParams(target: IpoDetailTarget): Record<string, string> {
  if (target.corpCode) return { corpCode: target.corpCode }
  return target.ticker ? { ticker: target.ticker } : {}
}

export function findIpo(offerings: readonly IpoRes[], target: IpoDetailTarget): IpoRes | null {
  if (target.corpCode !== null) return offerings.find((item) => item.corpCode === target.corpCode) ?? null
  if (target.ticker !== null) return offerings.find((item) => item.ticker === target.ticker) ?? null
  return null
}

export function filedOnFromRceptNo(rceptNo: string): string | null {
  const match = rceptNo.match(/^(\d{4})(\d{2})(\d{2})\d*$/)
  if (!match) return null
  return parseDateParam(`${match[1]}-${match[2]}-${match[3]}`)
}

export type IpoStepKey = 'FILED' | 'SUBSCRIBE' | 'PAY' | 'REFUND' | 'LIST'

export const IPO_STEP_LABELS: Record<IpoStepKey, string> = {
  FILED: '신고서 제출',
  SUBSCRIBE: '청약',
  PAY: '납입',
  REFUND: '환불',
  LIST: '상장',
}

export interface IpoTimelineItem {
  key: IpoStepKey
  label: string
  date: string | null
  endDate: string | null
}

function ipoStep(key: IpoStepKey, date: string | null, endDate: string | null = null): IpoTimelineItem {
  return { key, label: IPO_STEP_LABELS[key], date, endDate }
}

export function ipoTimeline(detail: Pick<IpoDetailRes, 'schedule' | 'filing'>): IpoTimelineItem[] {
  const { schedule, filing } = detail
  const items: IpoTimelineItem[] = []
  const filedOn = filing ? filedOnFromRceptNo(filing.firstRceptNo) : null
  if (filedOn) items.push(ipoStep('FILED', filedOn))
  items.push(ipoStep('SUBSCRIBE', schedule.subscrStart, schedule.subscrStart ? schedule.subscrEnd : null))
  items.push(ipoStep('PAY', schedule.payDate))
  if (schedule.refundDate) items.push(ipoStep('REFUND', schedule.refundDate))
  items.push(ipoStep('LIST', schedule.listingDate))
  return items
}

export function ipoHeaderCountdown(detail: Pick<IpoDetailRes, 'status' | 'schedule'>, today: string): string | null {
  const { subscrStart, subscrEnd, listingDate } = detail.schedule
  if (!subscrStart || !subscrEnd) return null
  return ipoCountdown({ status: detail.status, subscrStart, subscrEnd, listingDate }, today)
}

const PUTBACK_UNITS: Partial<Record<keyof IpoPutbackRes, string>> = {
  price: '원',
  shares: '주',
}

export function putbackText(key: keyof IpoPutbackRes, raw: string): { text: string; numeric: boolean } {
  const unit = PUTBACK_UNITS[key]
  if (!unit || !/^\d[\d,]*(\.\d+)?$/.test(raw.trim())) return { text: raw, numeric: false }
  return { text: `${raw.trim()}${unit}`, numeric: true }
}

export function ipoPriceText(price: number | null): string {
  return price === null ? '미정' : formatWon(price)
}

export type IpoPriceBadge = '예정' | '확정'

export function ipoPriceBadge(price: number | null, basis: IpoPriceBasis): IpoPriceBadge | null {
  if (price === null) return null
  return basis === 'PLANNED' ? '예정' : '확정'
}

export function formatOfferingAmount(won: number): string {
  const eok = Math.round(won / 1e8)
  if (Math.abs(eok) >= 1e4) return `${(won / 1e12).toFixed(1)}조원`
  const man = Math.round(won / 1e4)
  if (Math.abs(won) >= 1e8 || Math.abs(man) >= 1e4) return `${eok.toLocaleString('ko-KR')}억원`
  if (Math.abs(won) >= 1e4) return `${man.toLocaleString('ko-KR')}만원`
  return formatWon(won)
}

export function formatShareCount(shares: number): string {
  return `${shares.toLocaleString('ko-KR')}주`
}

export function fundUsesNotice(offering: Pick<IpoOfferingRes, 'fundUses' | 'fundUsesWithheld'>): string | null {
  if (offering.fundUsesWithheld) return '증권신고서의 자금 용도 금액이 공모 총액과 맞지 않아 표시하지 않습니다.'
  return offering.fundUses && offering.fundUses.length > 0 ? null : '증권신고서에 금액이 적힌 자금 용도가 없습니다.'
}

export function oldShareText(offering: Pick<IpoOfferingRes, 'sellers' | 'oldShareRatio'>): string {
  if (offering.oldShareRatio !== null) return formatPercent(offering.oldShareRatio)
  if (offering.sellers === null) return '미정'
  return offering.sellers.length === 0 ? '없음 · 전량 신주' : '—'
}

const UNDERWRITER_ROLE_LABELS: Record<string, string> = {
  대표: '대표 주관',
  공동: '공동 주관',
  인수: '인수',
}

export function underwriterRoleLabel(role: string | null): string {
  if (role === null) return '—'
  return UNDERWRITER_ROLE_LABELS[role] ?? role
}

export function homepageUrl(raw: string | null): string | null {
  const value = raw?.trim() ?? ''
  if (value === '') return null
  if (/^https?:\/\//i.test(value)) return value
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(value)) return null
  return `http://${value}`
}

export interface IpoIntroSource {
  ai: boolean
  label: string | null
  linkLabel: string
}

export function ipoIntroSource(source: string | null): IpoIntroSource {
  if (source === 'DART_LLM') return { ai: true, label: '증권신고서 「사업의 내용」 요약', linkLabel: '증권신고서 원문' }
  return { ai: false, label: describeSource(source), linkLabel: '원문 공시' }
}

export type AfterListingState = 'show' | 'pending' | 'hidden'

export function afterListingState(detail: Pick<IpoDetailRes, 'status' | 'afterListing'>): AfterListingState {
  if (detail.afterListing !== null) return 'show'
  return detail.status === 'LISTED' ? 'pending' : 'hidden'
}

export function listedTicker(detail: Pick<IpoDetailRes, 'ticker' | 'afterListing'>): string | null {
  return detail.afterListing !== null ? detail.ticker : null
}
