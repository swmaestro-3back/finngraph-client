import { useRef, useState } from 'react'
import { Badge } from '@/components/fg/Badge'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { EvidenceSheet } from '@/components/fg/EvidenceSheet'
import { HiddenLinkList } from '@/components/fg/HiddenLinkList'
import { MemberGate } from '@/components/fg/MemberGate'
import { RelationMap } from '@/components/fg/RelationMap'
import { QuoteRetryNote } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockGraphLink } from '@/components/fg/StockActions'
import type { StockDetailRes } from '@/lib/apiTypes'
import { kstToday } from '@/lib/calendar'
import { gateScope, linkCounts, linkSummary, type LinkedCompany } from '@/lib/fg/stockLinks'
import { useFavoriteToggles } from '@/lib/fg/useFavoriteToggle'
import { useMemberGate } from '@/lib/memberGate'
import { useEvidenceView, type LinkedCompaniesState } from '@/lib/queries/useLinkedCompanies'

interface StockLinksTabProps {
  stock: StockDetailRes
  linked: LinkedCompaniesState
}

export function StockLinksTab({ stock, linked }: StockLinksTabProps) {
  const { locked, pending } = useMemberGate()
  const watch = useFavoriteToggles('STOCK')
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [today] = useState(() => kstToday(new Date()))
  const trigger = useRef<HTMLElement | null>(null)

  const member = !locked && !pending
  const companies = linked.list
  const counts = companies ? linkCounts(companies) : null
  const summary = counts ? linkSummary(stock.name, counts) : null
  const sheetCompany = member ? (companies?.find((company) => company.id === sheetId) ?? null) : null
  const evidence = useEvidenceView(sheetCompany, today)

  const openSheet = (id: string) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSheetId(id)
  }
  const watchedOf = (company: LinkedCompany) => (company.code ? watch.isActive(company.code) : null)
  const toggleWatch = (company: LinkedCompany) => {
    if (company.code) watch.press(company.code)
  }

  let mapPart
  if (linked.error && !companies)
    mapPart = (
      <StateBlock
        kind="error"
        title="이어진 기업을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={linked.retry}>
            다시 시도
          </Button>
        }
      />
    )
  else if (!companies || !counts || !summary) mapPart = <Skeleton height={320} />
  else if (companies.length === 0)
    mapPart = <StateBlock kind="empty" title="아직 이어진 기업이 없어요" description="관계가 새로 확인되면 여기에 보여 드려요" />
  else
    mapPart = (
      <>
        <p className="fg-slt__sum">
          <b>{summary.lead}</b>
          {summary.rest}
        </p>
        {pending && <Skeleton height={280} />}
        {member && (
          <>
            <RelationMap name={stock.name} price={stock.price} change={stock.change} companies={companies} onOpen={openSheet} />
            <div className="fg-rlegend">
              <span>
                <i aria-hidden="true" />
                공시·사업보고서로 확인된 관계
              </span>
              <span>
                <i className="is-inferred" aria-hidden="true" />
                AI가 기사에서 찾은 관계
              </span>
              <span>기업을 누르면 근거를 볼 수 있어요</span>
            </div>
          </>
        )}
      </>
    )

  const listed = companies && counts && companies.length > 0

  return (
    <div className="fg-col fg-slt fg-reveal">
      <section className="fg-section" aria-labelledby="fg-slt-title">
        <div className="fg-section__head">
          <div className="fg-sev__titles">
            <span className="fg-sev__title">
              <h2 id="fg-slt-title" className="fg-section__title">
                이런 기업은 어때요?
              </h2>
              <Badge tone="inferred">AI 추론</Badge>
            </span>
            <p className="fg-section__sub">뉴스엔 안 나왔지만 관계로 이어진 기업이에요</p>
          </div>
          <StockGraphLink stock={stock} />
        </div>
        {mapPart}
      </section>
      {listed && (
        <section className="fg-section" aria-labelledby="fg-hlist-title">
          {member && linked.quotesRetry && <QuoteRetryNote onRetry={linked.quotesRetry} />}
          {member && (
            <HiddenLinkList
              stockName={stock.name}
              companies={companies}
              watchedOf={watchedOf}
              onToggleWatch={toggleWatch}
              onOpen={openSheet}
            />
          )}
          {pending && (
            <>
              <h2 id="fg-hlist-title" className="fg-sr">
                이어진 기업 목록
              </h2>
              <Skeleton height={280} />
            </>
          )}
          {locked && (
            <>
              <h2 id="fg-hlist-title" className="fg-sr">
                이어진 기업 목록
              </h2>
              <MemberGate subject={`이런 기업 ${counts.total}곳`} scope={gateScope(counts)} className="fg-slt__gate" />
            </>
          )}
        </section>
      )}
      {listed && <Disclaimer />}
      {companies && (
        <EvidenceSheet
          stockName={stock.name}
          company={sheetCompany}
          evidence={evidence}
          watched={sheetCompany ? watchedOf(sheetCompany) : null}
          onToggleWatch={() => sheetCompany && toggleWatch(sheetCompany)}
          returnFocusRef={trigger}
          onClose={() => setSheetId(null)}
        />
      )}
    </div>
  )
}
