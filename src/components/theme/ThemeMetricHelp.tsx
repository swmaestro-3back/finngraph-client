import { Info } from 'lucide-react'
import { Popover } from 'radix-ui'
import { formatTradingDate } from '@/lib/referenceDate'
import { METRIC_HELP_LINES } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

interface ThemeMetricHelpProps {
  baseDate?: string | null
  className?: string
}

export function ThemeMetricHelp({ baseDate, className }: ThemeMetricHelpProps) {
  const lines = [
    baseDate ? `기준일 ${formatTradingDate(baseDate)} 종가 기준` : '기준일: 장마감 종가 기준',
    METRIC_HELP_LINES.universe,
    METRIC_HELP_LINES.trimmed,
    METRIC_HELP_LINES.hot,
  ]

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="테마 등락률 계산 방식"
          className={cn(
            'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors -m-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary',
            className,
          )}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 w-[min(320px,calc(100vw-32px))] rounded-xl border border-border bg-background p-4 shadow-soft outline-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <p className="mb-2 text-caption font-semibold text-foreground">테마 등락률 계산 방식</p>
          <ol className="flex flex-col gap-1.5 text-caption leading-relaxed text-foreground-secondary break-keep [text-wrap:pretty]">
            {lines.map((line, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="shrink-0 font-mono tabular-nums text-foreground-tertiary">
                  {i + 1}.
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
