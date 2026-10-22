// Lucian UX/UI Prompt #008 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#008
import { useEffect, useRef, useState, type RefObject } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { SideSheet } from '@/components/fg/SideSheet'
import { formatChange } from '@/lib/format'
import { formatPriceWon, toneClass } from '@/lib/fg/format'
import { issuePath } from '@/lib/fg/paths'
import { issueBadge, reportedLabel, shortDate, tradingDayLabel, type PlacedIssue } from '@/lib/fg/stockIssues'

const SHEET_NOTE = '요약은 묶인 기사로 만든 참고 자료이며 투자 권유가 아니에요.'
const COPIED_MS = 1800
const FAILED_MS = 500

interface IssuePreviewSheetProps {
  stockName: string
  issue: PlacedIssue | null
  steps: readonly PlacedIssue[]
  refYear: number
  sharePath: string
  returnFocusRef: RefObject<HTMLElement | null>
  onPick: (key: string) => void
  onClose: () => void
}

export function IssuePreviewSheet({
  stockName,
  issue,
  steps,
  refYear,
  sharePath,
  returnFocusRef,
  onPick,
  onClose,
}: IssuePreviewSheetProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copyTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const flash = (next: 'copied' | 'failed', ms: number) => {
    window.clearTimeout(copyTimer.current)
    setCopyState(next)
    copyTimer.current = window.setTimeout(() => setCopyState('idle'), ms)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`)
      flash('copied', COPIED_MS)
      toast.success('링크를 복사했어요', { description: sharePath })
    } catch {
      flash('failed', FAILED_MS)
      toast.error('링크를 복사하지 못했어요')
    }
  }
  return (
    <SideSheet
      open={issue !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      closeLabel="이슈 미리보기 닫기"
      returnFocusRef={returnFocusRef}
      title={issue?.title ?? ''}
      meta={
        issue && (
          <span className="fg-isheet__kicker">
            <Badge tone={issue.total > 1 ? 'issue' : 'neutral'}>{issueBadge(issue)}</Badge>
            <span>{`${issue.media}개 매체 보도 · 기사 ${issue.articles}건`}</span>
          </span>
        )
      }
    >
      {issue && (
        <>
          <span className="fg-isheet__when">{reportedLabel(issue, refYear)}</span>
          {issue.summary && (
            <div className="fg-isheet__sum">
              <Badge strong>요약</Badge>
              <p>{issue.summary}</p>
            </div>
          )}
          {issue.change !== null && (
            <div className="fg-isheet__day fg-num">
              <span>{`${tradingDayLabel(issue)} ${stockName}`}</span>
              <b className={toneClass(issue.change)}>{formatChange(issue.change)}</b>
              <small>{`종가 ${formatPriceWon(issue.close)}`}</small>
            </div>
          )}
          {steps.length > 1 && (
            <div className="fg-isheet__sec">
              <span className="fg-isheet__label">{`이 흐름에서 이 종목이 나온 이슈 ${steps.length}개`}</span>
              <ol className="fg-isheet__steps">
                {steps.map((step) => {
                  const now = step.key === issue.key
                  return (
                    <li key={step.key} data-now={now ? 'true' : undefined}>
                      <button type="button" aria-current={now ? 'step' : undefined} onClick={() => onPick(step.key)}>
                        <span className="fg-isheet__date fg-num">{shortDate(step.date)}</span>
                        <span>{step.title}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
          {issue.with.length > 0 && (
            <div className="fg-isheet__sec">
              <span className="fg-isheet__label">함께 나온 종목</span>
              <span className="fg-isheet__with">
                {issue.with.map((name) => (
                  <span key={name} className="fg-lg">
                    <CompanyLogo name={name} size={24} />
                    <span>{name}</span>
                  </span>
                ))}
                {issue.more > 0 && <span className="fg-isheet__more">{`외 ${issue.more}`}</span>}
              </span>
            </div>
          )}
          <div className="fg-isheet__acts">
            <ButtonLink to={issuePath(issue.key)} variant="primary">
              이슈 페이지에서 보기
            </ButtonLink>
            <Button className="fg-copylink" data-state={copyState} onClick={copy}>
              <span className="fg-copylink__ic" aria-hidden="true">
                <svg className="fg-copylink__cp" viewBox="0 0 24 24">
                  <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
                  <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
                </svg>
                <svg className="fg-copylink__ok" viewBox="0 0 24 24">
                  <path d="M5.5 12.5l4.2 4.2L18.5 8" />
                </svg>
              </span>
              링크 복사
            </Button>
          </div>
          <Disclaimer text={SHEET_NOTE} className="fg-isheet__note" />
        </>
      )}
    </SideSheet>
  )
}
