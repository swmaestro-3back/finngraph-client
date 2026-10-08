import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { DetailSection, SectionNotice } from '@/components/calendar/detail/DetailParts'
import type { IpoCompanyRes } from '@/lib/apiTypes'
import { formatFullDate } from '@/lib/calendar'
import { dartFilingUrl, splitSentences } from '@/lib/companyOverview'
import { homepageUrl, ipoIntroSource } from '@/lib/ipoDetail'

const MISSING = <span className="fg-cal-facts__missing">정보 없음</span>

function ProfileRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Intro({ company, description }: { company: IpoCompanyRes; description: string }) {
  const source = ipoIntroSource(company.descriptionSource)
  const sentences = splitSentences(description)

  return (
    <div className="fg-cal-intro">
      <p className="fg-cal-intro__src">
        {source.label && <span>{source.label}</span>}
        {company.descriptionRceptNo && (
          <a
            href={dartFilingUrl(company.descriptionRceptNo)}
            target="_blank"
            rel="noopener noreferrer"
            className="fg-cal-ext"
          >
            {source.linkLabel}
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
          </a>
        )}
      </p>
      {sentences.length > 1 ? (
        <ul className="fg-cal-intro__list">
          {sentences.map((sentence, index) => (
            <li key={`${index}-${sentence.length}`}>{sentence}</li>
          ))}
        </ul>
      ) : (
        <p className="fg-cal-intro__text">{sentences[0] ?? description}</p>
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
      <dl className="fg-cal-facts">
        <ProfileRow term="대표">{company.ceo ?? MISSING}</ProfileRow>
        <ProfileRow term="설립일">
          {company.establishedOn ? <span className="fg-num">{formatFullDate(company.establishedOn)}</span> : MISSING}
        </ProfileRow>
        <ProfileRow term="주소">{company.address ?? MISSING}</ProfileRow>
        <ProfileRow term="홈페이지">
          {homepage ? (
            <a href={homepage} target="_blank" rel="noopener noreferrer" className="fg-cal-ext fg-cal-ext--url">
              {company.homepage?.trim()}
              <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
            </a>
          ) : (
            MISSING
          )}
        </ProfileRow>
      </dl>
    </DetailSection>
  )
}
