import { describe, expect, it } from 'vitest'
import {
  ALL_CATEGORIES,
  ALL_ENTITY_TYPES,
  ALL_PREDICATES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PREDICATE_LABELS,
  isEventLink,
  nodeCategory,
} from '@/data/graphTypes'

describe('graphTypes', () => {
  it('이벤트 노드는 시장과 무관하게 event 카테고리다', () => {
    expect(nodeCategory({ type: 'event', data: { market: 'KOSPI' } })).toBe('event')
    expect(nodeCategory({ type: 'company', data: { market: 'KOSDAQ' } })).toBe('kosdaq')
    expect(nodeCategory({ type: 'theme', data: {} })).toBe('theme')
  })

  it('카테고리·서술어 목록과 라벨·색이 빠짐없이 짝을 이룬다', () => {
    expect(ALL_CATEGORIES).toEqual(['kospi', 'kosdaq', 'theme', 'event'])
    expect(ALL_ENTITY_TYPES).toEqual(['company', 'theme', 'event'])
    expect(ALL_PREDICATES).toEqual(['SUPPLIES_TO', 'ACQUIRES', 'INVESTS_IN', 'BELONGS_TO', 'HAS_EVENT'])
    ALL_CATEGORIES.forEach((c) => {
      expect(CATEGORY_LABELS[c]).toBeTruthy()
      expect(CATEGORY_COLORS[c]).toMatch(/^#/)
    })
    expect(PREDICATE_LABELS).toEqual({
      SUPPLIES_TO: '공급',
      ACQUIRES: '인수',
      INVESTS_IN: '투자',
      BELONGS_TO: '테마 소속',
      HAS_EVENT: '이벤트',
    })
    expect(CATEGORY_LABELS.event).toBe('이벤트')
  })

  it('HAS_EVENT만 이벤트 간선이다', () => {
    expect(isEventLink({ type: 'HAS_EVENT' })).toBe(true)
    ALL_PREDICATES.filter((p) => p !== 'HAS_EVENT').forEach((type) => {
      expect(isEventLink({ type })).toBe(false)
    })
  })
})
