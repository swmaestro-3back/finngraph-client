import { ExternalLink } from 'lucide-react'
import { Fragment, type ReactNode, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { GapBar, StrengthBars } from '@/components/fg/HiddenLinkList'
import { ChangeText } from '@/components/fg/PriceChange'
import { SideSheet } from '@/components/fg/SideSheet'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import { STRENGTH_LABEL } from '@/lib/fg/stockDetail'
import { evidenceCountLabel, LINK_TYPE_LABEL, type LinkedCompany } from '@/lib/fg/stockLinks'
import { fromState } from '@/lib/navigation'

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

interface EvidenceSheetProps {
  stockName: string
  lead?: string | null
  company: LinkedCompany | null
  watched: boolean
  onToggleWatch: () => void
  returnFocusRef: RefObject<HTMLElement | null>
  onClose: () => void
}

export function EvidenceSheet({ stockName, lead = null, company, watched, onToggleWatch, returnFocusRef, onClose }: EvidenceSheetProps) {
  const { pathname, search } = useLocation()
  const kind = company?.confirmed ? 'direct' : 'inferred'
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
      {company && (
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
                <span className="fg-rpath__edge" data-kind={kind}>
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
          <div className="fg-esheet__quotes">
            <span className="fg-esheet__label">근거 문장 · 원문 그대로 인용했어요</span>
            {company.evidence.map((evidence, i) => (
              <figure key={`${evidence.source}-${i}`} className="fg-ev">
                <blockquote className="fg-quote">{`“${evidence.quote}”`}</blockquote>
                <figcaption className="fg-ev__src">
                  {evidence.kind === 'disclosure' && <Badge>공시</Badge>}
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
          </div>
          <div className="fg-esheet__target fg-num">
            <div className="fg-esheet__trow">
              <span className="fg-esheet__who">
                <CompanyLogo name={company.name} />
                <b>{company.name}</b>
                <span>{marketLabel(company.market)}</span>
              </span>
              <span className="fg-esheet__px">
                <b>{formatPriceWon(company.price)}</b>
                <ChangeText value={company.change} />
              </span>
            </div>
            <span className="fg-esheet__gap">
              <span>
                52주 최고 대비 <b>{formatGapPct(company.gapFromHigh)}</b>
              </span>
              <GapBar position={company.position} />
            </span>
            <div className="fg-esheet__acts">
              {company.code ? (
                <ButtonLink to={stockPath(company.code)} state={fromState(`${pathname}${search}`)}>
                  종목 보기
                </ButtonLink>
              ) : (
                <Button disabled>종목 보기</Button>
              )}
              <Button aria-pressed={watched} onClick={onToggleWatch}>
                {watched ? '관심 종목' : '관심 추가'}
              </Button>
            </div>
          </div>
          <Disclaimer className="fg-snote" />
        </>
      )}
    </SideSheet>
  )
}
