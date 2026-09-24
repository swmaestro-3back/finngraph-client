import { Plus, Minus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface Props {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  /** 모바일에서는 우상단 사이드바 토글과 겹치지 않도록 우하단으로 내린다 */
  isMobile?: boolean
  /** 확대·축소 버튼 없이 초기화만 — 휠로 충분한 좁은 캔버스(뉴스 모달)용 */
  resetOnly?: boolean
  /** 세로 위치. 기본은 데스크톱 위, 모바일 아래 */
  placement?: 'top' | 'bottom'
}

export function Toolbar({
  onZoomIn,
  onZoomOut,
  onReset,
  isMobile = false,
  resetOnly = false,
  placement,
}: Props) {
  const actions = [
    { Icon: Plus, onClick: onZoomIn, label: '확대' },
    { Icon: Minus, onClick: onZoomOut, label: '축소' },
    { Icon: RotateCcw, onClick: onReset, label: '초기화' },
  ].filter((a) => !resetOnly || a.label === '초기화')
  const atBottom = (placement ?? (isMobile ? 'bottom' : 'top')) === 'bottom'

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'absolute right-4 z-10 flex flex-col gap-1',
          atBottom ? 'bottom-4' : 'top-4',
        )}
      >
        {actions.map(({ Icon, onClick, label }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-lg"
                onClick={onClick}
                aria-label={label}
                className="bg-background/90 shadow-soft backdrop-blur hover:border-primary hover:text-primary"
              >
                <Icon className="size-[18px]" strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
