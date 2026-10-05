import { ExternalLink } from 'lucide-react'
import { useMemo } from 'react'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { DisclosureList } from '@/components/fg/DisclosureList'
import { MockBadge, NotReady } from '@/components/fg/Gap'
import { Skeleton } from '@/components/fg/Skeleton'
import { StockIssueCards, type StockIssueState } from '@/components/fg/StockIssueCards'
import { StockIssueFlows } from '@/components/fg/StockIssueFlows'
import { StockNewsList } from '@/components/fg/StockNewsList'
import type { CandleRes, StockDetailRes } from '@/lib/apiTypes'
import { placeDisclosures } from '@/lib/fg/disclosures'
import { issueFlows } from '@/lib/fg/stockFlows'
import { shortDate, type PlacedIssue } from '@/lib/fg/stockIssues'
import { useGap } from '@/lib/useGap'

const loadDisclosures = import.meta.env.DEV
  ? () => import('@/dev/fixtures/stockDetail').then((m) => m.stockDisclosuresFixture)
  : null

interface StockNewsTabProps {
  stock: StockDetailRes
  candles: CandleRes[] | null
  issues: StockIssueState
  placed: readonly PlacedIssue[] | null
  today: string
  refreshKey: number
  onOpenIssue: (key: string) => void
  onOpenNews: (id: string) => void
}

export function StockNewsTab({ stock, candles, issues, placed, today, refreshKey, onOpenIssue, onOpenNews }: StockNewsTabProps) {
  const disclosures = useGap('disclosures', loadDisclosures)
  const flows = useMemo(() => (placed && candles ? issueFlows(placed, candles, today) : null), [placed, candles, today])
  const lastDate = candles && candles.length > 0 ? candles[candles.length - 1].date : null
  const disclosureData = disclosures.status === 'mock' ? disclosures.data : null
  const disclosureRows = useMemo(
    () =>
      disclosureData
        ? placeDisclosures(disclosureData, lastDate).map((row) => ({ ...row, date: shortDate(row.date), sub: row.summary }))
        : [],
    [disclosureData, lastDate],
  )
  return (
    <div className="fg-grid fg-reveal">
      <div className="fg-col">
        {flows && candles && (
          <StockIssueFlows stockName={stock.name} flows={flows} candles={candles} today={today} onOpenIssue={onOpenIssue} />
        )}
        <StockIssueCards key={stock.ticker} ticker={stock.ticker} issues={issues} today={today} />
        <StockNewsList
          ticker={stock.ticker}
          candles={candles}
          today={today}
          refreshKey={refreshKey}
          onOpenNews={onOpenNews}
        />
      </div>
      <aside className="fg-rail" aria-label="최근 공시">
        <section className="fg-section fg-sdisc" aria-labelledby="fg-sdisc-title">
          <div className="fg-sdisc__head">
            <span className="fg-sev__title">
              <h2 id="fg-sdisc-title" className="fg-section__title">
                최근 공시
              </h2>
              {disclosures.status === 'mock' && <MockBadge />}
            </span>
            <span className="fg-sdisc__cap">금융감독원 전자공시 원문으로 연결돼요</span>
          </div>
          {disclosures.status === 'not-ready' && <NotReady gap="disclosures" />}
          {disclosures.status === 'loading' && <Skeleton height={240} />}
          {disclosureData && (
            <>
              <DisclosureList label="최근 공시" items={disclosureRows} />
              <a className="fg-sdmore fg-sdisc__all" href={disclosureData.listUrl} target="_blank" rel="noopener noreferrer">
                전자공시에서 모두 보기
                <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </>
          )}
        </section>
        <Disclaimer />
      </aside>
    </div>
  )
}
