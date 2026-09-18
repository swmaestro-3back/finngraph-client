import { useCallback, useMemo, useState } from 'react'
import { ReferenceLine, Tooltip } from 'recharts'
import type { SyncMethod } from 'recharts/types/synchronisation/types'
import { RULE } from '@/lib/chartAxis'

// 같은 x축을 쓰는 차트 묶음이 한 지점을 함께 가리키게 한다.
// hover 동기화는 recharts `syncId`가 처리하므로, 여기서 쥐는 것은 클릭 고정뿐이다.
//
// 연간 실적(연 단위)과 투자자별 수급(거래일 단위)은 축이 다르므로 각각 별도의 묶음이다.

/** recharts 마우스 핸들러가 넘기는 값 중 쓰는 부분 */
interface ChartMouseState {
  activeTooltipIndex?: number | string | null
}

/**
 * 같은 칸(인덱스)을 가리키되 커서 위치는 대상 차트 자신의 눈금에서 얻는다.
 * 기본 `'index'`는 원본 차트의 커서 x좌표를 대상 차트 폭에 비례해 그대로 옮기는데,
 * 막대 차트(눈금이 밴드 중앙)와 선 차트(눈금이 양 끝)는 축 기하가 달라 가장자리 칸일수록 어긋난다.
 */
export const SYNC_BY_INDEX: SyncMethod = (_ticks, { activeTooltipIndex }) =>
  activeTooltipIndex == null ? -1 : Number(activeTooltipIndex)

export interface SyncedIndex {
  /** 클릭으로 고정된 칸 — 커서가 떠나도 남는다 */
  pinnedIndex: number | null
  /** 차트의 onClick에 그대로 연결한다. 같은 칸을 다시 누르면 풀린다 */
  onChartClick: (state: ChartMouseState) => void
  clear: () => void
}

export function useSyncedIndex(): SyncedIndex {
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null)

  const onChartClick = useCallback((state: ChartMouseState) => {
    const index = state?.activeTooltipIndex
    // 빈 여백을 누르면 인덱스가 없다 — 고정을 건드리지 않는다
    if (index === null || index === undefined) return
    const next = typeof index === 'number' ? index : Number(index)
    if (Number.isNaN(next)) return
    setPinnedIndex((current) => (current === next ? null : next))
  }, [])

  const clear = useCallback(() => setPinnedIndex(null), [])

  // memo된 소비자에게 그대로 내려갈 수 있도록 pinnedIndex가 바뀔 때만 새 객체를 만든다
  return useMemo(() => ({ pinnedIndex, onChartClick, clear }), [pinnedIndex, onChartClick, clear])
}

/** recharts가 커스텀 커서 요소에 흘려주는 props 중 쓰는 것 — 세로선 양 끝점(플롯 위·아래) */
interface AxisLabelCursorProps {
  points?: { x: number; y: number }[]
  className?: string
}

// x축 라벨 박스 치수 — 라벨은 플롯 아래 ~9px부터 13px 높이로 그려진다 (fontSize 10, dy 0.71em, tickMargin 6)
const LABEL_BOX_W = 34
const LABEL_BOX_H = 22
const LABEL_BOX_GAP = 4

/**
 * 축 라벨 커서 — 세로 룰 + x축의 짚은 연도 글자를 감싸는 파란 박스 (ECharts axisPointer 라벨 느낌).
 * 라벨 텍스트는 recharts가 더 위 레이어에 그리므로 박스는 그 밑에 깔린다.
 */
function AxisLabelCursor({ points, className }: AxisLabelCursorProps) {
  if (!points || points.length < 2) return null
  const [topPt, bottomPt] = points
  return (
    <g className={className} pointerEvents="none">
      <line x1={topPt.x} y1={topPt.y} x2={bottomPt.x} y2={bottomPt.y} stroke={RULE} strokeWidth={1} />
      <rect
        x={topPt.x - LABEL_BOX_W / 2}
        y={bottomPt.y + LABEL_BOX_GAP}
        width={LABEL_BOX_W}
        height={LABEL_BOX_H}
        rx={3}
        fill="var(--primary)"
        fillOpacity={0.08}
        stroke="var(--primary)"
        strokeOpacity={0.55}
        strokeWidth={1}
      />
    </g>
  )
}

/**
 * 고정된 칸의 툴팁을 계속 띄우는 Tooltip props.
 * 고정이 없으면 빈 객체를 돌려줘 표시 여부를 recharts에 맡긴다
 * (`active: false`를 넘기면 hover에도 뜨지 않는다).
 */
function pinnedTooltipProps(pinnedIndex: number | null) {
  return pinnedIndex === null ? {} : { active: true, defaultIndex: pinnedIndex }
}

/**
 * 동기화 차트 하나에 넣는 툴팁 + 고정 표시선.
 * 배열로 돌려줘 recharts가 차트의 직접 자식으로 인식하게 한다
 * (커스텀 컴포넌트로 감싸면 차트가 찾지 못한다).
 * `bar`는 막대 차트용 면 커서, `line`은 선 커서, `axis-label`은 선 커서에 x축 라벨 박스를 더한 것.
 */
export function syncMarks(
  sync: SyncedIndex,
  {
    kind,
    xForIndex,
    content,
    yAxisId,
  }: {
    /** bar: 면 커서 / line: 선 커서 / axis-label: 선 커서 + x축 라벨 박스 */
    kind: 'bar' | 'line' | 'axis-label'
    /** 고정된 인덱스 → 그 칸의 x축 값(라벨) */
    xForIndex: (index: number) => string
    /** 앱 톤 커스텀 툴팁 */
    content: React.ReactElement
    /** 차트의 YAxis에 커스텀 id를 줬다면 그중 하나 — 없으면 ReferenceLine이 기본 축(0)을 못 찾아 그려지지 않는다 */
    yAxisId?: string | number
  },
) {
  return [
    <Tooltip
      key="tooltip"
      isAnimationActive={false}
      cursor={
        kind === 'axis-label' ? (
          <AxisLabelCursor />
        ) : kind === 'bar' ? (
          /* --foreground(#0a0b0d) 4% — recharts cursor는 객체 리터럴로만 받는다 */
          { fill: 'rgba(10,11,13,0.04)' }
        ) : (
          { stroke: RULE, strokeWidth: 1 }
        )
      }
      content={content}
      {...pinnedTooltipProps(sync.pinnedIndex)}
    />,
    sync.pinnedIndex === null ? null : (
      <ReferenceLine
        key="pin"
        x={xForIndex(sync.pinnedIndex)}
        yAxisId={yAxisId}
        stroke={RULE}
        strokeDasharray="4 4"
      />
    ),
  ]
}

/** 동기화 묶음 위에 놓는 안내 문구 + "{칸} 고정 해제" 버튼 한 줄 */
export function SyncPinHeader({
  hint,
  pinnedLabel,
  onClear,
}: {
  hint: string
  /** null이면 고정이 없다 — 안내 문구만 보인다 */
  pinnedLabel: string | null
  onClear: () => void
}) {
  return (
    <div className="mb-[9px] flex min-h-[18px] items-center justify-between text-caption">
      <span className="text-muted-foreground">{hint}</span>
      {pinnedLabel && (
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer font-medium text-primary"
        >
          {pinnedLabel} 고정 해제
        </button>
      )}
    </div>
  )
}
