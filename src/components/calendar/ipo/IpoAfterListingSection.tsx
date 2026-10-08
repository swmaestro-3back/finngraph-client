import {
  DetailNote,
  DetailSection,
  Metric,
  Metrics,
  SectionNotice,
  SignedPercent,
} from '@/components/calendar/detail/DetailParts'
import type { IpoDetailRes } from '@/lib/apiTypes'
import { formatFullDate } from '@/lib/calendar'
import { formatWon } from '@/lib/format'
import { ipoPriceText } from '@/lib/ipoDetail'
import { formatMonthDay } from '@/lib/themeMetrics'

export function IpoAfterListingSection({ detail }: { detail: Pick<IpoDetailRes, 'afterListing' | 'offering'> }) {
  const after = detail.afterListing

  return (
    <DetailSection id="ipo-after-title" title="상장 후 성과">
      {after === null ? (
        <SectionNotice>상장 후 시세가 아직 반영되지 않았습니다.</SectionNotice>
      ) : (
        <>
          <DetailNote className="fg-cal-dsec__lead fg-num">
            공모가 {ipoPriceText(detail.offering.price)} 대비 · {formatFullDate(after.listingDate)} 상장
          </DetailNote>
          <Metrics columns={3}>
            <Metric term="시초가">
              {formatWon(after.open)}
              <SignedPercent value={after.openReturn} fallback="—" />
            </Metric>
            <Metric term="상장일 종가">
              {formatWon(after.close)}
              <SignedPercent value={after.closeReturn} fallback="—" />
            </Metric>
            <Metric term="현재가" hint={after.priceDate ? `${formatMonthDay(after.priceDate)} 기준` : undefined}>
              {after.price === null ? '—' : formatWon(after.price)}
              <SignedPercent value={after.currentReturn} fallback="—" />
            </Metric>
          </Metrics>
        </>
      )}
    </DetailSection>
  )
}
