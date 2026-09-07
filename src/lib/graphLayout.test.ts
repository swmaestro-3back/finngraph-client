import { describe, expect, it } from 'vitest'
import { EVENT_NODE, eventNodeWidth, truncateEventLabel } from '@/lib/graphLayout'

describe('이벤트 태그 기하', () => {
  it('12자를 넘는 제목은 11자 + 말줄임', () => {
    expect(truncateEventLabel('로봇 액추에이터 수주 협의 확대')).toBe('로봇 액추에이터 수주…')
    expect(truncateEventLabel('로봇 액추에이터 수주 협의 확대')).toHaveLength(EVENT_NODE.maxChars)
    expect(truncateEventLabel('짧은 제목')).toBe('짧은 제목')
  })

  it('폭은 잘린 라벨 글자 수에 비례하고 좌우 여백을 더한다', () => {
    expect(eventNodeWidth('짧은 제목')).toBe(5 * EVENT_NODE.charWidth + EVENT_NODE.padX * 2)
    expect(eventNodeWidth('로봇 액추에이터 수주 협의 확대')).toBe(
      EVENT_NODE.maxChars * EVENT_NODE.charWidth + EVENT_NODE.padX * 2,
    )
  })
})
