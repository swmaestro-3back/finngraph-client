import type { CompanyProfileRes } from '@/lib/apiTypes'

const SOURCE_LABELS: Record<string, string> = {
  DART_LLM: 'DART 사업보고서 「사업의 개요」 요약',
  NAVER: '네이버 금융 기업개요',
}

export function describeSource(source: string | null): string | null {
  if (source === null) return null
  return SOURCE_LABELS[source] ?? null
}

export function dartFilingUrl(rceptNo: string): string {
  return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(rceptNo)}`
}

export function splitSentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[다요]\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
}

export interface ProfileRow {
  label: string
  value: string
  href?: string
  numeric?: boolean
}

function text(value: string | null): string | null {
  const trimmed = value?.replace(/\s+/g, ' ').trim()
  return trimmed ? trimmed : null
}

function dotDate(iso: string | null): string | null {
  return iso ? iso.slice(0, 10).replaceAll('-', '.') : null
}

function monthLabel(raw: string | null): string | null {
  const month = Number(raw)
  return Number.isInteger(month) && month >= 1 && month <= 12 ? `${month}월` : null
}

function positiveCount(value: number | null, unit: string): string | null {
  return value !== null && value > 0 ? `${value.toLocaleString('ko-KR')}${unit}` : null
}

function homepageRow(raw: string | null): ProfileRow | null {
  const site = text(raw)
  if (!site) return null
  const hasScheme = /^https?:\/\//i.test(site)
  return {
    label: '홈페이지',
    value: site.replace(/^https?:\/\//i, '').replace(/\/+$/, ''),
    href: hasScheme ? site : `https://${site}`,
  }
}

export function profileRows(profile: CompanyProfileRes | null | undefined): ProfileRow[] {
  if (!profile) return []
  const rows: (ProfileRow | null)[] = [
    row('대표자', text(profile.ceoName)),
    row('설립일', dotDate(profile.establishedOn), true),
    row('상장일', dotDate(profile.listedOn), true),
    row('결산월', monthLabel(profile.fiscalMonth), true),
    row('상장주식수', positiveCount(profile.listedShares, '주'), true),
    row('액면가', positiveCount(profile.parValue, '원'), true),
    homepageRow(profile.homepage),
    row('본사 주소', text(profile.address)),
  ]
  return rows.filter((item): item is ProfileRow => item !== null)
}

function row(label: string, value: string | null, numeric = false): ProfileRow | null {
  if (value === null) return null
  return numeric ? { label, value, numeric } : { label, value }
}
