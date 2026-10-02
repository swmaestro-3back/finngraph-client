import { ArrowUpRight } from 'lucide-react'
import type { IpoDetailRes } from '@/lib/apiTypes'
import { formatAsOf } from '@/lib/calendar'
import { dartFilingUrl } from '@/lib/companyOverview'
import { IPO_NOTICE } from '@/lib/ipoDetail'

export function IpoSourceFooter({ detail }: { detail: Pick<IpoDetailRes, 'filing' | 'asOf'> }) {
  const asOf = formatAsOf(detail.asOf)

  return (
    <footer className="flex flex-col gap-1.5 border-t border-border px-6 py-4 sm:px-8">
      {detail.filing && (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-caption">
          <span className="text-muted-foreground">DART 최신 공시</span>
          <span className="break-keep text-foreground-secondary">{detail.filing.latestReportName}</span>
          <a
            href={dartFilingUrl(detail.filing.latestRceptNo)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            원문 보기
            <ArrowUpRight className="size-3.5" />
          </a>
        </p>
      )}
      <p className="text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
        {asOf && (
          <>
            <span className="font-mono tabular-nums">{asOf}</span> 기준 ·{' '}
          </>
        )}
        {IPO_NOTICE}
      </p>
    </footer>
  )
}
