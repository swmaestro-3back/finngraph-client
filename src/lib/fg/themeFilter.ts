import type { ThemeRes } from '@/lib/apiTypes'
import { formatCompactKrw } from '@/lib/format'

export type ThemeRangeKey = 'change' | 'w1' | 'm1' | 'm3' | 'value' | 'cap' | 'stocks'

export interface ThemeRange {
  min?: number
  max?: number
}

export type ThemeRanges = Partial<Record<ThemeRangeKey, ThemeRange>>

export interface ThemeRangeField {
  key: ThemeRangeKey
  label: string
  unit: string
  scale: number
  valueOf: (theme: ThemeRes) => number | null
}

export const THEME_RANGE_FIELDS: readonly ThemeRangeField[] = [
  { key: 'change', label: '오늘 등락률', unit: '%', scale: 1, valueOf: (theme) => theme.weightedChange ?? null },
  { key: 'w1', label: '1주 수익률', unit: '%', scale: 1, valueOf: (theme) => theme.w1 },
  { key: 'm1', label: '1달 수익률', unit: '%', scale: 1, valueOf: (theme) => theme.m1 },
  { key: 'm3', label: '3달 수익률', unit: '%', scale: 1, valueOf: (theme) => theme.m3 },
  { key: 'value', label: '거래대금', unit: '억 원', scale: 1e8, valueOf: (theme) => theme.tradingValue },
  { key: 'cap', label: '시가총액 합', unit: '억 원', scale: 1e8, valueOf: (theme) => theme.marketCap },
  { key: 'stocks', label: '종목 수', unit: '개', scale: 1, valueOf: (theme) => theme.stockCount },
]

export const THEME_NAME_MAX = 40

const SEPARATOR = '..'

function rangeOn(range: ThemeRange | undefined): range is ThemeRange {
  return range !== undefined && (range.min !== undefined || range.max !== undefined)
}

function parseBound(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

export function readThemeRanges(params: URLSearchParams): ThemeRanges {
  const ranges: ThemeRanges = {}
  for (const { key } of THEME_RANGE_FIELDS) {
    const raw = params.get(key)
    if (raw === null) continue
    const [min, max] = raw.split(SEPARATOR)
    const range = { min: parseBound(min), max: parseBound(max) }
    if (rangeOn(range)) ranges[key] = range
  }
  return ranges
}

export function writeThemeRanges(params: URLSearchParams, ranges: ThemeRanges): void {
  for (const { key } of THEME_RANGE_FIELDS) {
    const range = ranges[key]
    if (rangeOn(range)) params.set(key, `${range.min ?? ''}${SEPARATOR}${range.max ?? ''}`)
    else params.delete(key)
  }
}

export function readThemeName(params: URLSearchParams): string | null {
  const name = (params.get('name') ?? '').trim().slice(0, THEME_NAME_MAX)
  return name === '' ? null : name
}

export function themeFilterCount(ranges: ThemeRanges, nameQ: string | null): number {
  return THEME_RANGE_FIELDS.filter(({ key }) => rangeOn(ranges[key])).length + (nameQ === null ? 0 : 1)
}

export function matchesThemeFilter(theme: ThemeRes, ranges: ThemeRanges, nameQ: string | null): boolean {
  if (nameQ !== null && !theme.name.toLowerCase().includes(nameQ.toLowerCase())) return false
  for (const field of THEME_RANGE_FIELDS) {
    const range = ranges[field.key]
    if (!rangeOn(range)) continue
    const value = field.valueOf(theme)
    if (value === null) return false
    if (range.min !== undefined && value < range.min * field.scale) return false
    if (range.max !== undefined && value > range.max * field.scale) return false
  }
  return true
}

function boundText(field: ThemeRangeField, value: number): string {
  if (field.scale !== 1) return formatCompactKrw(value * field.scale)
  return `${value}${field.unit}`
}

export function themeRangeLabel(field: ThemeRangeField, range: ThemeRange): string {
  if (range.min !== undefined && range.max !== undefined) {
    return `${field.label} ${boundText(field, range.min)}~${boundText(field, range.max)}`
  }
  if (range.min !== undefined) return `${field.label} ${boundText(field, range.min)} 이상`
  if (range.max !== undefined) return `${field.label} ${boundText(field, range.max)} 이하`
  return field.label
}

export function activeThemeRanges(ranges: ThemeRanges): { key: ThemeRangeKey; label: string }[] {
  return THEME_RANGE_FIELDS.flatMap((field) => {
    const range = ranges[field.key]
    return rangeOn(range) ? [{ key: field.key, label: themeRangeLabel(field, range) }] : []
  })
}
