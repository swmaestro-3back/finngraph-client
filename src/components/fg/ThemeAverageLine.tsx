import { ChangeText } from '@/components/fg/PriceChange'
import type { ThemeRes } from '@/lib/apiTypes'
import { AVERAGE_BREADTH_HELP, themeAverage } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

interface ThemeAverageLineProps {
  theme: Pick<ThemeRes, 'change' | 'upCount' | 'downCount'>
  className?: string
}

export function ThemeAverageLine({ theme, className }: ThemeAverageLineProps) {
  const fact = themeAverage(theme)
  if (!fact) return null
  const hasCounts = fact.up !== undefined && fact.down !== undefined
  return (
    <small className={cn('fg-tavg', className)} title={AVERAGE_BREADTH_HELP}>
      {'종목 평균 '}
      <ChangeText value={fact.change} />
      {hasCounts && ` · 상승 ${fact.up} · 하락 ${fact.down}`}
    </small>
  )
}
