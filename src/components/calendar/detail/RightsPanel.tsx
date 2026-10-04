import { DetailSection, Metric, NoteBadge, SectionNotice } from '@/components/calendar/detail/DetailParts'
import { ExPriceMetric } from '@/components/calendar/detail/ExPriceMetric'
import type { CorporateActionRes } from '@/lib/apiTypes'
import { formatDateSpan, formatSharesPerShare, metricText } from '@/lib/calendar'
import { formatChange, formatPercent, formatWon } from '@/lib/format'

export function RightsPanel({ action }: { action: CorporateActionRes }) {
  const rights = action.rights
  const subscribe = action.steps.find((step) => step.kind === 'RIGHTS_SUBSCRIBE') ?? null
  const issuePrice = rights ? rights.issuePrice : action.amount
  const issueMissing = issuePrice === null
  const ratioMissing = action.ratio === null
  const belowIssue = rights !== null && rights.priceVsIssue !== null && rights.priceVsIssue < 0

  return (
    <DetailSection id="rights-panel-title" title="유상증자">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Metric term="발행가">{metricText(issuePrice, formatWon, issueMissing)}</Metric>
        <Metric term="배정 비율">{action.ratio === null ? '미정' : formatSharesPerShare(action.ratio)}</Metric>
        <Metric term="청약 기간">{subscribe ? formatDateSpan(subscribe.date, subscribe.endDate) : '미정'}</Metric>
        {rights && (
          <>
            <Metric term="희석률" hint="주주배정이라고 보고 계산했습니다">
              {metricText(rights.dilution, formatPercent, ratioMissing)}
            </Metric>
            <Metric term="발행가 대비 현재가">{metricText(rights.priceVsIssue, formatChange, issueMissing)}</Metric>
            <ExPriceMetric exPrice={rights.exPrice} inputsMissing={issueMissing || ratioMissing} />
          </>
        )}
      </dl>
      {belowIssue && (
        <p role="note" className="mt-4 flex items-baseline gap-2 text-caption leading-relaxed text-foreground-secondary break-keep">
          <NoteBadge>주의</NoteBadge>
          <span>현재가가 발행가보다 낮습니다. 지금 가격으로는 청약가가 시장 가격보다 비쌉니다.</span>
        </p>
      )}
      {!rights && (
        <div className="mt-4">
          <SectionNotice>
            권리락 일정이 없는 유상증자라 희석률·발행가 대비 현재가·권리락 이론가를 계산하지 않았습니다.
          </SectionNotice>
        </div>
      )}
    </DetailSection>
  )
}
