import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { HOP_VALUES, type Hop } from '@/lib/graphRoute'

// 컴포넌트 파일에서 값(HOP_VALUES)을 내보내면 Fast Refresh가 깨져 상수는 graphRoute에 두고 타입만 다시 내보낸다
export type { Hop }

interface Props {
  value: Hop
  onChange: (hop: Hop) => void
  /** 각 홉에 표시할 글자 — 뉴스 모달은 기사를 0홉으로 세므로 { 1: '0', 2: '1', 3: '2' }를 준다 */
  labels?: Record<Hop, string>
}

/**
 * 몇 홉까지 볼지 고르는 세그먼트 컨트롤.
 * 위치는 부모가 잡는다 — 범위 선택기 등 다른 컨트롤과 한 줄에 놓이기 때문이다.
 */
export function HopSelector({ value, onChange, labels }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/90 py-1.5 pr-1.5 pl-2.5 shadow-soft backdrop-blur">
      <span className="text-caption font-semibold tracking-[0.5px] text-muted-foreground">
        Hop
      </span>
      <ToggleGroup
        type="single"
        size="sm"
        spacing={0}
        value={String(value)}
        // 라디오처럼 항상 하나는 켜져 있어야 한다 — 켜진 항목을 다시 누르면 빈 문자열이 온다
        onValueChange={(next) => {
          if (next) onChange(Number(next) as Hop)
        }}
        aria-label="탐색 홉 수"
        className="gap-0.5"
      >
        {HOP_VALUES.map((hop) => (
          <ToggleGroupItem
            key={hop}
            value={String(hop)}
            aria-label={`${labels ? labels[hop] : hop}홉`}
            // 켜짐 = 채운 배경 (그래프 관계 필터 칩과 같은 규칙)
            className="rounded-md px-2.5 font-mono text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {labels ? labels[hop] : hop}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
