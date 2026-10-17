import type { LegalSlug } from '@/data/legal'

export type ConsentKey = 'age' | 'terms' | 'privacy'
export type ConsentState = Record<ConsentKey, boolean>

export interface ConsentItem {
  key: ConsentKey
  label: string
  doc?: LegalSlug
}

export const CONSENT_ITEMS: readonly ConsentItem[] = [
  { key: 'age', label: '만 14세 이상입니다' },
  { key: 'terms', label: '이용약관 동의', doc: 'terms' },
  { key: 'privacy', label: '개인정보 수집·이용 동의', doc: 'privacy' },
]

export const EMPTY_CONSENT: ConsentState = { age: false, terms: false, privacy: false }

export function allConsented(state: ConsentState): boolean {
  return CONSENT_ITEMS.every((item) => state[item.key])
}

export function fillConsent(checked: boolean): ConsentState {
  return { age: checked, terms: checked, privacy: checked }
}
