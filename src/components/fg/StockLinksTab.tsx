import { useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/fg/Badge'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { EvidenceSheet } from '@/components/fg/EvidenceSheet'
import { MockBadge, NotReady } from '@/components/fg/Gap'
import { HiddenLinkList } from '@/components/fg/HiddenLinkList'
import { MemberGate } from '@/components/fg/MemberGate'
import { RelationMap } from '@/components/fg/RelationMap'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockGraphLink } from '@/components/fg/StockActions'
import type { StockDetailRes } from '@/lib/apiTypes'
import { gateScope, linkCounts, linkSummary } from '@/lib/fg/stockLinks'
import { useMemberGate } from '@/lib/memberGate'
import { useGap } from '@/lib/useGap'

const loadCompanies = import.meta.env.DEV
  ? () => import('@/dev/fixtures/stockDetail').then((m) => m.linkedCompaniesFixture)
  : null

interface StockLinksTabProps {
  stock: StockDetailRes
}

export function StockLinksTab({ stock }: StockLinksTabProps) {
  const gap = useGap('linked-companies', loadCompanies)
  const { locked, pending } = useMemberGate()
  const build = gap.status === 'mock' ? gap.data : null
  const companies = useMemo(() => (build ? build(stock.name) : null), [build, stock.name])
  const [watched, setWatched] = useState<Record<string, boolean>>({})
  const [sheetId, setSheetId] = useState<string | null>(null)
  const trigger = useRef<HTMLElement | null>(null)

  const member = !locked && !pending
  const counts = companies ? linkCounts(companies) : null
  const summary = counts ? linkSummary(stock.name, counts) : null
  const sheetCompany = member ? (companies?.find((company) => company.id === sheetId) ?? null) : null

  const openSheet = (id: string) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSheetId(id)
  }
  const toggleWatch = (id: string) => setWatched((prev) => ({ ...prev, [id]: !prev[id] }))

  let mapPart = null
  if (gap.status === 'not-ready') mapPart = <NotReady gap="linked-companies" />
  else if (gap.status === 'loading' || !companies || !counts || !summary) mapPart = <Skeleton height={320} />
  else if (counts.total === 0)
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

  const listed = companies && counts && counts.total > 0

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
              {gap.status === 'mock' && <MockBadge />}
            </span>
            <p className="fg-section__sub">뉴스엔 안 나왔지만 관계로 이어진 기업이에요</p>
          </div>
          <StockGraphLink stock={stock} />
        </div>
        {mapPart}
      </section>
      {listed && (
        <section className="fg-section" aria-labelledby="fg-hlist-title">
          {member && (
            <HiddenLinkList
              stockName={stock.name}
              companies={companies}
              watched={watched}
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
          watched={sheetCompany ? watched[sheetCompany.id] === true : false}
          onToggleWatch={() => sheetCompany && toggleWatch(sheetCompany.id)}
          returnFocusRef={trigger}
          onClose={() => setSheetId(null)}
        />
      )}
    </div>
  )
}
