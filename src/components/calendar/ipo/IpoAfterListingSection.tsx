import { DetailSection, Metric, SectionNotice, SignedPercent } from '@/components/calendar/detail/DetailParts'
import type { IpoDetailRes } from '@/lib/apiTypes'
import { formatFullDate } from '@/lib/calendar'
import { formatWon } from '@/lib/format'
import { ipoPriceText } from '@/lib/ipoDetail'
import { formatShortDate } from '@/lib/themeMetrics'

export function IpoAfterListingSection({ detail }: { detail: Pick<IpoDetailRes, 'afterListing' | 'offering'> }) {
  const after = detail.afterListing

  return (
    <DetailSection id="ipo-after-title" title="상장 후 성과">
      {after === null ? (
        <SectionNotice>상장 후 시세가 아직 반영되지 않았습니다.</SectionNotice>
      ) : (
        <>
          <p className="-mt-1 mb-3 text-caption text-muted-foreground break-keep">
            공모가 <span className="font-mono tabular-nums">{ipoPriceText(detail.offering.price)}</span> 대비 ·{' '}
            <span className="font-mono tabular-nums">{formatFullDate(after.listingDate)}</span> 상장
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Metric term="시초가">
              {formatWon(after.open)}
              <SignedPercent value={after.openReturn} fallback="—" />
            </Metric>
            <Metric term="상장일 종가">
              {formatWon(after.close)}
              <SignedPercent value={after.closeReturn} fallback="—" />
            </Metric>
            <Metric term="현재가" hint={after.priceDate ? `${formatShortDate(after.priceDate)} 기준` : undefined}>
              {after.price === null ? '—' : formatWon(after.price)}
              <SignedPercent value={after.currentReturn} fallback="—" />
            </Metric>
          </dl>
        </>
      )}
    </DetailSection>
  )
}
