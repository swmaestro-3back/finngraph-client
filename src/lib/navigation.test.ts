import { describe, expect, it } from 'vitest'
import { pathLabel } from '@/lib/navigation'

describe('pathLabel', () => {
  it('새 테마 화면은 목록과 고른 테마 모두 테마', () => {
    expect(pathLabel('/themes')).toBe('테마')
    expect(pathLabel('/themes/59')).toBe('테마')
  })

  it('다른 경로 라벨은 그대로', () => {
    expect(pathLabel('/')).toBe('테마 트리맵')
    expect(pathLabel('/stocks')).toBe('주식 목록')
    expect(pathLabel('/stock/005930')).toBe('주식 상세')
    expect(pathLabel('/briefing')).toBeNull()
  })
})
