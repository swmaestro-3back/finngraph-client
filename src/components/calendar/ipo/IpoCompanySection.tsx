import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { DetailSection, SectionNotice, Tag } from '@/components/calendar/detail/DetailParts'
import type { IpoCompanyRes } from '@/lib/apiTypes'
import { formatFullDate } from '@/lib/calendar'
import { dartFilingUrl, splitSentences } from '@/lib/companyOverview'
import { homepageUrl, ipoIntroSource } from '@/lib/ipoDetail'

const MISSING = <span className="text-muted-foreground">정보 없음</span>

function ProfileRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0 break-keep text-foreground">{children}</dd>
    </div>
  )
}

function Intro({ company, description }: { company: IpoCompanyRes; description: string }) {
  const source = ipoIntroSource(company.descriptionSource)
  const sentences = splitSentences(description)

  return (
    <div className="mb-5">
      <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
        {source.ai && <Tag>AI 요약</Tag>}
        {source.label && <span>{source.label}</span>}
        {company.descriptionRceptNo && (
          <a
            href={dartFilingUrl(company.descriptionRceptNo)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 hover:text-primary hover:underline"
          >
            {source.linkLabel}
            <ExternalLink className="size-3" strokeWidth={2} />
          </a>
        )}
      </p>
      {sentences.length > 1 ? (
        <ul className="list-disc space-y-1 pl-5 text-body leading-relaxed text-foreground break-keep [text-wrap:pretty] marker:text-foreground-tertiary">
          {sentences.map((sentence, index) => (
            <li key={`${index}-${sentence.length}`}>{sentence}</li>
          ))}
        </ul>
      ) : (
        <p className="text-body leading-relaxed text-foreground break-keep [text-wrap:pretty]">
          {sentences[0] ?? description}
        </p>
      )}
    </div>
  )
}

export function IpoCompanySection({ company }: { company: IpoCompanyRes | null }) {
  if (company === null) {
    return (
      <DetailSection id="ipo-company-title" title="기업 개요">
        <SectionNotice>증권신고서와 연결되지 않은 공모라 기업 정보가 없습니다.</SectionNotice>
      </DetailSection>
    )
  }

  const homepage = homepageUrl(company.homepage)

  return (
    <DetailSection id="ipo-company-title" title="기업 개요">
      {company.description && <Intro company={company} description={company.description} />}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-caption">
        <ProfileRow term="대표">{company.ceo ?? MISSING}</ProfileRow>
        <ProfileRow term="설립일">
          {company.establishedOn ? (
            <span className="font-mono tabular-nums">{formatFullDate(company.establishedOn)}</span>
          ) : (
            MISSING
          )}
        </ProfileRow>
        <ProfileRow term="주소">{company.address ?? MISSING}</ProfileRow>
        <ProfileRow term="홈페이지">
          {homepage ? (
            <a
              href={homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-0.5 break-all hover:text-primary hover:underline"
            >
              {company.homepage?.trim()}
              <ExternalLink className="size-3 shrink-0" strokeWidth={2} />
            </a>
          ) : (
            MISSING
          )}
        </ProfileRow>
      </dl>
    </DetailSection>
  )
}
