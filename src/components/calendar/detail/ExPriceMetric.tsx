import { Metric, NoteBadge } from '@/components/calendar/detail/DetailParts'
import type { ExPriceRes } from '@/lib/apiTypes'
import { EX_PRICE_BASIS_LABELS, exPriceMissing, metricText } from '@/lib/calendar'
import { formatWon } from '@/lib/format'

export function ExPriceMetric({ exPrice, inputsMissing }: { exPrice: ExPriceRes; inputsMissing: boolean }) {
  const confirmed = exPrice.basis === 'PREVIOUS_CLOSE'

  return (
    <Metric
      term="권리락 이론가"
      hint={
        <>
          {EX_PRICE_BASIS_LABELS[exPrice.basis]}
          {confirmed && exPrice.actualOpen !== null && (
            <>
              {' · 실제 시초가 '}
              <span className="font-mono tabular-nums text-foreground-secondary">{formatWon(exPrice.actualOpen)}</span>
            </>
          )}
        </>
      }
    >
      {metricText(exPrice.theoretical, formatWon, exPriceMissing(exPrice.basis, inputsMissing))}
      {!confirmed && <NoteBadge>참고</NoteBadge>}
    </Metric>
  )
}
