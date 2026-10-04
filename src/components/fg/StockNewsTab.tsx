import { ExternalLink } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { DisclosureList } from '@/components/fg/DisclosureList'
import { MockBadge, NotReady } from '@/components/fg/Gap'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockIssueFlows } from '@/components/fg/StockIssueFlows'
import { StockNewsList } from '@/components/fg/StockNewsList'
import type { CandleRes, StockDetailRes } from '@/lib/apiTypes'
import { placeDisclosures } from '@/lib/fg/disclosures'
import { issueFlows } from '@/lib/fg/stockFlows'
import { shortDate, type PlacedIssue } from '@/lib/fg/stockIssues'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useGap, type GapState } from '@/lib/useGap'

const loadDisclosures = import.meta.env.DEV
  ? () => import('@/dev/fixtures/stockDetail').then((m) => m.stockDisclosuresFixture)
  : null

export type IssueMode = GapState<unknown>['status']

interface StockNewsTabProps {
  stock: StockDetailRes
  candles: CandleRes[] | null
  candlesFailed: boolean
  onRetryCandles: () => void
  issueMode: IssueMode
  placed: readonly PlacedIssue[] | null
  today: string
  refreshKey: number
  onOpenIssue: (key: string) => void
  onOpenNews: (id: string) => void
}

function FlowsHead({ mock }: { mock: boolean }) {
  return (
    <div className="fg-section__head">
      <span className="fg-sev__title">
        <h2 id="fg-sfl-title" className="fg-section__title">
          이 종목이 나온 이슈 흐름
        </h2>
        {mock && <MockBadge />}
      </span>
    </div>
  )
}

export function StockNewsTab({
  stock,
  candles,
  candlesFailed,
  onRetryCandles,
  issueMode,
  placed,
  today,
  refreshKey,
  onOpenIssue,
  onOpenNews,
}: StockNewsTabProps) {
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
  const flowsWaiting = useDelayed(issueMode !== 'not-ready' && flows === null && !candlesFailed)

  let flowPart: ReactNode
  if (issueMode === 'not-ready') {
    flowPart = (
      <section className="fg-section" aria-labelledby="fg-sfl-title">
        <FlowsHead mock={false} />
        <NotReady gap="stock-issues" />
      </section>
    )
  } else if (flows && candles) {
    flowPart = (
      <StockIssueFlows stockName={stock.name} flows={flows} candles={candles} today={today} onOpenIssue={onOpenIssue} />
    )
  } else if (candlesFailed) {
    flowPart = (
      <section className="fg-section" aria-labelledby="fg-sfl-title">
        <FlowsHead mock />
        <StateBlock
          kind="error"
          title="주가를 불러오지 못했어요"
          description="이슈 흐름은 주가와 함께 보여 드려요 · 잠시 후 다시 시도해 주세요"
          action={
            <Button size="sm" onClick={onRetryCandles}>
              다시 시도
            </Button>
          }
        />
      </section>
    )
  } else {
    flowPart = <div aria-hidden="true">{flowsWaiting && <Skeleton height={420} shape="card" />}</div>
  }

  return (
    <div className="fg-grid fg-reveal">
      <div className="fg-col">
        {flowPart}
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
