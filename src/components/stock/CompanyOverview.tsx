import { ExternalLink } from 'lucide-react'
import { dartFilingUrl, describeSource, splitSentences, type ProfileRow } from '@/lib/companyOverview'
import { cn } from '@/lib/utils'

interface CompanyOverviewProps {
  description: string | null
  source: string | null
  rceptNo: string | null
  rows: ProfileRow[]
}

const TEXT = 'text-[15px] leading-[1.75] text-foreground break-keep [text-wrap:pretty]'

export function CompanyOverview({ description, source, rceptNo, rows }: CompanyOverviewProps) {
  if (!description && rows.length === 0) return null

  const sentences = description ? splitSentences(description) : []
  const sourceLabel = description ? describeSource(source) : null

  return (
    <section aria-labelledby="company-overview-title" className="mb-5 max-w-[70ch]">
      <h2
        id="company-overview-title"
        className="text-caption font-semibold tracking-[0.2px] text-muted-foreground"
      >
        기업 개요
      </h2>
      {description && sentences.length > 1 ? (
        <ul className={`${TEXT} mt-1.5 list-disc space-y-1 pl-5 marker:text-foreground-tertiary`}>
          {sentences.map((sentence, index) => (
            <li key={`${index}-${sentence.length}`}>{sentence}</li>
          ))}
        </ul>
      ) : description ? (
        <p className={`${TEXT} mt-1.5`}>{sentences[0] ?? description}</p>
      ) : null}
      {description && (sourceLabel || rceptNo) && (
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
      {rows.length > 0 && (
        <dl
          className={cn(
            'grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-6 gap-y-2',
            description ? 'mt-5 border-t border-border pt-4' : 'mt-2',
          )}
        >
          {rows.map((item) => (
            <div key={item.label} className="contents">
              <dt className="text-caption text-muted-foreground">{item.label}</dt>
              <dd
                className={cn(
                  'min-w-0 text-sm text-foreground break-keep',
                  item.numeric && 'font-mono tabular-nums',
                )}
              >
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 break-all hover:text-primary hover:underline"
                  >
                    {item.value}
                    <ExternalLink className="size-3 shrink-0" strokeWidth={2} />
                  </a>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
