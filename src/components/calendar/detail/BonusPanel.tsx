import { DetailSection, Metric, SectionNotice, SignedPercent } from '@/components/calendar/detail/DetailParts'
import { ExPriceMetric } from '@/components/calendar/detail/ExPriceMetric'
import type { CorporateActionRes } from '@/lib/apiTypes'
import { formatSharesPerShare, stepState } from '@/lib/calendar'

export function BonusPanel({ action, today }: { action: CorporateActionRes; today: string }) {
  const bonus = action.bonus
  const ex = action.steps.find((step) => step.kind === 'BONUS_EX') ?? null
  const waiting = ex !== null && stepState(ex, today) === 'past' ? '집계 중' : '권리락 후 계산'

  return (
    <DetailSection id="bonus-panel-title" title="무상증자">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Metric term="배정 비율">{action.ratio === null ? '미정' : formatSharesPerShare(action.ratio)}</Metric>
        {bonus && (
          <>
            <ExPriceMetric exPrice={bonus.exPrice} inputsMissing={action.ratio === null} />
            <Metric term="권리락 후 5거래일">
              <SignedPercent value={bonus.returnAfter5} fallback={waiting} />
            </Metric>
            <Metric term="권리락 후 20거래일">
              <SignedPercent value={bonus.returnAfter20} fallback={waiting} />
            </Metric>
          </>
        )}
      </dl>
      {bonus ? (
        <p className="mt-3 text-caption leading-relaxed text-muted-foreground break-keep">
          수익률은 권리락일을 1일째로 세어 5·20번째 거래일 종가를 권리락 이론가와 비교한 값입니다.
        </p>
      ) : (
        <div className="mt-4">
          <SectionNotice>권리락 일정이 없어 이론가와 권리락 후 수익률을 계산하지 않았습니다.</SectionNotice>
        </div>
      )}
    </DetailSection>
  )
}
