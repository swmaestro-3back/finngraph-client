import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

/** 원점에서 몇 홉까지 볼지 — 1은 원점의 바로 이웃까지다 */
export type Hop = 1 | 2 | 3

const HOP_VALUES: Hop[] = [1, 2, 3]

interface Props {
  value: Hop
  onChange: (hop: Hop) => void
  /** 모바일에서는 툴바가 우하단으로 내려가 우상단이 비어 있다 */
  isMobile?: boolean
}

/**
 * 몇 홉까지 볼지 고르는 세그먼트 컨트롤.
 * 원점이 무엇인지(선택 노드 / 기사)와 렌더 여부는 부모가 정한다.
 */
export function HopSelector({ value, onChange, isMobile = false }: Props) {
  return (
    <div
      className={cn(
        'absolute top-4 z-10 flex items-center gap-2 rounded-lg border border-border bg-background/90 py-1.5 pr-1.5 pl-2.5 shadow-[var(--shadow-soft)] backdrop-blur',
        // 데스크톱에서는 우상단 툴바(확대·축소·초기화) 왼쪽에 붙인다
        isMobile ? 'right-4' : 'right-16',
      )}
    >
      <span className="text-[11px] font-semibold tracking-[0.5px] text-muted-foreground uppercase">
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
            aria-label={`${hop}홉`}
            // 켜짐 = 채운 배경 (그래프 관계 필터 칩과 같은 규칙)
            className="rounded-md px-2.5 font-mono text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {hop}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
