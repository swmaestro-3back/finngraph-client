import {
  DetailNote,
  DetailSection,
  Metric,
  Metrics,
  SectionNotice,
  SubSection,
} from '@/components/calendar/detail/DetailParts'
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
      <Metrics columns={4}>
        <Metric term="공모 총액" hint={offering.priceBasis === 'PLANNED' ? '예정가 기준' : undefined}>
          {offering.amount === null ? '미정' : formatOfferingAmount(offering.amount)}
        </Metric>
        <Metric term="공모 수량">{offering.shares === null ? '미정' : formatShareCount(offering.shares)}</Metric>
        <Metric term="공모 방법">{offering.method ?? '미정'}</Metric>
        <Metric term="구주매출 비중" hint="공모 주식 중 기존 주주가 파는 몫">
          {oldShareText(offering)}
        </Metric>
      </Metrics>

      <SubSection title="자금 용도">
        {offering.priceBasis === 'CONFIRMED' && fundUses.length > 0 ? (
          <DetailNote>금액은 증권신고서(예정가) 기준입니다</DetailNote>
        ) : null}
        {fundNotice ? (
          <SectionNotice>{fundNotice}</SectionNotice>
        ) : (
          <ul className="fg-cal-rows">
            {fundUses.map((use) => (
              <li key={use.purpose}>
                <span className="fg-cal-rows__name">{use.purpose}</span>
                <span className="fg-cal-rows__num fg-num">{formatOfferingAmount(use.amount)}</span>
                <span className="fg-cal-rows__share fg-num">{use.share === null ? '—' : formatPercent(use.share)}</span>
              </li>
            ))}
          </ul>
        )}
      </SubSection>

      <SubSection title="주관사 분담">
        {underwriters.length === 0 ? (
          <SectionNotice>증권신고서에 인수인 정보가 없습니다.</SectionNotice>
        ) : (
          <div className="fg-cal-table-wrap">
            <table className="fg-cal-table">
              <caption className="fg-sr">인수인별 인수 수량과 금액</caption>
              <thead>
                <tr>
                  <th scope="col">증권사</th>
                  <th scope="col" className="fg-cal-table__left">
                    구분
                  </th>
                  <th scope="col">인수 수량</th>
                  <th scope="col">인수 금액</th>
                  <th scope="col" className="fg-cal-table__left fg-cal-table__wide">
                    방식
                  </th>
                </tr>
              </thead>
              <tbody>
                {underwriters.map((underwriter, index) => (
                  <tr key={`${index}-${underwriter.name}`}>
                    <td className="fg-cal-table__wrap">{underwriter.name}</td>
                    <td className="fg-cal-table__left fg-cal-table__muted">
                      {underwriterRoleLabel(underwriter.role)}
                      {underwriter.method && <span className="fg-cal-table__sub">{underwriter.method}</span>}
                    </td>
                    <td>{underwriter.shares === null ? '—' : formatShareCount(underwriter.shares)}</td>
                    <td>{underwriter.amount === null ? '—' : formatOfferingAmount(underwriter.amount)}</td>
                    <td className="fg-cal-table__left fg-cal-table__wide fg-cal-table__muted">
                      {underwriter.method ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SubSection>

      {putbackRows.length > 0 && putback && (
        <SubSection title="환매청구권">
          <DetailNote>
            상장 뒤 주가가 정해진 가격 아래로 내려가면 일반청약자가 주관사에 주식을 되팔 수 있는 권리입니다.
          </DetailNote>
          <dl className="fg-cal-facts">
            {putbackRows.map(([key, term]) => {
              const value = putbackText(key, putback[key] ?? '')
              return (
                <div key={key}>
                  <dt>{term}</dt>
                  <dd className={cn(value.numeric && 'fg-num')}>{value.text}</dd>
                </div>
              )
            })}
          </dl>
        </SubSection>
      )}
    </DetailSection>
  )
}
