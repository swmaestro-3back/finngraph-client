import { useMemo, useState } from 'react'
import { AxisRules, DateTicks } from '@/components/chart/AxisMarks'
import type { IssueDay } from '@/lib/apiTypes'
import {
  AXIS_GUTTER,
  BAR_FILL,
  BAR_INSET,
  DOWN,
  UP,
  dateTickIndexes,
  emphasis,
  slotPct,
} from '@/lib/chartAxis'
import { cn } from '@/lib/utils'

// 이슈 레인 — 캔들 차트 아래에 같은 축으로 붙는 발산형 막대
// (docs/superpowers/specs/2026-08-14-issue-timeline-design.md)
//
// 0선 위가 호재, 아래가 악재. 높이는 건수, 방향은 성격 — 채널 하나에 변수 하나만 싣는다.
// 호버 팝오버는 두지 않는다. 뉴스는 아래 패널이 보여주므로 커서가 죽는 틈이 생길 수 없다.

/** 위/아래 각 28px — 캔들 300px, 거래량 90px 대비 의도적으로 작다. 주인공은 가격이다 */
const HALF = 'h-7'

const NEUTRAL = 'var(--muted-foreground)'

interface IssueLaneProps {
  days: IssueDay[]
  hoveredIndex: number | null
  selectedIndex: number | null
  onHover: (index: number | null) => void
  /** 같은 칸을 다시 고르면 null이 온다 */
  onSelect: (index: number | null) => void
}

export function IssueLane({
  days,
  hoveredIndex,
  selectedIndex,
  onHover,
  onSelect,
}: IssueLaneProps) {
  const count = days.length
  // 키보드 포커스는 선택과 별개로 움직인다 (←/→로 훑고 Enter로 고른다)
  // 기간이 바뀌면 부모가 key로 리마운트하므로 초기값(가장 최근 칸)으로 돌아온다
  const [focusIndex, setFocusIndex] = useState(count - 1)

  // 위아래 절반이 같은 척도를 써야 호재 3건과 악재 3건이 같은 길이로 보인다
  // (hover마다 리렌더되는 컴포넌트라 days가 바뀔 때만 스캔한다)
  const maxSide = useMemo(
    () => Math.max(1, ...days.map((d) => Math.max(d.good, d.bad, d.neutral))),
    [days],
  )
  const hasSentiment = useMemo(() => days.some((d) => d.good + d.bad > 0), [days])
  const tickIndexes = dateTickIndexes(count)
  // 캔들 차트와 같은 규칙: 크로스헤어는 짚는 대로 따라가고, 선택 룰은 그와 별개로 남는다
  const activeIndex = hoveredIndex ?? selectedIndex
  // 막대는 슬롯 버튼 안에 놓이므로 슬롯 기준 비율을 쓴다 (컨테이너 기준 barLeft와 같은 자리)
  const bar = { left: `${BAR_INSET * 100}%`, width: `${BAR_FILL * 100}%` }

  const move = (next: number) => {
    const clamped = Math.min(count - 1, Math.max(0, next))
    setFocusIndex(clamped)
    onHover(clamped)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        move(focusIndex - 1)
        break
      case 'ArrowRight':
        move(focusIndex + 1)
        break
      case 'Home':
        move(0)
        break
      case 'End':
        move(count - 1)
        break
      case 'Enter':
      case ' ':
        onSelect(selectedIndex === focusIndex ? null : focusIndex)
        break
      case 'Escape':
        onSelect(null)
        return
      default:
        return
    }
    e.preventDefault()
  }

  return (
    <div className={AXIS_GUTTER}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-foreground">이슈</span>
        <span className="text-caption text-muted-foreground">
          {hasSentiment
            ? '위 호재 · 아래 악재 · 막대를 누르면 아래에 그 구간 뉴스가 열립니다'
            : '막대를 누르면 아래에 그 구간 뉴스가 열립니다'}
        </span>
      </div>

      {/* 막대가 60여 개라 개별 탭스톱을 주면 키보드로 페이지를 통과할 수 없다.
          레인 전체가 단일 탭스톱인 listbox로 동작한다. */}
      <div
        role="listbox"
        tabIndex={0}
        aria-label="기간별 이슈"
        aria-activedescendant={`issue-slot-${focusIndex}`}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => onHover(null)}
        onBlur={() => onHover(null)}
        className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className={cn('relative w-full', HALF)} />
        <div className="h-px w-full bg-border" />
        <div className={cn('relative w-full', HALF)} />

        {days.map((day, i) => {
          const total = day.good + day.bad + day.neutral
          const isSelected = selectedIndex === i
          const opacity = emphasis(i, activeIndex, 0.85, 0.35)
          return (
            <button
              key={day.date}
              type="button"
              id={`issue-slot-${i}`}
              role="option"
              aria-selected={isSelected}
              aria-label={
                hasSentiment
                  ? `${day.date} 호재 ${day.good}건 악재 ${day.bad}건`
                  : `${day.date} 뉴스 ${day.neutral}건`
              }
              tabIndex={-1}
              onMouseEnter={() => onHover(i)}
              onFocus={() => setFocusIndex(i)}
              onClick={() => onSelect(isSelected ? null : i)}
              className="absolute inset-y-0 cursor-pointer outline-none"
              style={{ left: `${i * slotPct(count)}%`, width: `${slotPct(count)}%` }}
            >
              {/* 호재 — 0선 위로 */}
              {day.good > 0 && (
                <span
                  className="absolute bottom-1/2 rounded-t-[2px]"
                  style={{
                    ...bar,
                    height: `calc(${(day.good / maxSide) * 50}% - 0.5px)`,
                    backgroundColor: UP,
                    opacity,
                  }}
                />
              )}
              {/* 악재 — 0선 아래로 */}
              {day.bad > 0 && (
                <span
                  className="absolute top-1/2 rounded-b-[2px]"
                  style={{
                    ...bar,
                    height: `calc(${(day.bad / maxSide) * 50}% - 0.5px)`,
                    backgroundColor: DOWN,
                    opacity,
                  }}
                />
              )}
              {day.neutral > 0 && (
                <span
                  className="absolute bottom-1/2 rounded-t-[2px]"
                  style={{
                    ...bar,
                    height: `calc(${(day.neutral / maxSide) * 50}% - 0.5px)`,
                    backgroundColor: NEUTRAL,
                    opacity,
                  }}
                />
              )}
              <span className="sr-only">{total}건</span>
            </button>
          )
        })}

        {/* 선택 룰 · 크로스헤어 — 캔들 차트가 같은 위치에 그리는 것과 이어져 보인다 */}
        <AxisRules
          selectedIndex={selectedIndex}
          crosshairIndex={hoveredIndex}
          count={count}
        />
      </div>

      {/* 날짜 라벨 */}
      <DateTicks labels={tickIndexes.map((idx) => days[idx].label)} />
    </div>
  )
}
