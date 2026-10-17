import { ExternalLink } from 'lucide-react'
import { Disclaimer } from '@/components/fg/Disclaimer'
import type { IpoDetailRes } from '@/lib/apiTypes'
import { formatAsOf } from '@/lib/calendar'
import { dartFilingUrl } from '@/lib/companyOverview'
import { IPO_NOTICE } from '@/lib/ipoDetail'

export function IpoSourceFooter({ detail }: { detail: Pick<IpoDetailRes, 'filing' | 'asOf'> }) {
  const asOf = formatAsOf(detail.asOf)

  return (
    <footer className="fg-cal-dfoot">
      {detail.filing && (
        <p className="fg-cal-dfoot__src">
          <span>DART 최신 공시</span>
          <span className="fg-cal-dfoot__doc">{detail.filing.latestReportName}</span>
          <a
            href={dartFilingUrl(detail.filing.latestRceptNo)}
            target="_blank"
            rel="noopener noreferrer"
            className="fg-cal-ext"
          >
            원문 보기
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
          </a>
        </p>
      )}
      <Disclaimer text={asOf ? `${asOf} 기준 · ${IPO_NOTICE}` : IPO_NOTICE} className="fg-snote fg-num" />
    </footer>
  )
}
