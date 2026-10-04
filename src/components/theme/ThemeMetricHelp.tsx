import type { ReactNode } from 'react'
import { InfoPopover } from '@/components/ui/info-popover'
import { formatTradingDate } from '@/lib/referenceDate'
import { METRIC_HELP_LINES } from '@/lib/themeMetrics'

interface ThemeMetricHelpProps {
  baseDate?: string | null
  suffix?: string
  className?: string
  /** 계산 방식 목록 아래에 덧붙이는 설명 — 트리맵 범례 등 */
  children?: ReactNode
}

export function ThemeMetricHelp({ baseDate, suffix = '종가 기준', className, children }: ThemeMetricHelpProps) {
  const lines = [
    baseDate ? `기준일 ${formatTradingDate(baseDate)} ${suffix}` : '기준일: 장마감 종가 기준',
    METRIC_HELP_LINES.method,
    METRIC_HELP_LINES.universe,
    METRIC_HELP_LINES.hot,
  ]

  return (
    <InfoPopover title="테마 등락률 계산 방식" className={className}>
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
      {children}
    </InfoPopover>
  )
}
