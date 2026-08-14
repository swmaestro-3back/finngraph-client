import { DATE_TICK_POSITIONS, RULE, slotCenter } from '@/lib/chartAxis'
import { cn } from '@/lib/utils'

// 공유 x축 위에 그리는 장식 — 캔들·거래량·이슈 레인이 같은 마크를 써야
// 세 레인의 룰이 한 줄로 이어져 보인다.

/** 선택 룰(점선) + 크로스헤어(실선) */
export function AxisRules({
  selectedIndex,
  crosshairIndex,
  count,
}: {
  selectedIndex: number | null
  crosshairIndex: number | null
  count: number
}) {
  return (
    <>
      {selectedIndex !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px border-l border-dashed"
          style={{ left: `${slotCenter(selectedIndex, count)}%`, borderColor: RULE }}
        />
      )}
      {crosshairIndex !== null && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px"
          style={{ left: `${slotCenter(crosshairIndex, count)}%`, backgroundColor: RULE }}
        />
      )}
    </>
  )
}

/** 날짜 라벨 행 — labels[k]는 DATE_TICK_POSITIONS[k] 자리에 놓인다 */
export function DateTicks({ labels, className }: { labels: string[]; className?: string }) {
  return (
    <div className={cn('relative mt-1.5 h-[18px]', className)}>
      {labels.map((label, k) => (
        <span
          key={k}
          className="absolute font-mono text-[10px] font-medium text-muted-foreground"
          style={{ left: `${DATE_TICK_POSITIONS[k]}%` }}
        >
          {label}
        </span>
      ))}
    </div>
  )
}
