import {
  DetailNote,
  DetailSection,
  InlineSkeleton,
  Metric,
  Metrics,
  NoteBadge,
  SectionNotice,
  SkeletonRows,
  SubSection,
} from '@/components/calendar/detail/DetailParts'
import type { CorporateActionRes } from '@/lib/apiTypes'
import {
  formatFullDate,
  formatRecoverySummary,
  latestPayoutRatio,
  metricText,
  recoveryLabel,
  summarizeRecovery,
} from '@/lib/calendar'
import { formatChange, formatPercent, formatWon } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import { useDividendHistory } from '@/lib/queries/useDividendHistory'
import { useFinancials } from '@/lib/queries/useFinancials'
import { cn } from '@/lib/utils'

interface DividendPanelProps {
  ticker: string
  action: CorporateActionRes
  price: number | null
}

export function DividendPanel({ ticker, action, price }: DividendPanelProps) {
  const history = useDividendHistory(ticker)
  const financials = useFinancials(ticker)
  const dps = action.dividend?.dps ?? null
  const previous = action.dividend?.dpsBasis === 'PREVIOUS'
  const rows = history.data ?? []
  const historyPending = history.loading || (history.data === null && history.error === null)
  const financialsPending = financials.loading || (financials.data === null && financials.error === null)
  const payout = latestPayoutRatio(financials.data ?? [])
  const recovery = formatRecoverySummary(summarizeRecovery(rows))

  return (
    <DetailSection id="dividend-panel-title" title="배당">
      <Metrics columns={3}>
        <Metric
          term="이번 주당배당금"
          hint={previous ? '이번 금액이 아직 없어 지난번 같은 종류 배당으로 계산했습니다' : undefined}
        >
          {metricText(dps, formatWon, dps === null)}
          {previous && <NoteBadge>지난번 기준</NoteBadge>}
        </Metric>
        <Metric
          term="이번 배당 수익률"
          hint={price === null ? '현재가가 없어 계산하지 못했습니다' : `현재가 ${formatWon(price)} 기준`}
        >
          {metricText(action.dividend?.expectedYield ?? null, formatPercent, dps === null)}
        </Metric>
        <Metric
          term="최근 연도 배당성향"
          hint={
            financialsPending
              ? undefined
              : financials.error
                ? '재무 정보를 불러오지 못했습니다'
                : payout
                  ? `${payout.year}년 재무 기준`
                  : '확정 재무에 배당성향이 없습니다'
          }
        >
          {financialsPending ? <InlineSkeleton /> : payout ? formatPercent(payout.value) : '—'}
        </Metric>
      </Metrics>

      <SubSection
        title="배당락 반응 기록"
        aside={
          !historyPending &&
          !history.error &&
          recovery && <span className="fg-cal-dsub__aside fg-num">{recovery}</span>
        }
      >
        {historyPending ? (
          <SkeletonRows count={3} />
        ) : history.error ? (
          <SectionNotice>배당락 반응 기록을 불러오지 못했습니다. 다른 정보는 그대로 볼 수 있습니다.</SectionNotice>
        ) : rows.length === 0 ? (
          <SectionNotice>계산할 지난 배당 기록이 없습니다.</SectionNotice>
        ) : (
          <div className="fg-cal-table-wrap">
            <table className="fg-cal-table">
              <caption className="fg-sr">회차별 배당락 반응</caption>
              <thead>
                <tr>
                  <th scope="col">기준일</th>
                  <th scope="col" className="fg-cal-table__left fg-cal-table__wide">
                    구분
                  </th>
                  <th scope="col">주당배당금</th>
                  <th scope="col">이론 낙폭</th>
                  <th scope="col">시초 갭</th>
                  <th scope="col">회복</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.recordDate}|${row.kind}`}>
                    <td>
                      {formatFullDate(row.recordDate)}
                      <span className="fg-cal-table__sub">{row.kind}</span>
                    </td>
                    <td className="fg-cal-table__left fg-cal-table__wide fg-cal-table__muted">{row.kind}</td>
                    <td>{formatWon(row.dps)}</td>
                    <td>{formatPercent(row.theoreticalDrop)}</td>
                    <td className={toneClass(row.openGap)}>{formatChange(row.openGap)}</td>
                    <td className={cn('fg-cal-table__wrap', row.pending && 'fg-cal-table__muted')}>{recoveryLabel(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!historyPending && !history.error && rows.length > 0 && (
          <DetailNote>
            이론 낙폭은 주당배당금 ÷ 배당락 전날 종가, 시초 갭은 배당락일 시가가 전날 종가와 벌어진 정도입니다. 회복은 배당락일을 1일째로 세어 종가가 전날 종가를 되찾은 날입니다.
          </DetailNote>
        )}
      </SubSection>
    </DetailSection>
  )
}
