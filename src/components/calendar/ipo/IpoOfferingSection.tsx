import { DetailSection, Metric, SectionNotice } from '@/components/calendar/detail/DetailParts'
import type { IpoDetailRes, IpoPutbackRes } from '@/lib/apiTypes'
import { formatPercent } from '@/lib/format'
import {
  formatOfferingAmount,
  formatShareCount,
  fundUsesNotice,
  oldShareText,
  putbackText,
  underwriterRoleLabel,
} from '@/lib/ipoDetail'
import { cn } from '@/lib/utils'

const PUTBACK_ROWS: readonly [keyof IpoPutbackRes, string][] = [
  ['price', '행사 가격'],
  ['period', '행사 기간'],
  ['investors', '행사 대상'],
  ['shares', '부여 수량'],
  ['reason', '부여 사유'],
]

function Plain({ children }: { children: string }) {
  return <span className="font-sans">{children}</span>
}

function SubHeading({ children }: { children: string }) {
  return <h4 className="mb-2 text-caption font-semibold text-foreground">{children}</h4>
}

export function IpoOfferingSection({ detail }: { detail: IpoDetailRes }) {
  const offering = detail.offering

  if (detail.filing === null) {
    return (
      <DetailSection id="ipo-offering-title" title="공모 구조">
        <SectionNotice>
          증권신고서와 연결되지 않은 공모라 공모 규모·자금 용도·주관사 분담을 보여줄 수 없습니다. 일정과 공모가는 예탁원 기준입니다.
        </SectionNotice>
      </DetailSection>
    )
  }

  const fundUses = offering.fundUses ?? []
  const fundNotice = fundUsesNotice(offering)
  const underwriters = offering.underwriters ?? []
  const putback = offering.putback
  const putbackRows = putback ? PUTBACK_ROWS.filter(([key]) => putback[key] !== null) : []

  return (
    <DetailSection id="ipo-offering-title" title="공모 구조">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Metric term="공모 총액" hint={offering.priceBasis === 'PLANNED' ? '예정가 기준' : undefined}>
          {offering.amount === null ? <Plain>미정</Plain> : formatOfferingAmount(offering.amount)}
        </Metric>
        <Metric term="공모 수량">
          {offering.shares === null ? <Plain>미정</Plain> : formatShareCount(offering.shares)}
        </Metric>
        <Metric term="공모 방법">
          <Plain>{offering.method ?? '미정'}</Plain>
        </Metric>
        <Metric term="구주매출 비중" hint="공모 주식 중 기존 주주가 파는 몫">
          {offering.oldShareRatio === null ? <Plain>{oldShareText(offering)}</Plain> : oldShareText(offering)}
        </Metric>
      </dl>

      <div className="mt-6">
        <SubHeading>자금 용도</SubHeading>
        {offering.priceBasis === 'CONFIRMED' && fundUses.length > 0 ? (
          <p className="mb-1.5 text-caption text-foreground-secondary">금액은 증권신고서(예정가) 기준입니다</p>
        ) : null}
        {fundNotice ? (
          <SectionNotice>{fundNotice}</SectionNotice>
        ) : (
          <ul className="flex flex-col text-caption">
            {fundUses.map((use) => (
              <li
                key={use.purpose}
                className="flex items-baseline gap-3 border-t border-surface-inset py-1.5 first:border-t-0"
              >
                <span className="min-w-0 flex-1 break-keep text-foreground">{use.purpose}</span>
                <span className="shrink-0 font-mono tabular-nums text-foreground">{formatOfferingAmount(use.amount)}</span>
                <span className="w-16 shrink-0 text-right font-mono tabular-nums text-foreground-secondary">
                  {use.share === null ? '—' : formatPercent(use.share)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <SubHeading>주관사 분담</SubHeading>
        {underwriters.length === 0 ? (
          <SectionNotice>증권신고서에 인수인 정보가 없습니다.</SectionNotice>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-caption sm:min-w-[480px]">
              <caption className="sr-only">인수인별 인수 수량과 금액</caption>
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th scope="col" className="py-1.5 pr-3 font-medium">증권사</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">구분</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">인수 수량</th>
                  <th scope="col" className="py-1.5 pr-3 text-right font-medium">인수 금액</th>
                  <th scope="col" className="hidden py-1.5 font-medium sm:table-cell">방식</th>
                </tr>
              </thead>
              <tbody>
                {underwriters.map((underwriter, index) => (
                  <tr key={`${index}-${underwriter.name}`} className="border-t border-surface-inset">
                    <td className="py-1.5 pr-3 break-keep text-foreground">{underwriter.name}</td>
                    <td className="py-1.5 pr-3 text-foreground-secondary">
                      {underwriterRoleLabel(underwriter.role)}
                      {underwriter.method && (
                        <span className="mt-0.5 block text-muted-foreground sm:hidden">{underwriter.method}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-foreground">
                      {underwriter.shares === null ? '—' : formatShareCount(underwriter.shares)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-foreground">
                      {underwriter.amount === null ? '—' : formatOfferingAmount(underwriter.amount)}
                    </td>
                    <td className="hidden py-1.5 text-foreground-secondary sm:table-cell">{underwriter.method ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {putbackRows.length > 0 && putback && (
        <div className="mt-6">
          <SubHeading>환매청구권</SubHeading>
          <p className="mb-2 text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
            상장 뒤 주가가 정해진 가격 아래로 내려가면 일반청약자가 주관사에 주식을 되팔 수 있는 권리입니다.
          </p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-caption">
            {putbackRows.map(([key, term]) => {
              const value = putbackText(key, putback[key] ?? '')
              return (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{term}</dt>
                  <dd className={cn('break-keep text-foreground', value.numeric && 'font-mono tabular-nums')}>{value.text}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </DetailSection>
  )
}
