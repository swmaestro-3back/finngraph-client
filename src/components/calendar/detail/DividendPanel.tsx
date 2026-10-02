import {
  DetailSection,
  InlineSkeleton,
  Metric,
  NoteBadge,
  SectionNotice,
  SkeletonRows,
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
import { changeColorClass, formatChange, formatPercent, formatWon } from '@/lib/format'
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
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
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
      </dl>

      <div className="mt-6">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 className="text-caption font-semibold text-foreground">배당락 반응 기록</h4>
          {!historyPending && !history.error && recovery && (
            <p className="font-mono text-caption tabular-nums text-foreground-secondary">{recovery}</p>
          )}
        </div>
        {historyPending ? (
          <SkeletonRows count={3} />
        ) : history.error ? (
          <SectionNotice>배당락 반응 기록을 불러오지 못했습니다. 다른 정보는 그대로 볼 수 있습니다.</SectionNotice>
        ) : rows.length === 0 ? (
          <SectionNotice>계산할 지난 배당 기록이 없습니다.</SectionNotice>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-caption sm:min-w-[520px]">
              <caption className="sr-only">회차별 배당락 반응</caption>
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th scope="col" className="py-1.5 pr-2 font-medium sm:pr-3">기준일</th>
                  <th scope="col" className="hidden py-1.5 pr-3 font-medium sm:table-cell">구분</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium sm:pr-3">주당배당금</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium sm:pr-3">이론 낙폭</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium sm:pr-3">시초 갭</th>
                  <th scope="col" className="py-1.5 text-right font-medium">회복</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.recordDate}|${row.kind}`} className="border-t border-surface-inset">
                    <td className="py-1.5 pr-2 font-mono tabular-nums text-foreground sm:pr-3">
                      {formatFullDate(row.recordDate)}
                      <span className="block font-sans text-micro text-muted-foreground sm:hidden">{row.kind}</span>
                    </td>
                    <td className="hidden py-1.5 pr-3 text-foreground-secondary sm:table-cell">{row.kind}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground sm:pr-3">{formatWon(row.dps)}</td>
                    <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-foreground sm:pr-3">
                      {formatPercent(row.theoreticalDrop)}
                    </td>
                    <td className={cn('py-1.5 pr-2 text-right font-mono tabular-nums sm:pr-3', changeColorClass(row.openGap))}>
                      {formatChange(row.openGap)}
                    </td>
                    <td className={cn('py-1.5 text-right', row.pending ? 'text-muted-foreground' : 'text-foreground')}>
                      {recoveryLabel(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!historyPending && !history.error && rows.length > 0 && (
          <p className="mt-2 text-caption leading-relaxed text-muted-foreground break-keep [text-wrap:pretty]">
            이론 낙폭은 주당배당금 ÷ 배당락 전날 종가, 시초 갭은 배당락일 시가가 전날 종가와 벌어진 정도입니다. 회복은 배당락일을 1일째로 세어 종가가 전날 종가를 되찾은 날입니다.
          </p>
        )}
      </div>
    </DetailSection>
  )
}
