import { CitationBadges } from '@/components/briefing/CitationBadges'
import { Breadth } from '@/components/theme/ThemeMetricSummary'
import type { BriefingHeadlineRes, ThemeMarketRes } from '@/lib/apiTypes'
import { changeColorClass, formatChangeOrDash } from '@/lib/format'
import { coverageBanner } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

interface HeadlineCardProps {
  headline: BriefingHeadlineRes | null
  market: ThemeMarketRes
}

export function HeadlineCard({ headline, market }: HeadlineCardProps) {
  const banner = coverageBanner(market.coverage, null)
  return (
    <section className="card-surface p-5" aria-labelledby="briefing-headline-title">
      <h2 id="briefing-headline-title" className="sr-only">
        오늘의 한 줄
      </h2>
      {headline ? (
        <p className="text-title font-medium leading-[1.4] tracking-[-0.4px] text-foreground [text-wrap:balance]">
          {headline.text}
          <CitationBadges citations={headline.citations} className="ml-2" />
        </p>
      ) : null}
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-muted-foreground',
          headline ? 'mt-3 border-t border-surface-inset pt-3' : '',
        )}
      >
        <span className="flex items-center gap-1.5">
          <span>시장 폭</span>
          <Breadth up={market.upCount} flat={market.flatCount} down={market.downCount} className="text-foreground" />
        </span>
        <span>
          중앙값{' '}
          <span className={cn('font-mono tabular-nums', changeColorClass(market.medianChange ?? 0))}>
            {formatChangeOrDash(market.medianChange)}
          </span>
        </span>
        <span>
          집계 <span className="font-mono tabular-nums text-foreground-secondary">{market.pricedCount.toLocaleString('ko-KR')}</span>
          종목
        </span>
        {banner && <span className="text-accent-warm">{banner}</span>}
      </div>
    </section>
  )
}
