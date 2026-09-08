import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LENS_LABELS, LENS_VALUES, type Lens } from '@/lib/graphRoute'

interface Props {
  value: Lens
  onChange: (lens: Lens) => void
}

/**
 * 개요 / 공급망 / 이벤트 렌즈 세그먼트. 위치는 부모가 잡는다 — 사이드바 토글 옆 좌상단.
 * 라벨 접두어를 두지 않는다 — 세 글자 라벨 셋만으로도 뜻이 읽히고, 모바일 상단 폭이 빠듯하다.
 */
export function LensSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-background/90 p-1.5 shadow-soft backdrop-blur">
      <ToggleGroup
        type="single"
        size="sm"
        spacing={0}
        value={value}
        // 라디오처럼 항상 하나는 켜져 있어야 한다 — 켜진 항목을 다시 누르면 빈 문자열이 온다
        onValueChange={(next) => {
          if (next) onChange(next as Lens)
        }}
        aria-label="탐색 렌즈"
        className="gap-0.5"
      >
        {LENS_VALUES.map((lens) => (
          <ToggleGroupItem
            key={lens}
            value={lens}
            className="rounded-md px-2.5 text-xs font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {LENS_LABELS[lens]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
