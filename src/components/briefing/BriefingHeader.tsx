import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { BriefingStatus } from '@/lib/apiTypes'
import { formatDateTime } from '@/lib/format'
import { formatShortDate } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

interface BriefingHeaderProps {
  baseDate: string | null
  generatedAt: string | null
  status: BriefingStatus | null
  prev: string | null
  next: string | null
  onNavigate: (date: string | null) => void
}

function StepButton({
  target,
  direction,
  onNavigate,
  className,
}: {
  target: string
  direction: 'prev' | 'next'
  onNavigate: (date: string) => void
  className?: string
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  const label = `${formatShortDate(target)} 브리핑`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`${direction === 'prev' ? '이전' : '다음'} 브리핑 (${label})`}
          onClick={() => onNavigate(target)}
          className={cn(
            'inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
            className,
          )}
        >
          <Icon className="size-4" strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function Divider() {
  return (
    <span aria-hidden className="text-foreground-tertiary">
      ·
    </span>
  )
}

export function BriefingHeader({ baseDate, generatedAt, status, prev, next, onNavigate }: BriefingHeaderProps) {
  return (
    <div className="mb-5">
      <h1 className="text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">데일리 브리핑</h1>
      <TooltipProvider delayDuration={200}>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-muted-foreground">
          {baseDate ? (
            <span className="inline-flex items-center">
              {prev && <StepButton target={prev} direction="prev" onNavigate={onNavigate} className="-ml-6" />}
              <span className="pr-0.5">
                <span className="font-mono tabular-nums text-foreground">{formatShortDate(baseDate)}</span> 종가 기준
              </span>
              {next && <StepButton target={next} direction="next" onNavigate={onNavigate} className="ml-0.5" />}
            </span>
          ) : (
            <span>기준일 없음</span>
          )}
          {next && (
            <>
              <Divider />
              <button
                type="button"
                onClick={() => onNavigate(null)}
                className="cursor-pointer font-medium text-primary hover:underline"
              >
                최신으로
              </button>
            </>
          )}
          {generatedAt && (
            <>
              <Divider />
              <span>
                생성 <span className="font-mono tabular-nums text-foreground-secondary">{formatDateTime(generatedAt)}</span>
              </span>
            </>
          )}
          {status === 'PARTIAL' && (
            <>
              <Divider />
              <span className="text-accent-warm">일부 문장이 검증에서 제외되었습니다</span>
            </>
          )}
        </div>
      </TooltipProvider>
    </div>
  )
}
