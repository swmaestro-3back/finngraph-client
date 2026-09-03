import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { INDEX_SCOPES, MARKET_SCOPES, SCOPE_LABELS, type Scope } from '@/lib/graphRoute'
import { cn } from '@/lib/utils'

interface Props {
  value: Scope
  onChange: (scope: Scope) => void
  /** 좁은 캔버스(모바일, 상세 패널이 열린 노트북)에서는 아이콘 버튼으로 접고 바텀시트에서 고른다 */
  compact?: boolean
}

const ITEM =
  'rounded-md px-2.5 font-mono text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'

/**
 * 시장·지수를 한 그룹의 단일 선택으로 묶은 토글.
 * 서버가 market과 index를 함께 받지 않으므로, 하나만 켜지는 컨트롤이 그 제약을 그대로 표현한다.
 */
function ScopeToggle({ value, onChange, wrap = false }: Props & { wrap?: boolean }) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      spacing={0}
      value={value}
      // 라디오처럼 항상 하나는 켜져 있어야 한다 — 켜진 항목을 다시 누르면 빈 문자열이 온다
      onValueChange={(next) => {
        if (next) onChange(next as Scope)
      }}
      aria-label="탐색 범위"
      className={cn('gap-0.5', wrap && 'flex-wrap gap-1')}
    >
      <ToggleGroupItem value="all" className={ITEM}>
        {SCOPE_LABELS.all}
      </ToggleGroupItem>
      {MARKET_SCOPES.map((scope) => (
        <ToggleGroupItem key={scope} value={scope} className={ITEM}>
          {SCOPE_LABELS[scope]}
        </ToggleGroupItem>
      ))}
      {/* 시장과 지수는 같은 축(단일 선택)이지만 뜻이 달라 얇은 선으로 나눠 읽히게 한다 */}
      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
      {INDEX_SCOPES.map((scope) => (
        <ToggleGroupItem key={scope} value={scope} className={ITEM}>
          {SCOPE_LABELS[scope]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** 공급망 경로를 시장 또는 지수 하나로 제한하는 컨트롤. 위치는 부모가 잡는다 */
export function ScopeSelector({ value, onChange, compact = false }: Props) {
  const [open, setOpen] = useState(false)

  if (compact) {
    return (
      <>
        <Button
          variant="outline"
          size="icon-lg"
          onClick={() => setOpen(true)}
          aria-label="탐색 범위"
          className="relative bg-background/90 shadow-soft backdrop-blur"
        >
          <SlidersHorizontal className="size-[18px]" strokeWidth={2} />
          {/* 전체가 아니면 점을 찍어 필터가 걸려 있음을 알린다 */}
          {value !== 'all' && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
          )}
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl p-5">
            <SheetHeader className="p-0 pb-3 text-left">
              <SheetTitle>탐색 범위</SheetTitle>
              <SheetDescription>
                시장 또는 지수 하나로 공급망 경로를 제한합니다. 중심 기업은 항상 포함됩니다.
              </SheetDescription>
            </SheetHeader>
            <ScopeToggle
              value={value}
              onChange={(next) => {
                onChange(next)
                setOpen(false)
              }}
              wrap
            />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/90 py-1.5 pr-1.5 pl-2.5 shadow-soft backdrop-blur">
      <span className="text-caption font-semibold tracking-[0.5px] text-muted-foreground">
        범위
      </span>
      <ScopeToggle value={value} onChange={onChange} />
    </div>
  )
}
