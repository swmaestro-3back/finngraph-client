import { CircleHelp, Plus, Minus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { GLASS_BUTTON } from '@/components/graph/glass'
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
  buttonClassName?: string
  onHelp?: () => void
  helpHint?: boolean
}

export function Toolbar({
  onZoomIn,
  onZoomOut,
  onReset,
  isMobile = false,
  resetOnly = false,
  placement,
  buttonClassName,
  onHelp,
  helpHint = false,
}: Props) {
  const actions = [
    { Icon: Plus, onClick: onZoomIn, label: '확대' },
    { Icon: Minus, onClick: onZoomOut, label: '축소' },
    { Icon: RotateCcw, onClick: onReset, label: '초기화' },
    ...(onHelp ? [{ Icon: CircleHelp, onClick: onHelp, label: '안내 다시 보기' }] : []),
  ].filter((a) => !resetOnly || a.label === '초기화')
  const atBottom = (placement ?? (isMobile ? 'bottom' : 'top')) === 'bottom'

  return (
    <TooltipProvider delayDuration={300}>
      <div
        data-guide="toolbar"
        className={cn(
          'absolute right-4 z-10 flex flex-col gap-1',
          atBottom ? 'bottom-4' : 'top-4',
        )}
      >
        {actions.map(({ Icon, onClick, label }) => {
          const hinted = helpHint && Icon === CircleHelp
          return (
            <Tooltip key={label} open={hinted || undefined}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-lg"
                  onClick={onClick}
                  aria-label={label}
                  className={cn(
                    GLASS_BUTTON,
                    'relative',
                    hinted && 'text-primary shadow-[0_0_0_2px_var(--primary),0_14px_26px_-18px_var(--shadow-strong-color)]',
                    buttonClassName,
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={2} />
                  {hinted && (
                    <span
                      aria-hidden
                      className="fg-gping pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-primary"
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{hinted ? '언제든 여기서 안내를 다시 볼 수 있어요' : label}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
