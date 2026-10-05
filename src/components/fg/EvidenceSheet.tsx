import { ExternalLink } from 'lucide-react'
import { Fragment, type ReactNode, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { GapBar, StrengthBars } from '@/components/fg/HiddenLinkList'
import { ChangeText } from '@/components/fg/PriceChange'
import { RetryText } from '@/components/fg/RetryText'
import { SideSheet } from '@/components/fg/SideSheet'
import { Skeleton } from '@/components/fg/Skeleton'
import { Week52GapText } from '@/components/fg/StockLinkedRail'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import { STRENGTH_LABEL } from '@/lib/fg/stockDetail'
import { evidenceCountLabel, hasQuote, LINK_TYPE_LABEL, type LinkedCompany, type LinkEvidence } from '@/lib/fg/stockLinks'
import { fromState } from '@/lib/navigation'

export type EvidenceView =
  | { status: 'ready'; items: readonly LinkEvidence[] }
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }

const QUOTE_LABEL = '근거 문장 · 원문 그대로 인용했어요'
const PLAIN_LABEL = '근거 문장'

export function IssuePathLead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <span className="fg-rpath__node fg-rpath__node--event">
        <i className="fg-rpath__dia" aria-hidden="true" />
        {title}
      </span>
      <span className="fg-rpath__seg">
        <span className="fg-rpath__line" aria-hidden="true" />
        {children}
      </span>
    </>
  )
}

function EvidenceQuotes({ items }: { items: readonly LinkEvidence[] }) {
  if (items.length === 0) return <p className="fg-esheet__empty">근거 문장을 아직 불러올 수 없어요</p>
  return (
    <>
      {items.map((evidence, i) => (
        <figure key={`${evidence.source}-${i}`} className="fg-ev">
          <blockquote className="fg-quote">{`“${evidence.quote}”`}</blockquote>
          <figcaption className="fg-ev__src fg-esheet__evsrc">
            {evidence.kind === 'disclosure' && <Badge>공시</Badge>}
            {evidence.tags?.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            <span>{`${evidence.source} · ${evidence.date}`}</span>
            {evidence.url && (
              <a href={evidence.url} target="_blank" rel="noopener noreferrer">
                {evidence.kind === 'disclosure' ? '공시 원문' : '기사 원문'}
                <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
              </a>
            )}
          </figcaption>
        </figure>
      ))}
    </>
  )
}

function evidenceLabel(items: readonly LinkEvidence[]): string {
  return items.length > 0 && items.every((item) => item.verbatim !== false) ? QUOTE_LABEL : PLAIN_LABEL
}

function EvidenceBody({ view }: { view: EvidenceView }) {
  let body: ReactNode
  if (view.status === 'ready') body = <EvidenceQuotes items={view.items} />
  else if (view.status === 'loading') body = <Skeleton height={120} />
  else
    body = (
      <p className="fg-esheet__note" role="status">
        <span>근거 문장을 불러오지 못했어요</span>
        <RetryText subject="근거 문장" onRetry={view.retry} />
      </p>
    )
  return (
    <div className="fg-esheet__quotes" aria-busy={view.status === 'loading' || undefined}>
      <span className="fg-esheet__label">{view.status === 'ready' ? evidenceLabel(view.items) : PLAIN_LABEL}</span>
      {body}
    </div>
  )
}

interface EvidenceSheetProps {
  stockName: string
  lead?: string | null
  company: LinkedCompany | null
  evidence?: EvidenceView | null
  watched: boolean | null
  onToggleWatch: () => void
  returnFocusRef: RefObject<HTMLElement | null>
  onClose: () => void
}

export function EvidenceSheet({
  stockName,
  lead = null,
  company,
  evidence = null,
  watched,
  onToggleWatch,
  returnFocusRef,
  onClose,
}: EvidenceSheetProps) {
  const { pathname, search } = useLocation()
  const view: EvidenceView | null = company ? (evidence ?? { status: 'ready', items: company.evidence }) : null
  return (
    <SideSheet
      open={company !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      closeLabel="근거 닫기"
      returnFocusRef={returnFocusRef}
      title={company?.title ?? ''}
      meta={
        company && (
          <span className="fg-esheet__kicker">
            <Badge tone="inferred">AI 추론</Badge>
            <span>{evidenceCountLabel(company)}</span>
          </span>
        )
      }
    >
      {company && view && (
        <>
          <div className="fg-rpath" role="group" aria-label="관계 경로">
            {lead ? (
              <IssuePathLead title={lead}>
                <span className="fg-rpath__node">{stockName}</span>
              </IssuePathLead>
            ) : (
              <span className="fg-rpath__node">{stockName}</span>
            )}
            {company.hops.map((hop, i) => (
              <Fragment key={`${hop.node}-${i}`}>
                <span className="fg-rpath__edge" data-kind={(hop.confirmed ?? company.confirmed) ? 'direct' : 'inferred'}>
                  {LINK_TYPE_LABEL[hop.edge]}
                </span>
                <span className="fg-rpath__node">{hop.node}</span>
              </Fragment>
            ))}
          </div>
          <div className="fg-esheet__facts">
            <span>
              관계 유형 <b>{LINK_TYPE_LABEL[company.type]}</b> · {company.hops.length}단계
            </span>
            <span className="fg-strength fg-esheet__str">
              근거 강도
              <StrengthBars strength={company.strength} />
              <b>{STRENGTH_LABEL[company.strength]}</b>
            </span>
          </div>
          <EvidenceBody view={view} />
          <div className="fg-esheet__target fg-num">
            <div className="fg-esheet__trow">
              <span className="fg-esheet__who">
                <CompanyLogo name={company.name} />
                <b>{company.name}</b>
                <span>{marketLabel(company.market)}</span>
              </span>
              {hasQuote(company) && (
                <span className="fg-esheet__px">
                  <b>{company.price !== null ? formatPriceWon(company.price) : '—'}</b>
                  {company.change !== null && <ChangeText value={company.change} />}
                </span>
              )}
            </div>
            {hasQuote(company) && (
              <span className="fg-esheet__gap">
                {company.newHigh ? (
                  <Week52GapText company={company} />
                ) : (
                  <span>
                    52주 최고 대비 <b>{company.gapFromHigh === null ? '—' : formatGapPct(company.gapFromHigh)}</b>
                  </span>
                )}
                {company.position !== null && <GapBar position={company.position} />}
              </span>
            )}
            {company.code !== null ? (
              <div className="fg-esheet__acts">
                <ButtonLink to={stockPath(company.code)} state={fromState(`${pathname}${search}`)}>
                  종목 보기
                </ButtonLink>
                {watched !== null && (
                  <Button aria-pressed={watched} onClick={onToggleWatch}>
                    {watched ? '관심 종목' : '관심 추가'}
                  </Button>
                )}
              </div>
            ) : (
              watched !== null && (
                <div className="fg-esheet__acts">
                  <Button disabled>종목 보기</Button>
                  <Button aria-pressed={watched} onClick={onToggleWatch}>
                    {watched ? '관심 종목' : '관심 추가'}
                  </Button>
                </div>
              )
            )}
          </div>
          <Disclaimer className="fg-snote" />
        </>
      )}
    </SideSheet>
  )
}
