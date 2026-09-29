import { ExternalLink } from 'lucide-react'
import { dartFilingUrl, describeSource, splitSentences } from '@/lib/companyOverview'

interface CompanyOverviewProps {
  description: string | null
  source: string | null
  rceptNo: string | null
}

const TEXT = 'text-[15px] leading-[1.75] text-foreground break-keep [text-wrap:pretty]'

export function CompanyOverview({ description, source, rceptNo }: CompanyOverviewProps) {
  if (!description) return null

  const sentences = splitSentences(description)
  const sourceLabel = describeSource(source)

  return (
    <section aria-labelledby="company-overview-title" className="mb-5 max-w-[70ch]">
      <h2
        id="company-overview-title"
        className="text-caption font-semibold tracking-[0.2px] text-muted-foreground"
      >
        기업 개요
      </h2>
      {sentences.length > 1 ? (
        <ul className={`${TEXT} mt-1.5 list-disc space-y-1 pl-5 marker:text-foreground-tertiary`}>
          {sentences.map((sentence, index) => (
            <li key={`${index}-${sentence.length}`}>{sentence}</li>
          ))}
        </ul>
      ) : (
        <p className={`${TEXT} mt-1.5`}>{sentences[0] ?? description}</p>
      )}
      {(sourceLabel || rceptNo) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          {sourceLabel && <span>{sourceLabel}</span>}
          {rceptNo && (
            <a
              href={dartFilingUrl(rceptNo)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-primary hover:underline"
            >
              원문 공시
              <ExternalLink className="size-3" strokeWidth={2} />
            </a>
          )}
        </p>
      )}
    </section>
  )
}
