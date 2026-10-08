import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EVENT_PERIOD_LABELS, EVENT_PERIOD_VALUES, type EventPeriod } from '@/lib/eventPeriod'

interface Props {
  value: EventPeriod
  onChange: (period: EventPeriod) => void
}

/**
 * 이벤트 기간 칩 — 마지막 보도가 오늘로부터 얼마 안인 이벤트만 남긴다.
 * Hop 선택기와 같은 세그먼트 모양이지만 서버에 묻지 않고 화면에서만 거른다. 위치는 부모가 잡는다.
 */
export function EventPeriodSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/90 py-1.5 pr-1.5 pl-2.5 shadow-soft backdrop-blur">
      <span className="text-caption font-semibold tracking-[0.5px] text-muted-foreground">기간</span>
      <ToggleGroup
        type="single"
        size="sm"
        spacing={0}
        value={value}
        // 라디오처럼 항상 하나는 켜져 있어야 한다 — 켜진 항목을 다시 누르면 빈 문자열이 온다
        onValueChange={(next) => {
          if (next) onChange(next as EventPeriod)
        }}
        aria-label="이벤트 기간"
        className="gap-0.5"
      >
        {EVENT_PERIOD_VALUES.map((period) => (
          <ToggleGroupItem
            key={period}
            value={period}
            aria-label={`이벤트 기간 ${EVENT_PERIOD_LABELS[period]}`}
            // 켜짐 = 채운 배경 (Hop 선택기와 같은 규칙)
            className="rounded-md px-2.5 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {EVENT_PERIOD_LABELS[period]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
